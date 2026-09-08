'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Brain,
  Loader2,
  Route,
  Target,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { CapabilityRadar } from '@/components/career/capability-radar';
import { JobRecommendList } from '@/components/career/job-recommend-list';
import { JobSelect } from '@/components/career/job-select';
import { LearningPathCard } from '@/components/career/learning-path-card';
import { ResumeUploadCard } from '@/components/career/resume-upload-card';
import { SkillGapList } from '@/components/career/skill-gap-list';
import { useI18n } from '@/lib/hooks/use-i18n';
import { cn } from '@/lib/utils';
import {
  DIMENSION_LABELS,
  buildRadarAxes,
  checkHealth,
  confirmResume,
  getLearningPath,
  listJobs,
  recommendRoles,
  conclusionKey,
  runManualMatch,
  workStyleAverage,
} from '@/lib/career/service';
import {
  DEFAULT_WORK_STYLE,
  WORK_STYLE_ITEMS,
  type JobSummary,
  type LearningPath,
  type MatchResult,
  type RecommendationItem,
  type ResumeRecord,
  type WorkStyleAssessment,
} from '@/lib/career/types';

// 学历取值必须与职能洞察简历解析器的中文输出保持一致，后端按中文比对学历等级，
// 因此这里不做国际化改写。
const EDUCATION_OPTIONS = ['大专', '本科', '硕士', '博士'];

export default function CareerPage() {
  const { t } = useI18n();

  // --- 服务可用性 ---
  const [serviceDown, setServiceDown] = useState(false);
  const [checking, setChecking] = useState(true);

  // --- 岗位 ---
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [roleId, setRoleId] = useState('');

  // --- 我的画像 ---
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [education, setEducation] = useState('');
  const [experienceYears, setExperienceYears] = useState<number | null>(null);
  const [certificateInput, setCertificateInput] = useState('');
  const [certificates, setCertificates] = useState<string[]>([]);
  const [workStyle, setWorkStyle] = useState<WorkStyleAssessment>(DEFAULT_WORK_STYLE);

  // --- 简历 ---
  const [resume, setResume] = useState<ResumeRecord | null>(null);
  const [resumeConfirmed, setResumeConfirmed] = useState(false);
  const [useMyResume, setUseMyResume] = useState(false);

  // --- 结果 ---
  const [result, setResult] = useState<MatchResult | null>(null);
  const [path, setPath] = useState<LearningPath | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);

  // --- 状态 ---
  const [loading, setLoading] = useState(false);
  const [pathLoading, setPathLoading] = useState(false);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [error, setError] = useState('');

  const matchSequence = useRef(0);

  const workStyleScore = useMemo(() => workStyleAverage(workStyle), [workStyle]);
  const radarAxes = useMemo(
    () => (result ? buildRadarAxes(result, { workStyle, experienceYears }) : []),
    [result, workStyle, experienceYears],
  );

  // -------------------------------------------------------------------------
  // 初始化：健康探测 + 岗位列表
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [health, jobPage] = await Promise.all([
          checkHealth().catch(() => null),
          listJobs({ pageSize: 100 }).catch(() => null),
        ]);
        if (cancelled) return;
        if (!health || health.status !== 'healthy') {
          setServiceDown(true);
          return;
        }
        const items = jobPage?.items ?? [];
        setJobs(items);
        setJobsTotal(jobPage?.total ?? items.length);
        if (items.length) {
          setRoleId(items[0].id);
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // -------------------------------------------------------------------------
  // 匹配
  // -------------------------------------------------------------------------
  const matchPayload = useCallback(
    () => ({
      targetRoleId: roleId,
      skills,
      education,
      experienceYears,
      certificates,
      // 只有确认过的简历才带 resumeId，否则走免登录的手动链路
      resumeId: useMyResume && resume && resumeConfirmed ? resume.resumeId : '',
      workStyleScore,
    }),
    [roleId, skills, education, experienceYears, certificates, useMyResume, resume, resumeConfirmed, workStyleScore],
  );

  const loadLearningPath = useCallback(async (reportId: string) => {
    setPathLoading(true);
    try {
      setPath(await getLearningPath(reportId));
    } catch {
      // 学习路径失败不影响匹配结果展示
      setPath(null);
    } finally {
      setPathLoading(false);
    }
  }, []);

  const runMatch = useCallback(async () => {
    if (!roleId) {
      setError(t('career.errorSelectRole'));
      return;
    }
    if (!skills.length) {
      setError(t('career.errorNeedSkill'));
      return;
    }
    if (useMyResume && resume && !resumeConfirmed) {
      setError(t('career.hintConfirmResume'));
      return;
    }

    const sequence = ++matchSequence.current;
    setLoading(true);
    setError('');
    try {
      const matched = await runManualMatch(matchPayload());
      if (sequence !== matchSequence.current) return;
      setResult(matched);
      void loadLearningPath(matched.reportId);
    } catch (reason) {
      if (sequence === matchSequence.current) {
        setError(reason instanceof Error ? reason.message : t('career.errorMatchFailed'));
      }
    } finally {
      if (sequence === matchSequence.current) setLoading(false);
    }
  }, [roleId, skills, useMyResume, resume, resumeConfirmed, matchPayload, loadLearningPath]);

  // 修改画像或切换岗位后，如果已有结果则自动重新匹配（80ms 防抖）
  const autoRematchDeps = [roleId, education, experienceYears, useMyResume, resumeConfirmed];
  const autoRematchRef = useRef(autoRematchDeps);
  useEffect(() => {
    const changed = autoRematchDeps.some((value, index) => value !== autoRematchRef.current[index]);
    autoRematchRef.current = autoRematchDeps;
    if (!changed || !result || !roleId || !skills.length) return;
    if (useMyResume && resume && !resumeConfirmed) return;
    const timer = setTimeout(() => void runMatch(), 80);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, autoRematchDeps);

  // -------------------------------------------------------------------------
  // 交互
  // -------------------------------------------------------------------------
  const addSkill = () => {
    const value = skillInput.trim();
    if (value && !skills.includes(value)) setSkills([...skills, value]);
    setSkillInput('');
  };

  const addCertificate = () => {
    const value = certificateInput.trim();
    if (value && !certificates.includes(value)) setCertificates([...certificates, value]);
    setCertificateInput('');
  };

  const handleJobSearch = useCallback(async (keyword: string) => {
    const page = await listJobs({ keyword, pageSize: 20 });
    setJobs((prev) => {
      const merged = new Map(prev.map((job) => [job.id, job]));
      page.items.forEach((job) => merged.set(job.id, job));
      return [...merged.values()];
    });
    return page.items;
  }, []);

  const handleRecommend = async () => {
    if (!skills.length) {
      setError('请先添加至少一项已掌握技能');
      return;
    }
    setRecommendLoading(true);
    setError('');
    try {
      const result2 = await recommendRoles(skills, 8);
      setRecommendations(result2.items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('career.errorRecommendFailed'));
    } finally {
      setRecommendLoading(false);
    }
  };

  const selectRecommendation = (item: RecommendationItem) => {
    if (!jobs.some((job) => job.id === item.roleId)) {
      setJobs((prev) => [
        ...prev,
        {
          id: item.roleId,
          name: item.roleName,
          field: '',
          postingCount: 0,
          sourceCount: 0,
          firstSeen: '',
          lastSeen: '',
          skills: [],
        },
      ]);
    }
    setRoleId(item.roleId);
    setRecommendations([]);
  };

  const handleResumeParsed = (record: ResumeRecord, fileName: string) => {
    const next: ResumeRecord = { ...record, fileName: record.fileName || fileName };
    setResume(next);
    setResumeConfirmed(Boolean(next.confirmed));
    setUseMyResume(true);
    setSkills(next.skills.map((skill) => skill.skill_name));
    setEducation(next.education || '');
    setExperienceYears(next.experienceYears ?? null);
    setCertificates(next.certificates ?? []);
  };

  const handleConfirmResume = async () => {
    if (!resume) return;
    setLoading(true);
    setError('');
    try {
      await confirmResume(resume.resumeId, {
        skills,
        education,
        experienceYears,
        certificates,
      });
      setResumeConfirmed(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('career.errorConfirmFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleClearResume = () => {
    setResume(null);
    setResumeConfirmed(false);
    setUseMyResume(false);
  };

  // -------------------------------------------------------------------------
  // 渲染：降级页
  // -------------------------------------------------------------------------
  if (serviceDown) {
    return (
      <div className="container flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-3 py-16 text-center">
        <AlertCircle className="size-10 text-muted-foreground" />
        <h1 className="text-lg font-semibold">{t('career.serviceDownTitle')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('career.serviceDownHint')}
          <br />
          {t('career.serviceDownNote')}
        </p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          {t('career.reload')}
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl space-y-4 py-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Target className="size-5 text-primary" />
          {t('career.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('career.subtitle')}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* ---------------------------------------------------------------- */}
        {/* 左栏：目标岗位 + 我的画像                                          */}
        {/* ---------------------------------------------------------------- */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('career.targetRole')}</CardTitle>
              <CardDescription className="text-xs">
                {t('career.targetRoleHint', { count: jobsTotal })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <JobSelect
                jobs={jobs}
                value={roleId}
                onChange={(id) => setRoleId(id)}
                onSearch={handleJobSearch}
                disabled={checking}
              />
              <Button
                className="w-full"
                size="sm"
                disabled={loading || checking || !roleId || !skills.length}
                onClick={() => void runMatch()}
              >
                {loading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Target className="size-3.5" />
                )}
                {loading ? t('career.running') : t('career.run')}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('career.profile')}</CardTitle>
              <CardDescription className="text-xs">
                {t('career.profileHint')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ResumeUploadCard
                resume={resume}
                resumeConfirmed={resumeConfirmed}
                useMyResume={useMyResume}
                onToggleUse={setUseMyResume}
                onParsed={handleResumeParsed}
                onConfirm={() => void handleConfirmResume()}
                onCleared={handleClearResume}
                busy={loading}
                error=""
              />

              <div className="space-y-1.5">
                <Label className="text-xs">{t('career.skills')}</Label>
                <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input px-2 py-1.5">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs"
                    >
                      {skill}
                      <button
                        type="button"
                        aria-label={`删除技能 ${skill}`}
                        onClick={() => setSkills(skills.filter((item) => item !== skill))}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    value={skillInput}
                    onChange={(event) => setSkillInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addSkill();
                      }
                    }}
                    placeholder={skills.length ? '' : t('career.skillPlaceholder')}
                    className="min-w-24 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('career.education')}</Label>
                  <select
                    value={education}
                    onChange={(event) => setEducation(event.target.value)}
                    className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs"
                  >
                    <option value="">{t('career.educationNone')}</option>
                    {EDUCATION_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('career.experience')}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={40}
                    value={experienceYears ?? ''}
                    onChange={(event) =>
                      setExperienceYears(
                        event.target.value === '' ? null : Number(event.target.value),
                      )
                    }
                    placeholder={t('career.experiencePlaceholder')}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">{t('career.certificates')}</Label>
                <div className="flex min-h-8 flex-wrap items-center gap-1.5 rounded-md border border-input px-2 py-1">
                  {certificates.map((item) => (
                    <span
                      key={item}
                      className="flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs"
                    >
                      {item}
                      <button
                        type="button"
                        aria-label={`删除证书 ${item}`}
                        onClick={() => setCertificates(certificates.filter((c) => c !== item))}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    value={certificateInput}
                    onChange={(event) => setCertificateInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addCertificate();
                      }
                    }}
                    placeholder={certificates.length ? '' : t('career.certificatePlaceholder')}
                    className="min-w-20 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {/* 工作方式自评：仅用于雷达图「综合素养」维 */}
              <div className="space-y-2 rounded-lg border border-border/60 bg-card/50 p-2.5">
                <div className="flex items-center gap-1.5">
                  <Brain className="size-3.5 text-primary" />
                  <strong className="text-xs">{t('career.workStyle')}</strong>
                  <span className="ml-auto text-xs font-semibold tabular-nums text-primary">
                    {workStyleScore}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t('career.workStyleHint')}
                </p>
                <div className="space-y-2">
                  {WORK_STYLE_ITEMS.map((item) => (
                    <div key={item.key} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span>{t(`career.workStyleItems.${item.key}`)}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {workStyle[item.key]}
                        </span>
                      </div>
                      <Slider
                        value={[workStyle[item.key]]}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={(value) =>
                          setWorkStyle((prev) => ({ ...prev, [item.key]: value[0] }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={recommendLoading || !skills.length}
                onClick={() => void handleRecommend()}
              >
                {recommendLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Target className="size-3.5" />
                )}
                {t('career.recommend')}
              </Button>

              {recommendations.length > 0 && (
                <JobRecommendList
                  items={recommendations}
                  activeRoleId={roleId}
                  onSelect={selectRecommendation}
                />
              )}

              {error && <p className="text-xs text-destructive">{error}</p>}
            </CardContent>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* 右栏：匹配结果                                                     */}
        {/* ---------------------------------------------------------------- */}
        <div className="space-y-4">
          {!result ? (
            <Card className="flex min-h-[420px] flex-col items-center justify-center gap-2 text-center">
              <CardContent className="space-y-1.5 py-12">
                <Target className="mx-auto size-8 text-muted-foreground" />
                <h2 className="text-sm font-medium">{t('career.resultEmptyTitle')}</h2>
                <p className="text-xs text-muted-foreground">
                  {t('career.resultEmptyHint')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* 总分 */}
              <Card>
                <CardContent className="flex flex-wrap items-center gap-4 pt-6">
                  <div className="flex size-20 shrink-0 flex-col items-center justify-center rounded-full border-4 border-primary/20">
                    <strong className="text-2xl font-bold tabular-nums text-primary">
                      {result.score}
                    </strong>
                    <span className="text-[10px] text-muted-foreground">{t('career.overallScore')}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-semibold">{result.roleName}</h2>
                    <p className="text-xs text-muted-foreground">
                      {t('career.scoreSummary', {
                        score: result.skillScore,
                        matched: result.gaps.filter((gap) => gap.status === 'matched').length,
                        missing: result.gaps.filter((gap) => gap.status !== 'matched').length,
                      })}
                    </p>
                    <p className="mt-1 text-xs text-primary">{t(conclusionKey(result.score))}</p>
                  </div>
                </CardContent>
              </Card>

              {/* 维度明细 */}
              {result.dimensions.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {result.dimensions.map((dimension) => (
                    <div
                      key={dimension.name}
                      className="rounded-lg border border-border/60 bg-card/50 p-2.5"
                    >
                      <p className="text-[11px] text-muted-foreground">
                        {t(`career.dimension.${dimension.name}`, {
                          defaultValue: DIMENSION_LABELS[dimension.name] ?? dimension.name,
                        })}
                      </p>
                      <p className="text-lg font-semibold tabular-nums">{dimension.score}%</p>
                      <p className="text-[10px] text-muted-foreground">
                        {t('career.weight', { weight: dimension.weight })}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* 雷达图 + 技能差距 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t('career.radarTitle')}</CardTitle>
                  <CardDescription className="text-xs">
                    {t('career.radarHint')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-2">
                  <CapabilityRadar axes={radarAxes} />
                  <SkillGapList gaps={result.gaps} />
                </CardContent>
              </Card>

              {/* 学习路径 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-1.5 text-sm">
                    <Route className="size-3.5 text-primary" />
                    {t('career.learningPath')}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t('career.learningPathHint')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pathLoading ? (
                    <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" />
                      {t('career.learningPathLoading')}
                    </div>
                  ) : path && path.stages.length > 0 ? (
                    <LearningPathCard stages={path.stages} />
                  ) : (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      {t('career.learningPathEmpty')}
                    </p>
                  )}
                </CardContent>
              </Card>

              {result.notice && (
                <p className={cn('px-1 text-[11px] text-muted-foreground')}>{result.notice}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

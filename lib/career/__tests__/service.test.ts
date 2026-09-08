import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildRadarAxes,
  conclusionKey,
  waitForParse,
  workStyleAverage,
} from '@/lib/career/service';
import {
  DEFAULT_WORK_STYLE,
  type MatchResult,
  type ParseTask,
  type WorkStyleAssessment,
} from '@/lib/career/types';

function makeResult(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    reportId: 'match_1',
    roleId: 'role_1',
    roleName: '运维工程师',
    score: 42.5,
    skillScore: 30,
    breadthScore: 16.7,
    dimensions: [
      { name: 'skills', weight: 73.7, score: 30 },
      { name: 'education', weight: 10.5, score: 100 },
      { name: 'experience', weight: 15.8, score: 60 },
    ],
    gaps: [
      { skillId: 's1', skill: 'Python', status: 'matched', level: 'advanced', importance: 40 },
      { skillId: 's2', skill: 'Linux', status: 'missing', level: 'advanced', importance: 55.6 },
    ],
    notice: '',
    radarTargets: {
      skills: 69.9,
      experience: 69.4,
      education: 66.3,
      breadth: 86,
      workStyle: 82.9,
    },
    educationProfile: {
      provided: '本科',
      providedRank: 4,
      required: '本科',
      requiredRank: 4,
      current: 66.7,
      target: 66.7,
      matchScore: 100,
      evidenceCount: 1113,
    },
    experienceProfile: { providedYears: 3, requiredYears: 5, current: 37.5, target: 69.4 },
    ...overrides,
  };
}

describe('workStyleAverage', () => {
  it('取四维自评的均分', () => {
    expect(workStyleAverage(DEFAULT_WORK_STYLE)).toBe(60);
    const custom: WorkStyleAssessment = {
      collaboration: 100,
      adaptability: 50,
      resilience: 40,
      initiative: 30,
    };
    expect(workStyleAverage(custom)).toBe(55);
  });
});

describe('buildRadarAxes', () => {
  it('返回五维，且岗位基准取自 radarTargets', () => {
    const axes = buildRadarAxes(makeResult(), {
      workStyle: DEFAULT_WORK_STYLE,
      experienceYears: 3,
    });
    expect(axes.map((axis) => axis.name)).toEqual([
      '技能',
      '经验',
      '学历',
      '能力广度',
      '综合素养',
    ]);
    expect(axes[0].target).toBe(69.9);
    expect(axes[0].current).toBe(30);
    expect(axes[3].current).toBe(17); // breadthScore 16.7 四舍五入
    expect(axes[4].current).toBe(60); // 自评均分
  });

  it('经验按 8 年饱和计算，且上限为 100', () => {
    const axes = buildRadarAxes(makeResult(), {
      workStyle: DEFAULT_WORK_STYLE,
      experienceYears: 4,
    });
    expect(axes[1].current).toBe(50); // 4 / 8

    const capped = buildRadarAxes(makeResult(), {
      workStyle: DEFAULT_WORK_STYLE,
      experienceYears: 20,
    });
    expect(capped[1].current).toBe(100);
  });

  it('未传经验年限时回落到 experienceProfile.current', () => {
    const axes = buildRadarAxes(makeResult(), { workStyle: DEFAULT_WORK_STYLE });
    expect(axes[1].current).toBe(38); // 37.5 四舍五入
  });

  it('缺少 radarTargets 时用岗位要求重要度兜底', () => {
    const result = makeResult({ radarTargets: undefined });
    const axes = buildRadarAxes(result, { workStyle: DEFAULT_WORK_STYLE });
    expect(axes[0].target).toBe(55.6);
  });

  it('所有取值都限制在 0-100', () => {
    const result = makeResult({
      radarTargets: { skills: 180, experience: -20 },
    });
    const axes = buildRadarAxes(result, { workStyle: DEFAULT_WORK_STYLE });
    expect(axes[0].target).toBe(100);
    expect(axes[1].target).toBe(0);
  });
});

describe('conclusionKey', () => {
  it.each([
    [90, 'career.conclusion.high'],
    [80, 'career.conclusion.high'],
    [65, 'career.conclusion.good'],
    [45, 'career.conclusion.basic'],
    [25, 'career.conclusion.low'],
    [5, 'career.conclusion.lowest'],
  ])('score=%i → %s', (score, expected) => {
    expect(conclusionKey(score)).toBe(expected);
  });
});

describe('waitForParse', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function stubTaskQueue(tasks: ParseTask[]) {
    let index = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ success: true, data: tasks[index++] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      ),
    );
  }

  const completed: ParseTask = {
    id: 'task_1',
    status: 'completed',
    progress: 100,
    result: {
      resumeId: 'resume_1',
      skills: [],
      education: '本科',
      experienceYears: 3,
      certificates: [],
      warnings: [],
    },
  };

  it('轮询直到 completed 并返回简历记录', async () => {
    stubTaskQueue([
      { id: 'task_1', status: 'pending', progress: 0 },
      { id: 'task_1', status: 'running', progress: 40 },
      completed,
    ]);

    const record = await waitForParse('task_1', { intervalMs: 0 });
    expect(record.resumeId).toBe('resume_1');
  });

  it('failed 时抛出后端返回的错误', async () => {
    stubTaskQueue([{ id: 'task_1', status: 'failed', progress: 100, error: '解析失败' }]);
    await expect(waitForParse('task_1', { intervalMs: 0 })).rejects.toThrow('解析失败');
  });

  it('超时后抛出超时错误', async () => {
    stubTaskQueue([{ id: 'task_1', status: 'running', progress: 10 }]);
    await expect(
      waitForParse('task_1', { intervalMs: 0, timeoutMs: 0 }),
    ).rejects.toThrow('简历解析超时');
  });

  it('通过 onProgress 回传每一次进度', async () => {
    stubTaskQueue([
      { id: 'task_1', status: 'running', progress: 20 },
      completed,
    ]);
    const seen: number[] = [];
    await waitForParse('task_1', { intervalMs: 0, onProgress: (task) => seen.push(task.progress) });
    expect(seen).toEqual([20, 100]);
  });
});

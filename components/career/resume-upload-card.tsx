'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useI18n } from '@/lib/hooks/use-i18n';
import { cn } from '@/lib/utils';
import {
  deleteResume,
  listMyResumes,
  uploadResume,
  waitForParse,
} from '@/lib/career/service';
import type { ResumeRecord } from '@/lib/career/types';

interface ResumeUploadCardProps {
  /** 当前选用的简历 */
  resume: ResumeRecord | null;
  resumeConfirmed: boolean;
  /** 是否使用简历参与匹配 */
  useMyResume: boolean;
  onToggleUse: (value: boolean) => void;
  onParsed: (record: ResumeRecord, fileName: string) => void;
  onConfirm: () => void;
  onCleared: () => void;
  busy: boolean;
  error: string;
}

/** 简历上传卡片：上传 → 解析进度轮询 → 解析结果确认 → 历史简历管理 */
export function ResumeUploadCard({
  resume,
  resumeConfirmed,
  useMyResume,
  onToggleUse,
  onParsed,
  onConfirm,
  onCleared,
  busy,
  error,
}: ResumeUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();
  const [progress, setProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [history, setHistory] = useState<ResumeRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const result = await listMyResumes(20);
      setHistory(result.items);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const handleUpload = async (file: File) => {
    setLocalError('');
    setUploading(true);
    setProgress(0);
    try {
      const task = await uploadResume(file);
      const record = await waitForParse(task.taskId, {
        intervalMs: 1500,
        timeoutMs: 120_000,
        onProgress: (state) => setProgress(state.progress),
      });
      onParsed(record, file.name);
      void loadHistory();
    } catch (reason) {
      setLocalError(reason instanceof Error ? reason.message : t('career.errorResumeFailed'));
    } finally {
      setUploading(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async (resumeId: string) => {
    try {
      await deleteResume(resumeId);
      if (resume?.resumeId === resumeId) onCleared();
      void loadHistory();
    } catch (reason) {
      setLocalError(reason instanceof Error ? reason.message : t('career.errorDeleteFailed'));
    }
  };

  const message = localError || error;

  return (
    <div className="space-y-3">
      {/* 当前选用的简历 */}
      {resume && (
        <button
          type="button"
          onClick={() => onToggleUse(!useMyResume)}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg border p-2.5 text-left transition-colors',
            useMyResume ? 'border-primary/60 bg-primary/5' : 'border-border/60 bg-card/50 hover:bg-accent',
          )}
        >
          <FileText className="size-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium">
              {resume.fileName || t('career.resumeFallbackName')}
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {t('career.skillCount', { count: resume.skills.length })} · {resumeConfirmed ? t('career.resumeConfirmed') : t('career.resumePending')}
            </span>
          </span>
          <span className="shrink-0 text-[11px] text-primary">
            {useMyResume ? t('career.selected') : t('career.selectThis')}
          </span>
        </button>
      )}

      {/* 上传区 */}
      <label
        className={cn(
          'flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed px-3 py-4 text-center transition-colors hover:border-primary/60 hover:bg-accent/40',
          uploading && 'pointer-events-none opacity-60',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          className="hidden"
          disabled={uploading || busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleUpload(file);
          }}
        />
        {uploading ? (
          <Loader2 className="size-5 animate-spin text-primary" />
        ) : (
          <Upload className="size-5 text-muted-foreground" />
        )}
        <strong className="text-xs font-medium">
          {uploading ? t('career.uploading') : resume ? t('career.reupload') : t('career.upload')}
        </strong>
        <span className="text-[11px] text-muted-foreground">{t('career.maxSize')}</span>
      </label>

      {progress !== null && (
        <div className="space-y-1">
          <Progress value={progress} />
          <p className="text-[11px] text-muted-foreground">{t('career.parseProgress', { progress })}</p>
        </div>
      )}

      {resume?.warnings && resume.warnings.length > 0 && (
        <p className="rounded-md bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
          {resume.warnings.join(' ')}
        </p>
      )}

      {/* 历史简历 */}
      {history.length > 0 && (
        <div className="rounded-lg border border-border/60 bg-card/50 p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <h4 className="text-xs font-medium">{t('career.history')}</h4>
            {historyLoading && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
          </div>
          <ul className="max-h-32 space-y-1 overflow-y-auto">
            {history.map((item) => (
              <li key={item.resumeId} className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onParsed(item, item.fileName || t('career.resumeFallbackName'))}
                  className={cn(
                    'min-w-0 flex-1 truncate rounded px-1.5 py-1 text-left text-[11px] hover:bg-accent',
                    item.resumeId === resume?.resumeId && 'text-primary',
                  )}
                  title={item.fileName || t('career.resumeFallbackName')}
                >
                  {item.fileName || t('career.resumeFallbackName')}
                  <span className="ml-1 text-muted-foreground">
                    {item.confirmed ? t('career.resumeConfirmed') : t('career.resumePending')}
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t('career.deleteResume')}
                  onClick={() => void handleDelete(item.resumeId)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {resume && !resumeConfirmed && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          disabled={busy || uploading}
          onClick={onConfirm}
        >
          <Check className="size-3.5" />
          {t('career.confirmResume')}
        </Button>
      )}

      {message && (
        <p className="text-[11px] text-destructive">{message}</p>
      )}
    </div>
  );
}

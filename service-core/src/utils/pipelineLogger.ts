import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

type PipelineOutcome = 'classified' | 'rejected' | 'failed';

interface PipelineLogEntry {
  event: 'ai_pipeline_started' | 'ai_pipeline_completed';
  reportId: string;
  reportNumber?: number | null;
  userId?: string;
  imagePath?: string;
  outcome?: PipelineOutcome;
  status?: string;
  totalMs?: number;
  aiCallMs?: number;
  dbUpdateMs?: number;
  aiCategory?: string;
  aiPriority?: string;
  aiConfidence?: number;
  rejectReason?: string | null;
  errorMessage?: string;
}

const pipelineLogPath = process.env.AI_PIPELINE_LOG_PATH || 'logs/ai-pipeline.txt';
const resolvedLogPath = path.isAbsolute(pipelineLogPath)
  ? pipelineLogPath
  : path.resolve(process.cwd(), pipelineLogPath);

export async function writePipelineLog(entry: PipelineLogEntry): Promise<void> {
  if (process.env.NODE_ENV === 'test') return;

  const payload = {
    timestamp: new Date().toISOString(),
    service: 'service-core',
    ...entry,
  };
  const line = `${JSON.stringify(payload)}\n`;

  try {
    await mkdir(path.dirname(resolvedLogPath), { recursive: true });
    await appendFile(resolvedLogPath, line, 'utf8');
  } catch (err) {
    console.error('Failed to write AI pipeline log:', err);
  }
}

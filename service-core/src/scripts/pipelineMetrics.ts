import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

interface PipelineLogRecord {
  event?: string;
  outcome?: string;
  totalMs?: number;
  aiCallMs?: number;
  dbUpdateMs?: number;
}

interface StatSummary {
  count: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
  medianMs: number;
  p95Ms: number;
}

const pipelineLogPath = process.env.AI_PIPELINE_LOG_PATH || 'logs/ai-pipeline.txt';
const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const logPath = path.isAbsolute(pipelineLogPath)
  ? pipelineLogPath
  : path.resolve(serviceRoot, pipelineLogPath);

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function summarize(values: number[]): StatSummary {
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return {
    count: sorted.length,
    minMs: sorted[0] ?? 0,
    maxMs: sorted[sorted.length - 1] ?? 0,
    avgMs: sorted.length ? Math.round(total / sorted.length) : 0,
    medianMs: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
  };
}

function printSummary(label: string, values: number[]): void {
  const stats = summarize(values);
  console.log(`${label}:`);
  console.table([stats]);
}

async function main(): Promise<void> {
  const raw = await readFile(logPath, 'utf8').catch((err) => {
    console.error(`Could not read pipeline log at ${logPath}`);
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
    return '';
  });
  if (!raw) return;

  const records = raw
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line): PipelineLogRecord[] => {
      try {
        return [JSON.parse(line) as PipelineLogRecord];
      } catch {
        return [];
      }
    })
    .filter((record) => record.event === 'ai_pipeline_completed');

  const totalValues = records
    .map((record) => record.totalMs)
    .filter((value): value is number => typeof value === 'number');
  const aiValues = records
    .map((record) => record.aiCallMs)
    .filter((value): value is number => typeof value === 'number');
  const dbValues = records
    .map((record) => record.dbUpdateMs)
    .filter((value): value is number => typeof value === 'number');

  console.log(`AI pipeline log: ${logPath}`);
  console.log(`Completed pipeline records: ${records.length}`);
  printSummary('Total pipeline time', totalValues);
  printSummary('AI service call time', aiValues);
  printSummary('Database update time', dbValues);

  const outcomeCounts = records.reduce<Record<string, number>>((acc, record) => {
    const key = record.outcome ?? 'unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  console.log('Outcomes:');
  console.table(outcomeCounts);
}

main();

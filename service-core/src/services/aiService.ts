import { AI_SERVICE_URL } from '../config/env.js';

const DEPT_NORMALIZE: Record<string, string> = {
  'Fen Isleri':        'Fen İşleri',
  'Temizlik Isleri':   'Temizlik İşleri',
  'Cevre Koruma':      'Çevre Koruma',
  'Park ve Bahceler':  'Park ve Bahçeler',
  'Zabita':            'Zabıta',
};

function normalizeDept(value: string): string {
  return DEPT_NORMALIZE[value] ?? value;
}

export interface AiResult {
  category: string;
  priority: number;
  priorityLabel: string;
  confidence: number;
  department: string;
  description: string;
  rejected: boolean;
  rejectReason: string | null;
}

export async function analyzeImage(imagePath: string): Promise<AiResult> {
  // imagePath from multer: "uploads/abc.jpg"
  // AI service expects: "/uploads/abc.jpg"
  const filename = imagePath.replace(/^uploads\//, '');
  const aiImagePath = `/uploads/${filename}`;

  const res = await fetch(`${AI_SERVICE_URL}/classify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_path: aiImagePath }),
  });

  if (!res.ok) {
    throw new Error(`AI service error: ${res.status}`);
  }

  const data = await res.json() as {
    success: boolean;
    rejected: boolean;
    reject_reason?: string;
    category?: string;
    priority?: number;
    priority_label?: string;
    confidence?: number;
    department?: string;
    description?: string;
    needs_review?: boolean;
  };

  if (!data.success) {
    throw new Error('AI service returned success: false');
  }

  if (data.rejected) {
    return {
      category: 'irrelevant',
      priority: 0,
      priorityLabel: 'Irrelevant',
      confidence: 0,
      department: '-',
      description: '',
      rejected: true,
      rejectReason: data.reject_reason ?? null,
    };
  }

  return {
    category: data.category ?? 'unclassified',
    priority: data.priority ?? 0,
    priorityLabel: data.priority_label ?? 'Unknown',
    confidence: data.confidence ?? 0,
    department: normalizeDept(data.department ?? '-'),
    description: data.description ?? '',
    rejected: false,
    rejectReason: null,
  };
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/health`);
    const data = await res.json() as { status: string };
    return data.status === 'ok';
  } catch {
    return false;
  }
}

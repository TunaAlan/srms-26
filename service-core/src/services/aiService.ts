import { AI_SERVICE_URL } from '../config/env.js';

export interface AiResult {
  rejected: false;
  category: string;
  priority: number;
  priorityLabel: string;
  confidence: number;
  department: string;
  description: string;
  needsReview: boolean;
}

export interface AiRejected {
  rejected: true;
  rejectReason: string;
}

export async function analyzeImage(imagePath: string): Promise<AiResult | AiRejected> {
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
      rejected: true,
      rejectReason: data.reject_reason ?? 'Rejected by AI',
    };
  }

  return {
    rejected: false,
    category: data.category!,
    priority: data.priority!,
    priorityLabel: data.priority_label!,
    confidence: data.confidence!,
    department: data.department!,
    description: data.description!,
    needsReview: data.needs_review!,
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

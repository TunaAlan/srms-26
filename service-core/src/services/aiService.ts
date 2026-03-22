import fs from 'fs';
import path from 'path';

const GRADIO_BASE = 'http://193.111.77.183:7860';
const PREDICT_ENDPOINT = `${GRADIO_BASE}/gradio_api/call/predict_image`;

interface AiResult {
  category: string;
  priority: string;
  unit: string;
  confidence: number;
  description: string;
  top3: string;
  reviewFlag: boolean;
}

// Labels are in Turkish because that is what the Gradio API returns
function parseResult(raw: string): Pick<AiResult, 'category' | 'priority' | 'unit' | 'confidence'> {
  const get = (label: string) => {
    const match = raw.match(new RegExp(`${label}\\s*:\\s*(.+)`));
    return match ? match[1].trim() : '';
  };

  const confidenceStr = get('Güven').replace('%', '');
  const confidence = parseFloat(confidenceStr) || 0;

  return {
    category: get('Kategori'),
    priority: get('Öncelik'),
    unit: get('Birim'),
    confidence,
  };
}

export async function analyzeImage(imagePath: string): Promise<AiResult> {
  const imageBuffer = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).slice(1) || 'jpeg';
  const base64 = imageBuffer.toString('base64');
  const dataUrl = `data:image/${ext};base64,${base64}`;

  // Step 1: enqueue request, get event_id
  const initRes = await fetch(PREDICT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [{ url: dataUrl, meta: { _type: 'gradio.FileData' } }],
    }),
  });

  if (!initRes.ok) {
    throw new Error(`Gradio init failed: ${initRes.status}`);
  }

  const { event_id } = await initRes.json() as { event_id: string };

  // Step 2: read result from SSE stream
  const resultRes = await fetch(`${PREDICT_ENDPOINT}/${event_id}`);
  const text = await resultRes.text();

  // Find the "data: [...]" line in the SSE response
  const dataLine = text.split('\n').find(l => l.startsWith('data:') && l.includes('['));
  if (!dataLine) {
    throw new Error('Could not read Gradio result');
  }

  const [rawResult, geminiDescription, top3] = JSON.parse(dataLine.replace('data: ', '')) as string[];

  const parsed = parseResult(rawResult);

  return {
    ...parsed,
    description: geminiDescription.replace(/^Açıklama:\s*/i, '').trim(),
    top3,
    reviewFlag: parsed.confidence < 70,
  };
}

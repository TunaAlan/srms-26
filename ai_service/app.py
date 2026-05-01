"""
Environmental Issue Detection v0.9.1 -- DistilBERT ONNX + Gemini
Pipeline modulu: FastAPI main.py tarafindan import edilir.
  Fonksiyonlar: analyze_image_bytes, check_troll, classify
"""

from pathlib import Path
from google import genai
from google.genai import types
from google.genai.errors import ClientError
from transformers import AutoTokenizer
import onnxruntime as ort
import numpy as np
import json, re, time, os
from dotenv import load_dotenv

load_dotenv()

# ===========================================================
# AYARLAR
# ===========================================================
API_KEY    = os.getenv("GEMINI_API_KEY", "")
_HERE      = Path(__file__).parent
ONNX_PATH  = str(_HERE / "text_classifier_v0.9.1.onnx")
MODEL_NAME = "distilbert-base-uncased"
MAX_LEN    = 64

CLASSES = [
    "road_damage", "sidewalk_damage", "waste", "pollution",
    "green_space", "lighting", "traffic_sign", "sewage_water",
    "infrastructure", "vandalism", "stray_animal", "natural_disaster",
    "normal", "irrelevant"
]
NUM_PRIORITIES = 6

PRIORITY_LABELS = {
    0: "Irrelevant", 1: "Normal", 2: "Minor",
    3: "Moderate",   4: "High",   5: "Critical",
}

DEPARTMENT_MAP = {
    "road_damage":      "Fen Isleri",
    "sidewalk_damage":  "Fen Isleri",
    "waste":            "Temizlik Isleri",
    "pollution":        "Cevre Koruma",
    "green_space":      "Park ve Bahceler",
    "lighting":         "Elektrik Birimi",
    "traffic_sign":     "Trafik Birimi",
    "sewage_water":     "Su ve Kanalizasyon",
    "infrastructure":   "Fen Isleri",
    "vandalism":        "Zabita",
    "stray_animal":     "Veteriner Birimi",
    "natural_disaster": "Afet Koordinasyon",
    "normal":           "-",
    "irrelevant":       "-",
}

CONFIDENCE_THRESHOLD = 0.60
GEMINI_TEMPERATURE = 0.0

def get_default_prompt():
    return sorted(PROMPTS.keys())[-1] if PROMPTS else "v1"

PROMPTS = {}

PROMPTS["v1"] = """Analyze this image. Return ONLY this JSON, no markdown, no explanation:
{"description":"<max 15 words>","is_outdoor":<bool>,"is_real_photo":<bool>,"is_nsfw":<bool>}

Description format (STRICT): [problem noun] + [verb/state] + [location]
- Start with visible problem object: pothole/manhole/garbage/smoke/graffiti/tree/streetlight/sign/water/animal/crack/debris
- Then its visible state: cracking/blocking/overflowing/covering/leaning/missing/spreading/flooding
- Then location: near school/on highway/at intersection/along sidewalk/in park/on road
- No articles (a/an/the), no "there is/are", English only, max 15 words
- Describe ONLY what is physically visible, no abstract words
- If no problem: "clean road no damage visible near area"

Examples:
  pothole cracking asphalt lane near busy intersection
  overflowing garbage bins scattered along residential sidewalk
  fallen tree trunk blocking entire urban road near buildings
  broken streetlight leaning over pedestrian crossing near school
  stray dogs gathered near school gate entrance"""

PROMPTS["v2"] = """You are an urban infrastructure inspector. Analyze this image for
MUNICIPAL environmental/infrastructure problems visible in the SURROUNDINGS.

SCOPE: road damage, sidewalk damage, waste accumulation, air/water pollution AT SCALE,
damaged greenery, broken lighting/signs, sewage overflow, infrastructure decay,
vandalism on public property, stray animals, natural disaster damage.

OUT OF SCOPE: personal activities, individual people, handheld objects,
indoor scenes, food, vehicles in normal use, artistic/abstract content.

Return ONLY this JSON, no markdown, no explanation:
{"description":"<max 15 words>","is_outdoor":<bool>,"is_real_photo":<bool>,"is_nsfw":<bool>,"is_person_focused":<bool>,"has_environmental_issue":<bool>}

FIELD RULES:
- is_real_photo: true ONLY if this is a genuine photograph taken with a real camera. Set false for AI-generated images, drawings, illustrations, cartoons, CGI/3D renders, or screenshots of media content.
- is_outdoor: true if the scene is outdoors or in a public open space
- is_nsfw: true if the image contains explicit/inappropriate content
- is_person_focused: true if main subject is a person rather than the surroundings
- has_environmental_issue: true ONLY if a real municipal-scale problem exists in the scene
- description: describe the environmental problem using [problem] + [state] + [location]
- If no municipal problem exists: "clean area no environmental damage visible"

Format examples (structure only):
  pothole cracking asphalt lane near busy intersection
  overflowing garbage bins scattered along residential sidewalk
  broken streetlight leaning over pedestrian crossing"""

# ----------------------------------------------------------
# Filter prompt: sadece boolean alanlar, aciklama yok
# Pipeline'da ilk adimda kullanilir
# ----------------------------------------------------------
FILTER_PROMPT = """Analyze this image for safety filtering. Return ONLY this JSON, no markdown, no explanation:
{"is_outdoor":<bool>,"is_real_photo":<bool>,"is_nsfw":<bool>,"is_person_focused":<bool>,"has_environmental_issue":<bool>}

FIELD RULES:
- is_real_photo: true ONLY if genuine photograph taken with a real camera. false for AI-generated, drawings, cartoons, CGI, screenshots.
- is_outdoor: true if scene is outdoors or in a public open space
- is_nsfw: true if explicit/inappropriate content
- is_person_focused: true if main subject is a person (selfie, portrait, personal activity) rather than the surroundings
- has_environmental_issue: true ONLY if a real municipal-scale infrastructure or environmental problem is visible in the surroundings"""

# Description-only prompts (pipeline 2. adiminda kullanilir, filter gecildikten sonra)
DESC_PROMPTS = {}

DESC_PROMPTS["v1"] = """Describe the environmental/infrastructure problem visible in this image.
Return ONLY this JSON, no markdown, no explanation:
{"description":"<max 15 words>"}

Description format (STRICT): [problem noun] + [verb/state] + [location]
- Start with visible problem object: pothole/manhole/garbage/smoke/graffiti/tree/streetlight/sign/water/animal/crack/debris
- Then its visible state: cracking/blocking/overflowing/covering/leaning/missing/spreading/flooding
- Then location: near school/on highway/at intersection/along sidewalk/in park/on road
- No articles (a/an/the), English only, max 15 words

Examples:
  pothole cracking asphalt lane near busy intersection
  overflowing garbage bins scattered along residential sidewalk
  broken streetlight leaning over pedestrian crossing near school"""

DESC_PROMPTS["v2"] = """You are an urban infrastructure inspector. Describe ONLY the municipal/infrastructure problem visible in the surroundings.
Return ONLY this JSON, no markdown, no explanation:
{"description":"<max 15 words>"}

SCOPE: road damage, sidewalk damage, waste, pollution, greenery, lighting, signs, sewage, infrastructure, vandalism, animals, natural disaster.
Description: [problem] + [state] + [location], English only, max 15 words."""


# ===========================================================
# MODEL YUKLEME
# ===========================================================
print("DistilBERT tokenizer yukleniyor...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

print(f"ONNX model yukleniyor: {ONNX_PATH}")
if not Path(ONNX_PATH).exists():
    raise FileNotFoundError(f"{ONNX_PATH} bulunamadi. v0.9.0 klasorune kopyala.")

sess = ort.InferenceSession(ONNX_PATH, providers=["CPUExecutionProvider"])
print("Model hazir (CPU / ONNX Runtime)\n")

gemini_client = genai.Client(api_key=API_KEY)


# ===========================================================
# GEMINI
# ===========================================================
def _gemini_call(img_bytes: bytes, mime: str, prompt: str, temp: float) -> dict:
    """Tek bir Gemini JSON call'u. 3 deneme, rate-limit bekleme."""
    for attempt in range(3):
        try:
            res = gemini_client.models.generate_content(
                model="gemini-3.1-flash-lite-preview",
                contents=[
                    types.Part.from_bytes(data=img_bytes, mime_type=mime),
                    prompt,
                ],
                config=types.GenerateContentConfig(temperature=temp),
            )
            text = res.text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0]
            return json.loads(text)
        except (json.JSONDecodeError, KeyError) as e:
            raw = res.text.strip()
            match = re.search(r'\{.*?\}', raw, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group())
                except Exception:
                    pass
            return {"error": f"Gemini parse hatasi: {e}", "raw": raw[:200]}
        except ClientError as e:
            if "429" in str(e):
                wait = 30 * (attempt + 1)
                time.sleep(wait)
            else:
                return {"error": f"Gemini API hatasi: {e}"}
    return {"error": "Kota asildi, sonra tekrar dene"}


def analyze_image_bytes(img_bytes: bytes, mime: str, temperature: float = None, prompt_version: str = None) -> dict:
    """Gemini Solo icin tek call: filter + description birlikte."""
    temp = temperature if temperature is not None else GEMINI_TEMPERATURE
    prompt = PROMPTS.get(prompt_version or get_default_prompt(), PROMPTS[get_default_prompt()])
    return _gemini_call(img_bytes, mime, prompt, temp)


def get_filter_result(img_bytes: bytes, mime: str, temperature: float = None) -> dict:
    """Pipeline 1. adim: sadece boolean filter alanlari uret, aciklama yok."""
    temp = temperature if temperature is not None else GEMINI_TEMPERATURE
    return _gemini_call(img_bytes, mime, FILTER_PROMPT, temp)


def get_description(img_bytes: bytes, mime: str, temperature: float = None, prompt_version: str = None) -> dict:
    """Pipeline 2. adim: filter gecildikten sonra aciklama uret."""
    temp = temperature if temperature is not None else GEMINI_TEMPERATURE
    prompt = DESC_PROMPTS.get(prompt_version or get_default_prompt(), DESC_PROMPTS[get_default_prompt()])
    return _gemini_call(img_bytes, mime, prompt, temp)


def check_troll(gemini_result: dict) -> dict:
    if "error" in gemini_result:
        return {"passed": False, "reason": gemini_result["error"]}
    if gemini_result.get("is_nsfw", False):
        return {"passed": False, "reason": "NSFW: Uygunsuz icerik"}
    if not gemini_result.get("is_real_photo", True):
        return {"passed": False, "reason": "TROLL: Gercek fotograf degil"}
    if not gemini_result.get("is_outdoor", True):
        return {"passed": False, "reason": "TROLL: Dis mekan degil"}
    if gemini_result.get("is_person_focused", False):
        return {"passed": False, "reason": "TROLL: Kisi odakli fotograf, cevre sorunu degil"}
    if gemini_result.get("has_environmental_issue") is False:
        return {"passed": False, "reason": "TROLL: Cevresel/altyapi sorunu tespit edilmedi"}
    return {"passed": True}


# ===========================================================
# DISTILBERT (ONNX)
# ===========================================================
def classify(text: str) -> dict:
    enc  = tokenizer(text, truncation=True, padding="max_length",
                     max_length=MAX_LEN, return_tensors="np")
    ids  = enc["input_ids"].astype(np.int64)
    mask = enc["attention_mask"].astype(np.int64)

    cls_logits, pri_logits = sess.run(
        ["class_logits", "priority_logits"],
        {"input_ids": ids, "attention_mask": mask},
    )

    def softmax(x):
        e = np.exp(x - x.max()); return e / e.sum()

    cls_probs = softmax(cls_logits[0])
    pri_probs = softmax(pri_logits[0])
    cls_idx   = int(cls_probs.argmax())
    pri_idx   = int(pri_probs.argmax())
    confidence = float(cls_probs[cls_idx])

    all_scores = sorted(
        [{"class": CLASSES[i], "score": round(float(cls_probs[i]), 4)}
         for i in range(len(CLASSES))],
        key=lambda x: x["score"], reverse=True,
    )

    return {
        "category":       CLASSES[cls_idx],
        "confidence":     round(confidence, 4),
        "priority":       pri_idx,
        "priority_label": PRIORITY_LABELS.get(pri_idx, "?"),
        "department":     DEPARTMENT_MAP.get(CLASSES[cls_idx], "?"),
        "is_troll":       CLASSES[cls_idx] == "irrelevant",
        "is_normal":      CLASSES[cls_idx] == "normal",
        "needs_review":   confidence < CONFIDENCE_THRESHOLD,
        "all_scores":     all_scores,
    }

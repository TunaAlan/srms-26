"""
Environmental Issue Detection v8 -- DeBERTa-v3-small Pipeline
Fotograf -> Gemini (sadece aciklama) -> DeBERTa siniflandirir -> Sonuc

Kullanim:
  python app.py                -> interaktif mod
  python app.py test.jpg       -> tek fotograf
  python app.py photos/        -> klasordeki tum fotograflar
"""

import torch
import torch.nn as nn
from transformers import AutoModel, AutoTokenizer
from google import genai
from google.genai import types
from google.genai.errors import ClientError, ServerError
from pathlib import Path
import time, sys, json, os
from dotenv import load_dotenv

load_dotenv()

# ===========================================================
# AYARLAR
# ===========================================================
API_KEY    = os.getenv("GEMINI_API_KEY", "")
MODEL_PATH = os.getenv("MODEL_PATH", "text_classifier_v9.pth")
BACKBONE   = os.getenv("BACKBONE", "distilbert-base-uncased")

CLASSES = [
    "road_damage", "sidewalk_damage", "waste", "pollution",
    "green_space", "lighting", "traffic_sign", "sewage_water",
    "infrastructure", "vandalism", "stray_animal", "natural_disaster",
    "normal", "irrelevant"
]
NUM_CLASSES    = len(CLASSES)
NUM_PRIORITIES = 6

PRIORITY_LABELS = {
    0: "Irrelevant",
    1: "Normal",
    2: "Minor",
    3: "Moderate",
    4: "High",
    5: "Critical",
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

GEMINI_PROMPT = """Analyze this image. Return ONLY this JSON, no markdown, no explanation:
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


# ===========================================================
# 1. GEMINI -- fotografi analiz et
# ===========================================================
client = genai.Client(api_key=API_KEY)

def analyze_image(image_path: str) -> dict:
    path = Path(image_path)
    mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
            "webp": "image/webp"}.get(path.suffix.lstrip(".").lower(), "image/jpeg")
    data = path.read_bytes()

    for attempt in range(3):
        try:
            res = client.models.generate_content(
                model="gemini-3.1-flash-lite-preview",
                contents=[
                    types.Part.from_bytes(data=data, mime_type=mime),
                    GEMINI_PROMPT,
                ],
            )
            text = res.text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1]
                text = text.rsplit("```", 1)[0]
            return json.loads(text)

        except (json.JSONDecodeError, KeyError) as e:
            raw = res.text.strip()
            # JSON icinde ara
            import re
            match = re.search(r'\{.*?\}', raw, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group())
                except:
                    pass
            # Düz metin formatini parse et (description + key: value satirlari)
            lines = raw.split('\n')
            desc = lines[0].strip() if lines else ""
            result = {"description": desc, "is_outdoor": True, "is_real_photo": True, "is_nsfw": False}
            for line in lines[1:]:
                line = line.strip().lower()
                if "is_outdoor" in line:
                    result["is_outdoor"] = "true" in line
                elif "is_real_photo" in line:
                    result["is_real_photo"] = "true" in line
                elif "is_nsfw" in line:
                    result["is_nsfw"] = "true" in line
            if result["description"]:
                return result
            return {"error": f"Gemini parse hatasi: {e}"}
        except (ClientError, ServerError) as e:
            code = str(e)
            if "429" in code:
                wait = 30 * (attempt + 1)
                print(f"  Gemini kota, {wait}s bekleniyor...")
                time.sleep(wait)
            elif "503" in code or "UNAVAILABLE" in code:
                wait = 10 * (attempt + 1)
                print(f"  Gemini mesgul, {wait}s bekleniyor... (deneme {attempt+1}/3)")
                time.sleep(wait)
            else:
                return {"error": f"Gemini hatasi: {e}"}

    return {"error": "Kota asildi, daha sonra dene"}


# ===========================================================
# 2. TROLL FILTRESI
# ===========================================================
def check_troll(gemini_result: dict) -> dict:
    if "error" in gemini_result:
        return {"passed": False, "reason": gemini_result["error"]}

    if gemini_result.get("is_nsfw", False):
        return {"passed": False, "reason": "NSFW: Uygunsuz icerik tespit edildi"}
    if not gemini_result.get("is_real_photo", True):
        return {"passed": False, "reason": "TROLL: Gercek fotograf degil (screenshot/meme/cizim)"}
    if not gemini_result.get("is_outdoor", True):
        return {"passed": False, "reason": "TROLL: Dis mekan fotografi degil"}

    return {"passed": True}


# ===========================================================
# 3. MODEL -- DistilBERT (v9)
# ===========================================================
class EnvClassifier(nn.Module):
    def __init__(self, model_name="distilbert-base-uncased", num_classes=14, num_priorities=6):
        super().__init__()
        self.backbone = AutoModel.from_pretrained(model_name)
        hidden = self.backbone.config.hidden_size  # 768

        self.class_head = nn.Sequential(
            nn.Dropout(0.3), nn.Linear(hidden, 384), nn.GELU(),
            nn.Dropout(0.15), nn.Linear(384, num_classes),
        )
        self.priority_head = nn.Sequential(
            nn.Dropout(0.3), nn.Linear(hidden, 192), nn.GELU(),
            nn.Dropout(0.1), nn.Linear(192, num_priorities),
        )

    def forward(self, input_ids, attention_mask):
        out       = self.backbone(input_ids=input_ids, attention_mask=attention_mask)
        cls_token = out.last_hidden_state[:, 0]
        return self.class_head(cls_token), self.priority_head(cls_token)


def load_model():
    if not Path(MODEL_PATH).exists():
        print(f"Model bulunamadi: {MODEL_PATH}")
        sys.exit(1)

    device    = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model     = EnvClassifier(BACKBONE, num_classes=NUM_CLASSES, num_priorities=NUM_PRIORITIES).to(device)
    tokenizer = AutoTokenizer.from_pretrained(BACKBONE)

    checkpoint = torch.load(MODEL_PATH, map_location=device, weights_only=False)
    state = checkpoint["model_state"]

    print(f"  Checkpoint val_class_acc: {checkpoint.get('val_class_acc', '?')}")
    print(f"  Checkpoint val_priority_acc: {checkpoint.get('val_priority_acc', '?')}")

    model.load_state_dict(state, strict=True)
    model.eval()

    return model, tokenizer, device


def classify(text, model, tokenizer, device):
    enc  = tokenizer(text, truncation=True, padding="max_length",
                     max_length=64, return_tensors="pt")
    ids  = enc["input_ids"].to(device)
    mask = enc["attention_mask"].to(device)

    with torch.no_grad():
        cls_out, pri_out = model(ids, mask)

    cls_probs  = torch.softmax(cls_out, dim=1)[0]
    pri_probs  = torch.softmax(pri_out, dim=1)[0]
    cls_idx    = cls_probs.argmax().item()
    pri_idx    = pri_probs.argmax().item()
    confidence = cls_probs[cls_idx].item()

    all_scores = sorted(
        [(CLASSES[i], cls_probs[i].item()) for i in range(len(CLASSES))],
        key=lambda x: x[1], reverse=True
    )

    return {
        "category":       CLASSES[cls_idx],
        "confidence":     confidence,
        "priority":       pri_idx,
        "priority_label": PRIORITY_LABELS.get(pri_idx, "?"),
        "department":     DEPARTMENT_MAP.get(CLASSES[cls_idx], "?"),
        "is_troll":       CLASSES[cls_idx] == "irrelevant",
        "is_normal":      CLASSES[cls_idx] == "normal",
        "needs_review":   confidence < CONFIDENCE_THRESHOLD,
        "all_scores":     all_scores,
    }


# ===========================================================
# 4. FULL PIPELINE
# ===========================================================
def analyze(image_path, model, tokenizer, device):
    path = Path(image_path)
    if not path.exists():
        return {"error": f"Dosya bulunamadi: {image_path}"}

    print(f"  Gemini analiz ediyor...")
    gemini_result = analyze_image(str(path))

    if "error" in gemini_result:
        return {"error": gemini_result["error"]}

    troll_check = check_troll(gemini_result)
    if not troll_check["passed"]:
        return {
            "image":         path.name,
            "gemini":        gemini_result,
            "rejected":      True,
            "reject_reason": troll_check["reason"],
        }

    description = gemini_result.get("description", "")
    if not description:
        return {"error": "Gemini aciklama dondürmedi"}

    result = classify(description, model, tokenizer, device)
    print(f"  -> {result['category']} ({result['confidence']:.0%}) | '{description}'")
    result["image"]       = path.name
    result["description"] = description
    result["rejected"]    = False
    return result


def print_result(result):
    if "error" in result:
        print(f"  HATA: {result['error']}\n")
        return

    print(f"  Fotograf  : {result['image']}")

    if result.get("rejected"):
        desc = result.get("gemini", {}).get("description", "-")
        print(f"  Gemini    : {desc}")
        print(f"  {result['reject_reason']}")
        print()
        return

    print(f"  Gemini    : {result['description']}")

    if result["is_troll"]:
        print(f"  TROLL     : Model de alakasiz olarak siniflandirdi")
    elif result["is_normal"]:
        print(f"  NORMAL    : Sorun tespit edilmedi")
    else:
        print(f"  Kategori  : {result['category']}")
        print(f"  Oncelik   : {result['priority']}/5 {result['priority_label']}")
        print(f"  Birim     : {result['department']}")

    print(f"  Guven     : {result['confidence']:.0%}")

    if result.get("needs_review"):
        print(f"  DIKKAT    : Dusuk guven -- insan incelemesi onerilir")

    print(f"  --- Tum Kategoriler ---")
    for cls, prob in result.get("all_scores", []):
        bar = "#" * int(prob * 30)
        print(f"  {cls:<20} {prob:5.1%}  {bar}")

    print()


# ===========================================================
# 5. CALISTIR
# ===========================================================
if __name__ == "__main__":
    print("Environmental Issue Detection v8 -- DeBERTa-v3-small")
    print("-" * 55)

    model, tokenizer, device = load_model()
    print(f"Model hazir ({device})\n")

    if len(sys.argv) > 1:
        target = Path(sys.argv[1])

        if target.is_dir():
            exts   = [".jpg", ".jpeg", ".png", ".webp"]
            images = [p for p in target.iterdir() if p.suffix.lower() in exts]
            print(f"{len(images)} fotograf bulundu: {target}\n")
            for i, img in enumerate(images):
                print(f"[{i+1}/{len(images)}]")
                result = analyze(str(img), model, tokenizer, device)
                print_result(result)
                time.sleep(1)
        else:
            result = analyze(str(target), model, tokenizer, device)
            print_result(result)
        sys.exit(0)

    print("Fotograf yolu yaz + Enter (cikis: q)\n")
    while True:
        try:
            path = input("> ").strip().strip('"')
            if not path or path.lower() == "q":
                print("Cikis")
                break
            result = analyze(path, model, tokenizer, device)
            print_result(result)
        except KeyboardInterrupt:
            print("\nCikis")
            break

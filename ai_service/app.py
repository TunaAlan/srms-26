"""
Environmental Issue Detection -- DistilBERT ONNX + Gemini
Pipeline modulu: FastAPI main.py tarafindan import edilir.
  Fonksiyonlar: analyze_image_bytes, check_troll, classify
"""

from pathlib import Path
from google import genai
from google.genai import types
from google.genai.errors import ClientError
from transformers import AutoTokenizer
import onnxruntime as ort  # ONNX modelini CPU'da çalıştırır; alternatif: PyTorch (çok daha ağır)
import numpy as np
import json, re, time, os
from dotenv import load_dotenv

load_dotenv()  # .env dosyasından GEMINI_API_KEY'i yükler; API key koda yazılmaz → güvenlik

# ===========================================================
# AYARLAR
# ===========================================================
API_KEY    = os.getenv("GEMINI_API_KEY")               # .env'den okunur
_HERE      = Path(__file__).parent                      # bu dosyanın bulunduğu klasör
ONNX_PATH  = str(_HERE / "text_classifier_v10.onnx")   # model ile aynı klasörde
MODEL_NAME = "distilbert-base-uncased"                  # uncased: büyük/küçük harf fark yok; DeBERTa da denendi, benzer accuracy ama daha ağır
MAX_LEN    = 64                                         # token sınırı; metinler 10-15 kelime → 64 fazlasıyla yeterli

CLASSES = [
    "road_damage", "sidewalk_damage", "waste", "pollution",
    "green_space", "lighting", "traffic_sign", "sewage_water",
    "infrastructure", "vandalism", "stray_animal", "natural_disaster",
    "normal", "irrelevant"
]  # sabit sıra kritik: model çıktısındaki index bu sıraya bağlı
NUM_PRIORITIES = 6  # 0(irrelevant) – 5(critical)

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
}  # kategori → ilgili belediye birimi eşleşmesi

CONFIDENCE_THRESHOLD = 0.60  # altında kalırsa needs_review: True → insan kontrolüne gider
GEMINI_TEMPERATURE = 0.0     # deterministik: aynı fotoğraf → her seferinde aynı cevap

# Gemini'ye gönderilen prompt: tek call'da hem filtre bilgileri hem açıklama üretilir
# Alternatif: 2 ayrı call (önce filtre, sonra açıklama) → 2x API maliyeti, 2x gecikme
PROMPT = """You are an urban infrastructure inspector. Analyze this image for
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


# ===========================================================
# MODEL YUKLEME (uygulama başlarken bir kez çalışır)
# ===========================================================
print("DistilBERT tokenizer yukleniyor...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)  # metni sayılara çevirir; Dockerfile'da önceden indirildi

print(f"ONNX model yukleniyor: {ONNX_PATH}")
if not Path(ONNX_PATH).exists():
    raise FileNotFoundError(f"{ONNX_PATH} bulunamadi.")

sess = ort.InferenceSession(ONNX_PATH, providers=["CPUExecutionProvider"])  # CPU'da çalıştır; GPU'suz sunucu
print("Model hazir (CPU / ONNX Runtime)\n")

gemini_client = genai.Client(api_key=API_KEY)  # Gemini API bağlantısı


# ===========================================================
# GEMINI
# ===========================================================
def _gemini_call(img_bytes: bytes, mime: str, prompt: str, temp: float) -> dict:
    """Tek bir Gemini JSON call'u. 3 deneme, rate-limit bekleme."""
    for attempt in range(3):  # 3 deneme hakkı
        try:
            res = gemini_client.models.generate_content(
                model="gemini-3.1-flash-lite",
                contents=[
                    types.Part.from_bytes(data=img_bytes, mime_type=mime),  # fotoğraf
                    prompt,                                                   # talimat
                ],
                config=types.GenerateContentConfig(temperature=temp),  # temp=0.0: deterministik
            )
            text = res.text.strip()
            if text.startswith("```"):  # Gemini bazen markdown sarmalıyor; soy
                text = text.split("\n", 1)[1].rsplit("```", 1)[0]
            return json.loads(text)  # JSON string → Python dict
        except (json.JSONDecodeError, KeyError) as e:
            raw = res.text.strip()
            match = re.search(r'\{.*?\}', raw, re.DOTALL)  # metin içinde {...} ara; Gemini etrafına laf eklemiş olabilir
            if match:
                try:
                    return json.loads(match.group())  # bulduysak parse et
                except Exception:
                    pass
            return {"error": f"Gemini parse hatasi: {e}", "raw": raw[:200]}  # raw[:200]: debug için ilk 200 karakter
        except ClientError as e:
            if "429" in str(e):                    # 429: kota doldu
                wait = 30 * (attempt + 1)          # 1.denemede 30sn, 2.denemede 60sn, 3.denemede 90sn
                time.sleep(wait)
            else:
                return {"error": f"Gemini API hatasi: {e}"}
    return {"error": "Kota asildi, sonra tekrar dene"}  # 3 deneme de başarısız


def analyze_image_bytes(img_bytes: bytes, mime: str) -> dict:
    """main.py'nin çağırdığı fonksiyon; _gemini_call'a wrapper görevi görür."""
    return _gemini_call(img_bytes, mime, PROMPT, GEMINI_TEMPERATURE)


def check_troll(gemini_result: dict) -> dict:
    """Gemini sonucunu filtreler; geçerse passed:True, geçmezse passed:False + sebep."""
    if "error" in gemini_result:
        return {"passed": False, "reason": gemini_result["error"]}
    if gemini_result.get("is_nsfw", False):                          # uygunsuz içerik
        return {"passed": False, "reason": "NSFW: Uygunsuz icerik"}
    if not gemini_result.get("is_real_photo", True):                 # çizim, AI görsel, screenshot
        return {"passed": False, "reason": "TROLL: Gercek fotograf degil"}
    if not gemini_result.get("is_outdoor", True):                    # iç mekan
        return {"passed": False, "reason": "TROLL: Dis mekan degil"}
    if gemini_result.get("is_person_focused", False):                # selfie, portre
        return {"passed": False, "reason": "TROLL: Kisi odakli fotograf, cevre sorunu degil"}
    if gemini_result.get("has_environmental_issue") is False:        # çevre sorunu yok
        return {"passed": False, "reason": "TROLL: Cevresel/altyapi sorunu tespit edilmedi"}
    return {"passed": True}  # tüm filtrelerden geçti → DistilBERT'e gönder


# ===========================================================
# DISTILBERT (ONNX)
# ===========================================================
def classify(text: str) -> dict:
    enc  = tokenizer(text, truncation=True, padding="max_length",
                     max_length=MAX_LEN, return_tensors="np")  # metni sayılara çevir, 64 tokena pad/truncate et
    ids  = enc["input_ids"].astype(np.int64)    # kelimelerin sayısal karşılıkları
    mask = enc["attention_mask"].astype(np.int64)  # gerçek token: 1, padding: 0

    cls_logits, pri_logits = sess.run(
        ["class_logits", "priority_logits"],       # modelden iki çıktı iste
        {"input_ids": ids, "attention_mask": mask}, # tokenizer çıktısını modele ver
    )

    def softmax(x):
        e = np.exp(x - x.max()); return e / e.sum()  # ham skorları olasılığa çevir; x.max() overflow önler

    cls_probs  = softmax(cls_logits[0])   # 14 kategorinin olasılıkları, toplamı 1.0
    pri_probs  = softmax(pri_logits[0])   # 6 önceliğin olasılıkları
    cls_idx    = int(cls_probs.argmax())  # en yüksek olasılığın index'i → kategori
    pri_idx    = int(pri_probs.argmax())  # en yüksek olasılığın index'i → öncelik
    confidence = float(cls_probs[cls_idx])  # seçilen kategorinin olasılığı

    all_scores = sorted(
        [{"class": CLASSES[i], "score": round(float(cls_probs[i]), 4)}
         for i in range(len(CLASSES))],
        key=lambda x: x["score"], reverse=True,  # yüksekten düşüğe sırala
    )

    return {
        "category":       CLASSES[cls_idx],
        "confidence":     round(confidence, 4),   # 4 ondalık basamak
        "priority":       pri_idx,
        "priority_label": PRIORITY_LABELS.get(pri_idx, "?"),
        "department":     DEPARTMENT_MAP.get(CLASSES[cls_idx], "?"),
        "is_troll":       CLASSES[cls_idx] == "irrelevant",
        "is_normal":      CLASSES[cls_idx] == "normal",
        "needs_review":   confidence < CONFIDENCE_THRESHOLD,  # 0.60 altında → insan kontrolü
        "all_scores":     all_scores,  # tüm kategorilerin skorları; debug/analiz için
    }

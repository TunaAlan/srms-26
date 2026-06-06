"""
Environmental Issue Classifier v0.9.1 -- HTTP API
POST /classify  -> image_path al, JSON sonuc don
GET  /health    -> servis durumu
"""

from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import app as classifier  # app.py'yi import et; tüm Gemini + DistilBERT fonksiyonları buradan gelir


# Dosya uzantısını Gemini'nin beklediği MIME formatına çevirir
# Gemini'ye resim gönderirken "bu hangi formatta" diye söylemek zorunlu
MIME_MAP = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".png": "image/png",  ".webp": "image/webp",
}


@asynccontextmanager
async def lifespan(application: FastAPI):
    # Model app.py import edildiğinde otomatik yüklenir (sess = ort.InferenceSession(...))
    # Bu yüzden lifespan boş; her istek geldiğinde model tekrar yüklenmez → hızlı çalışır
    yield


api = FastAPI(
    title="Environmental Issue Classifier",  # /docs sayfasında görünür
    version="9.0",
    lifespan=lifespan,
)


@api.get("/health")
def health():
    # Servisin ayakta olup olmadığını kontrol eder
    # classifier.sess → ONNX modeli yüklüyse True; Docker healthcheck bu endpoint'i kullanır
    return {"status": "ok", "model_loaded": classifier.sess is not None}


class ClassifyRequest(BaseModel):
    image_path: str         # zorunlu: fotoğrafın sunucudaki tam yolu
    report_id: str = "unknown"  # opsiyonel: ileride loglama için; şu an kullanılmıyor


@api.post("/classify")
def classify_report(req: ClassifyRequest):
    # 1. Dosya var mı kontrol et
    path = Path(req.image_path)
    if not path.exists():
        raise HTTPException(status_code=400, detail=f"Dosya bulunamadi: {req.image_path}")  # 400: client hatası

    # 2. Uzantıyı MIME tipine çevir; tanımada yoksa default jpeg kullan
    mime = MIME_MAP.get(path.suffix.lower(), "image/jpeg")

    # 3. Dosyayı byte olarak oku; Gemini resmi text değil ham byte olarak alır
    img_bytes = path.read_bytes()

    # 4. Gemini'ye gönder → açıklama + filtre bilgileri döner
    gemini_result = classifier.analyze_image_bytes(img_bytes, mime)
    if "error" in gemini_result:
        raise HTTPException(status_code=500, detail=gemini_result["error"])  # 500: server hatası

    # 5. Troll filtresi: nsfw, sahte fotoğraf, iç mekan, kişi odaklı, çevre sorunu yok → reddet
    troll = classifier.check_troll(gemini_result)
    if not troll["passed"]:
        return {
            "success": True,
            "rejected": True,
            "reject_reason": troll["reason"],
            "category": "", "priority": 0, "priority_label": "",
            "confidence": 0.0, "department": "", "description": "", "needs_review": False,
        }

    # 6. Gemini'nin ürettiği açıklamayı al
    description = (gemini_result.get("description") or "").strip()
    if not description:
        raise HTTPException(status_code=500, detail="Gemini aciklama dondürmedi")

    # 7. DistilBERT ile sınıflandır: açıklama text → kategori + priority + department
    result = classifier.classify(description)

    return {
        "success":        True,
        "rejected":       False,
        "reject_reason":  "",
        "category":       result.get("category", ""),
        "priority":       result.get("priority", 0),
        "priority_label": result.get("priority_label", ""),
        "confidence":     result.get("confidence", 0.0),
        "department":     result.get("department", ""),
        "description":    description,
        "needs_review":   result.get("needs_review", False),  # confidence < 0.60 ise True → insan kontrolüne gider
    }

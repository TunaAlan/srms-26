"""
SRMS-26 AI Servisi
POST /classify -> Gemini (aciklama) -> DeBERTa (siniflandir) -> JSON
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from contextlib import asynccontextmanager
from pathlib import Path
import logging

from model import load_model, classify
from gemini import analyze_image, check_troll

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ml = {}  # model burda yasar, her istekte tekrar yuklenmez

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("DeBERTa yukleniyor...")
    ml["model"], ml["tokenizer"], ml["device"] = load_model()
    logger.info(f"Model hazir ({ml['device']})")
    yield
    ml.clear()

app = FastAPI(title="SRMS-26 AI Servisi", lifespan=lifespan)


class ClassifyRequest(BaseModel):
    image_path: str  # /uploads/foto.jpg


class ClassifyResponse(BaseModel):
    success:      bool
    rejected:     bool  = False
    reject_reason: str  = ""
    category:     str   = ""
    priority:     int   = 0
    priority_label: str = ""
    confidence:   float = 0.0
    department:   str   = ""
    description:  str   = ""
    needs_review: bool  = False


@app.post("/classify", response_model=ClassifyResponse)
def classify_report(req: ClassifyRequest):
    path = Path(req.image_path)
    if not path.exists():
        raise HTTPException(status_code=400, detail=f"Dosya bulunamadi: {req.image_path}")

    # 1. Gemini → metin açıklama
    gemini_result = analyze_image(str(path))
    if "error" in gemini_result:
        raise HTTPException(status_code=502, detail=gemini_result["error"])

    # 2. Troll filtresi
    troll = check_troll(gemini_result)
    if not troll["passed"]:
        return ClassifyResponse(
            success=True,
            rejected=True,
            reject_reason=troll["reason"],
        )

    description = gemini_result.get("description", "")
    if not description:
        raise HTTPException(status_code=502, detail="Gemini aciklama dondürmedi")

    # 3. DeBERTa → kategori + priority
    result = classify(description, ml["model"], ml["tokenizer"], ml["device"])

    return ClassifyResponse(
        success=True,
        category=result["category"],
        priority=result["priority"],
        priority_label=result["priority_label"],
        confidence=round(result["confidence"], 4),
        department=result["department"],
        description=description,
        needs_review=result["needs_review"],
    )


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": "model" in ml}

"""
Environmental Issue Classifier v8 -- HTTP API
POST /analyze  -> fotograf yukle, JSON sonuc al
GET  /health   -> servis durumu
"""

import io
import tempfile
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import app as classifier


_model = None
_tokenizer = None
_device = None


@asynccontextmanager
async def lifespan(application: FastAPI):
    global _model, _tokenizer, _device
    print("Model yukleniyor...")
    _model, _tokenizer, _device = classifier.load_model()
    print(f"Model hazir ({_device})")
    yield
    print("Servis kapaniyor.")


api = FastAPI(
    title="Environmental Issue Classifier",
    version="8.0",
    lifespan=lifespan,
)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


@api.get("/health")
def health():
    return {"status": "ok", "model_loaded": _model is not None}


class ClassifyRequest(BaseModel):
    image_path: str


@api.post("/classify")
def classify_report(req: ClassifyRequest):
    path = Path(req.image_path)
    if not path.exists():
        raise HTTPException(status_code=400, detail=f"Dosya bulunamadi: {req.image_path}")

    result = classifier.analyze(str(path), _model, _tokenizer, _device)

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    if result.get("rejected"):
        return {
            "success": True,
            "rejected": True,
            "reject_reason": result.get("reject_reason", ""),
            "category": "", "priority": 0, "priority_label": "",
            "confidence": 0.0, "department": "", "description": "", "needs_review": False,
        }

    return {
        "success":       True,
        "rejected":      False,
        "reject_reason": "",
        "category":      result.get("category", ""),
        "priority":      result.get("priority", 0),
        "priority_label": result.get("priority_label", ""),
        "confidence":    result.get("confidence", 0.0),
        "department":    result.get("department", ""),
        "description":   result.get("description", ""),
        "needs_review":  result.get("needs_review", False),
    }


@api.post("/analyze")
async def analyze(image: UploadFile = File(...)):
    suffix = Path(image.filename or "upload.jpg").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Desteklenmeyen dosya turu: {suffix}")

    data = await image.read()
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Dosya 20 MB sinirini asti")

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(data)
        tmp_path = tmp.name

    try:
        result = classifier.analyze(tmp_path, _model, _tokenizer, _device)
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    return JSONResponse(content=result)

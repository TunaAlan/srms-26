"""
Environmental Issue Classifier v0.9.1 -- HTTP API
POST /classify  -> image_path al, JSON sonuc don
GET  /health    -> servis durumu
"""

from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import app as classifier


MIME_MAP = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".png": "image/png",  ".webp": "image/webp",
}


@asynccontextmanager
async def lifespan(application: FastAPI):
    # model app.py import sirasinda yuklenir
    yield


api = FastAPI(
    title="Environmental Issue Classifier",
    version="9.0",
    lifespan=lifespan,
)


@api.get("/health")
def health():
    return {"status": "ok", "model_loaded": classifier.sess is not None}


class ClassifyRequest(BaseModel):
    image_path: str
    report_id: str = "unknown"


@api.post("/classify")
def classify_report(req: ClassifyRequest):
    path = Path(req.image_path)
    if not path.exists():
        raise HTTPException(status_code=400, detail=f"Dosya bulunamadi: {req.image_path}")

    mime = MIME_MAP.get(path.suffix.lower(), "image/jpeg")
    img_bytes = path.read_bytes()

    gemini_result = classifier.analyze_image_bytes(img_bytes, mime)
    if "error" in gemini_result:
        raise HTTPException(status_code=500, detail=gemini_result["error"])

    troll = classifier.check_troll(gemini_result)
    if not troll["passed"]:
        return {
            "success": True,
            "rejected": True,
            "reject_reason": troll["reason"],
            "category": "", "priority": 0, "priority_label": "",
            "confidence": 0.0, "department": "", "description": "", "needs_review": False,
        }

    description = (gemini_result.get("description") or "").strip()
    if not description:
        raise HTTPException(status_code=500, detail="Gemini aciklama dondürmedi")

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
        "needs_review":   result.get("needs_review", False),
    }

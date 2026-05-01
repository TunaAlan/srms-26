import sys
import os
import numpy as np
from transformers import AutoTokenizer
from pathlib import Path

ONNX_PATH = os.getenv("ONNX_PATH", str(Path(__file__).parent.resolve() / "text_classifier_v0.9.1.onnx"))

CLASSES = [
    "road_damage", "sidewalk_damage", "waste", "pollution",
    "green_space", "lighting", "traffic_sign", "sewage_water",
    "infrastructure", "vandalism", "stray_animal", "natural_disaster",
    "normal", "irrelevant"
]

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
NUM_CLASSES    = len(CLASSES)
NUM_PRIORITIES = 6


def _softmax(x):
    e = np.exp(x - x.max())
    return e / e.sum()


def load_model():
    import onnxruntime as ort

    print(f"[model] ONNX_PATH = {ONNX_PATH}")
    if not Path(ONNX_PATH).exists():
        print(f"HATA: ONNX model bulunamadi: {ONNX_PATH}")
        sys.exit(1)

    sess = ort.InferenceSession(ONNX_PATH, providers=["CPUExecutionProvider"])
    tokenizer = AutoTokenizer.from_pretrained("microsoft/deberta-v3-small")

    print(f"[model] ONNX model yuklendi (CPU)")
    return sess, tokenizer, "cpu"


def classify(text: str, model, tokenizer, device) -> dict:
    sess = model  # model aslında ort.InferenceSession

    enc = tokenizer(
        text, truncation=True, padding="max_length",
        max_length=64, return_tensors="np"
    )

    cls_out, pri_out = sess.run(
        ["class_logits", "priority_logits"],
        {
            "input_ids":      enc["input_ids"].astype(np.int64),
            "attention_mask": enc["attention_mask"].astype(np.int64),
        }
    )

    cls_probs = _softmax(cls_out[0])
    pri_probs = _softmax(pri_out[0])
    cls_idx   = int(cls_probs.argmax())
    pri_idx   = int(pri_probs.argmax())
    confidence = float(cls_probs[cls_idx])

    all_scores = sorted(
        [(CLASSES[i], float(cls_probs[i])) for i in range(NUM_CLASSES)],
        key=lambda x: x[1], reverse=True
    )

    return {
        "category":       CLASSES[cls_idx],
        "confidence":     confidence,
        "priority":       pri_idx,
        "priority_label": PRIORITY_LABELS.get(pri_idx, "?"),
        "department":     DEPARTMENT_MAP.get(CLASSES[cls_idx], "-"),
        "is_troll":       CLASSES[cls_idx] == "irrelevant",
        "is_normal":      CLASSES[cls_idx] == "normal",
        "needs_review":   confidence < CONFIDENCE_THRESHOLD,
        "all_scores":     all_scores,
    }

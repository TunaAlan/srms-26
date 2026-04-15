import sys
import torch
import torch.nn as nn
from transformers import AutoModel, AutoTokenizer
import os
from pathlib import Path

MODEL_PATH = os.getenv("MODEL_PATH", str(Path(__file__).parent.resolve() / "text_classifier_v8.pth"))

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


class EnvClassifier(nn.Module):
    def __init__(self, model_name="microsoft/deberta-v3-small", num_classes=NUM_CLASSES, num_priorities=NUM_PRIORITIES):
        super().__init__()
        self.backbone = AutoModel.from_pretrained(model_name)
        hidden = self.backbone.config.hidden_size  # 768

        self.class_head = nn.Sequential(
            nn.Dropout(0.3),  nn.Linear(hidden, 384), nn.GELU(),
            nn.Dropout(0.15), nn.Linear(384, num_classes),
        )
        self.priority_head = nn.Sequential(
            nn.Dropout(0.3), nn.Linear(hidden, 192), nn.GELU(),
            nn.Dropout(0.1), nn.Linear(192, num_priorities),
        )

    def forward(self, input_ids, attention_mask):
        out = self.backbone(input_ids=input_ids, attention_mask=attention_mask)
        cls = out.last_hidden_state[:, 0]
        return self.class_head(cls), self.priority_head(cls)


def load_model():
    if not Path(MODEL_PATH).exists():
        print(f"HATA: Model bulunamadi: {MODEL_PATH}")
        sys.exit(1)

    device    = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model     = EnvClassifier("microsoft/deberta-v3-small", num_classes=NUM_CLASSES, num_priorities=NUM_PRIORITIES).to(device)
    tokenizer = AutoTokenizer.from_pretrained("microsoft/deberta-v3-small")

    checkpoint = torch.load(MODEL_PATH, map_location=device, weights_only=False)
    model.load_state_dict(checkpoint["model_state"])
    model = model.float()
    model.eval()

    return model, tokenizer, device


def classify(text: str, model, tokenizer, device) -> dict:
    enc = tokenizer(
        text, truncation=True, padding="max_length",
        max_length=64, return_tensors="pt"
    )
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
        "department":     DEPARTMENT_MAP.get(CLASSES[cls_idx], "-"),
        "is_troll":       CLASSES[cls_idx] == "irrelevant",
        "is_normal":      CLASSES[cls_idx] == "normal",
        "needs_review":   confidence < CONFIDENCE_THRESHOLD,
        "all_scores":     all_scores,
    }

FROM python:3.11-slim

WORKDIR /app

# Sistem bagimliliklari
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# CPU-only PyTorch (GPU yok, image cok daha kucuk olur ~300MB vs ~2GB)
RUN pip install --no-cache-dir \
    torch==2.5.1+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# Diger bagimliliklari yukle
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# DistilBERT backbone'unu build sirasinda indir
RUN python -c "\
from transformers import AutoModel, AutoTokenizer; \
AutoModel.from_pretrained('distilbert-base-uncased'); \
AutoTokenizer.from_pretrained('distilbert-base-uncased'); \
print('DistilBERT indirildi.')"

# Uygulama dosyalari
COPY app.py main.py text_classifier_v9.pth ./

EXPOSE 8000

CMD ["uvicorn", "main:api", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]

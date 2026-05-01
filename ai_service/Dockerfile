FROM python:3.11-slim

WORKDIR /app

# Sistem bagimliliklari
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Python bagimliliklari (ONNX runtime, transformers tokenizer, fastapi, vs.)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# DistilBERT tokenizer'ini build sirasinda indir (ONNX weights modeli icerdigi icin full model gereksiz)
RUN python -c "\
from transformers import AutoTokenizer; \
AutoTokenizer.from_pretrained('distilbert-base-uncased'); \
print('DistilBERT tokenizer indirildi.')"

# Uygulama dosyalari
COPY app.py main.py text_classifier_v0.9.1.onnx ./

EXPOSE 8000

CMD ["uvicorn", "main:api", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]

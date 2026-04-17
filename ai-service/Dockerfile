FROM python:3.9-slim-bookworm

WORKDIR /app

# Install system dependencies needed for OpenCV and InsightFace
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# InsightFace downloads models to ~/.insightface on first run.
# We expose this path as a volume so models persist across restarts.
VOLUME ["/root/.insightface/models"]

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]

FROM python:3.12.7-slim
WORKDIR /app

# 安裝系統依賴
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 複製 requirements.txt 文件
COPY requirements.txt .

# 安裝 Python 依賴
RUN pip install --no-cache-dir -r requirements.txt

# 複製所有源代碼
COPY . .

# 暴露端口（Render 會動態分配）
EXPOSE 5000

# 使用動態端口啟動服務（Render 會提供 PORT 環境變數）
CMD ["sh", "-c", "gunicorn -k eventlet -w 1 -b 0.0.0.0:${PORT:-5000} topic_apps:app"]

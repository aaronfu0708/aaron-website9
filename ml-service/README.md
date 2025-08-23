# ML Service
# ---------------------
# 請自行新增以下內容
# ---------------------
## 簡介
本服務負責機器學習相關的模型訓練、推論（inference）或預測功能，獨立作為一個微服務部署，與後端 Django、Flask 服務進行互動。

## 技術棧
- Python 3.x
- 常用套件：scikit-learn、TensorFlow、PyTorch、FastAPI（或 Flask）
- Docker（如有）

## 環境需求
- Python 3.8+
- 相關機器學習套件（可參考 requirements.txt）
- 其他依賴（如 CUDA、GPU 驅動等）

## 安裝與執行

```bash
git clone <repo-url>
cd ml-service
python -m venv venv
source .venv/Scripts/activate  # Linux / macOS
venv\Scripts\activate     # Windows
pip install -r requirements.txt

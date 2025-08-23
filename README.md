# 專案簡介
本專案為一個多服務架構的系統，包含 Django 和 Flask 兩套後端服務，以及獨立的機器學習微服務（ml-service）。

# 目錄結構
```
/
├── frontend/ # React 前端
│ └── README.md
├── backend-django/ # Django 主系統（帳號、題庫、熟悉度）
│ └── README.md
├── ml-service/ # Flask 微服務（GPT 題目產生、模型處理）
│ └── README.md
├── docker-compose.yml # 整合啟動所有服務
├── .gitignore
├── README.md # 專案說明與分工紀錄
└── .code-workspace # VS Code 工作區（選擇性）
```

# ---------(陸續新增)-------

## 技術棧（暫定）

- Django 4.x
- Flask 2.x
- Python 3.8+
- FastAPI（可選，用於 ml-service）
- PostgreSQL / MySQL / SQLite（視需求）
- Redis（視需求）
- Docker（視部署方式）
- React 19.x
- Next 15.x

---

## 待補內容
- 聯絡資訊
 
## 啟動流程

下面提供整個專案及各服務的本地開發啟動步驟。專案採多服務架構：前端（Next.js）、後端（Django REST）、以及機器學習微服務（ml-service）。建議先透過 Docker Compose 一次啟動整個開發環境，或分別啟動各服務以利開發除錯。

1) 使用 docker-compose（推薦）

	 在專案根目錄執行：

```powershell
cd 'c:\Users\user\Documents\訓練班\專案\noteQ'
docker-compose up --build
```

	 會根據 `docker-compose.yml` 啟動或建立所需的服務（若有設定資料庫、redis 等會一併啟動）。

2) 個別啟動（開發模式）

	 - 後端（Django）

```powershell
cd 'c:\Users\user\Documents\訓練班\專案\noteQ\backend-django'
# 建議使用虛擬環境
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

	 - 前端（Next.js）

```powershell
cd 'c:\Users\user\Documents\訓練班\專案\noteQ\frontend\my-app'
npm install
npm run dev
```

	 - 機器學習服務（ml-service）

```powershell
cd 'c:\Users\user\Documents\訓練班\專案\noteQ\ml-service'
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

3) 瀏覽器介面

	 - 前端預設開發服務通常為 http://localhost:3000 或 Next.js 指定的埠（參考 `frontend/my-app/package.json` 中 `dev` 指令）。
	 - 後端 Swagger 可透過： http://localhost:8000/swagger/ 或 /redoc/ 檢視 API 文件（若後端使用預設埠）。

注意：以上執行埠與設定以你本機環境與 docker-compose 設定為準，若有額外環境變數（例如資料庫連線字串）請在啟動前設定或建立 `.env` 檔案。

## API 介面說明（摘要）

以下為專案目前已實作的主要 API 端點與簡短說明，範例基於本機後端在 http://localhost:8000 的假設。

- 認證與使用者

	- POST /api/token/  (登入（取得 access & refresh）)
		- Request JSON: { "email": "user@example.com", "password": "secret" }
		- Response: { "access": "<token>", "refresh": "<refresh>", "user_id": 1, "username": "...", "email": "...", "is_paid": true }

	- POST /register/  (註冊)
		- Request: 視 RegisterView 實作，通常為 email/password/username 等。

	- POST /login/  (自定義登入，回傳 token 與 is_paid)
		- Request JSON: { "email": "user@example.com", "password": "secret" }
		- Response JSON 包含 `token` (access)、`refresh` 與 `is_paid` 屬性。

	- POST /api/token/refresh/  (刷新 token)

- Topic / Quiz / Note 相關

	- GET/POST /api/quiz/  (Quiz 建立與查詢)
	- GET /api/topic/<topic_id>/  (取得單一 Topic 詳細)
	- GET /api/quiz/<quiz_id>/topics/  (取得 Quiz 下的所有 Topics)
	- POST /api/create_quiz/  (建立 quiz/topic 的 API)
	- GET /api/notes/  (取得使用者的 note 列表)
	- GET /api/notes/<note_id>/  (取得/編輯單一 note)
	- POST /api/user_quiz_and_notes/  (取得使用者的所有 quiz 與 note，亦可為 GET 視實作而定)
	- POST /api/add-favorite/  (加入收藏)
	- POST /api/chat/  (AI 聊天)
	- POST /api/chat/addtonote/  (把聊天內容加入筆記)
	- POST /api/submit_answer/  (提交答案)
	- POST /api/parse_answer/  (解析答案)
	- POST /api/retest/  (重新測試 note 內容)

	範例：取得使用者 quiz 與 notes

```bash
curl -X GET 'http://localhost:8000/api/user_quiz_and_notes/' \
	-H 'Authorization: Bearer <ACCESS_TOKEN>'
```

- Ecpay（付款）

	- POST /ecpay/  (產生付款表單，伺服器端會處理綠界介接)
	- POST /ECpay-return/  (綠界付款完成的回傳通知)

	範例：呼叫 ecpay

```bash
curl -X POST 'http://localhost:8000/ecpay/' -d '{...}' -H 'Content-Type: application/json'
```

## Swagger / API 文件

後端已整合 drf-yasg，啟動 Django 後可在以下路徑查看互動式文件（預設）：

- http://localhost:8000/swagger/  (Swagger UI)
- http://localhost:8000/redoc/    (ReDoc)

## 注意事項

- 大多數需要授權的端點請在 HTTP Header 中加入 Authorization: Bearer <access_token>
- 若要在前端取得 `is_paid`（訂閱狀態），登入 API 會回傳 `is_paid` 欄位，可儲存在 localStorage 或前端狀態管理中。
- 若後端在非預期埠或以 Docker 運行，請依 docker-compose 設定調整 URL 與埠號。
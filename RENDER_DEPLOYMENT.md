# Render 後端部署指南

## 概述
本指南將幫助您將 aaron-website9 的後端服務部署到 Render 平台。

## 部署的服務
1. **Django 後端** (`aaron-website9-backend`)
2. **ML 服務** (`aaron-website9-ml`)

## 步驟 1：註冊 Render 帳號
1. 前往 [Render.com](https://render.com)
2. 使用 GitHub 帳號登入
3. 點擊 "New +" 按鈕

## 步驟 2：連接 GitHub 倉庫
1. 選擇 "Web Service"
2. 選擇 "Connect a repository"
3. 選擇您的 `aaron-website9` 倉庫
4. 選擇 `main` 分支

## 步驟 3：配置 Django 後端服務

### 基本設定
- **Name**: `aaron-website9-backend`
- **Environment**: `Python 3`
- **Region**: 選擇離您最近的區域
- **Branch**: `main`
- **Root Directory**: `backend-django`

### 構建設定
- **Build Command**: `./build.sh`
- **Start Command**: `gunicorn myapps.wsgi:app`

### 環境變數
在 "Environment Variables" 部分添加以下變數：

```bash
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=0
DJANGO_ALLOWED_HOSTS=aaron-website9.vercel.app,localhost,127.0.0.1
DB_ENGINE=django.db.backends.mysql
DB_NAME=noteQ
DB_USER=Bun
DB_PASSWORD=fs101
DB_HOST=fs101.coded2.fun
DB_PORT=3306
DATABASE_URL=mysql://Bun:fs101@fs101.coded2.fun:3306/noteQ
EMAIL_HOST_USER=fs101zero01@gmail.com
EMAIL_HOST_PASSWORD=qngpycjgsptyecbc
NEXT_PUBLIC_ORIGIN=https://aaron-website9.vercel.app
MERCHANT_ID=3002607
HASH_KEY=pwFHCqoQZGmho4w6
HASH_IV=EkRm7iFT261dpevs
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_PROJECT_ID=proj_m56nwtabli8oUaooNRX0NzH3
```

## 步驟 4：配置 ML 服務

### 基本設定
- **Name**: `aaron-website9-ml`
- **Environment**: `Python 3`
- **Region**: 選擇與 Django 後端相同的區域
- **Branch**: `main`
- **Root Directory**: `ml-service`

### 構建設定
- **Build Command**: `./build.sh`
- **Start Command**: `gunicorn -k eventlet -w 1 topic_apps:app`

### 環境變數
在 "Environment Variables" 部分添加以下變數：

```bash
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_PROJECT_ID=proj_m56nwtabli8oUaooNRX0NzH3
DJANGO_BASE_URL=https://aaron-website9-backend.onrender.com
FLASK_ENV=production
FLASK_DEBUG=0
CORS_ORIGINS=https://aaron-website9.vercel.app
```

## 步驟 5：部署服務
1. 點擊 "Create Web Service"
2. 等待構建完成
3. 記錄生成的域名

## 步驟 6：測試服務

### Django 後端測試
- 健康檢查：`https://aaron-website9-backend.onrender.com/health/`
- API 文檔：`https://aaron-website9-backend.onrender.com/swagger/`

### ML 服務測試
- 健康檢查：`https://aaron-website9-ml.onrender.com/health`

## 步驟 7：更新前端配置
部署完成後，更新您前端的 API 端點配置：

```typescript
// 更新前
const API_BASE_URL = 'http://localhost:8000';
const ML_SERVICE_URL = 'http://localhost:5000';

// 更新後
const API_BASE_URL = 'https://aaron-website9-backend.onrender.com';
const ML_SERVICE_URL = 'https://aaron-website9-ml.onrender.com';
```

## 注意事項

### 免費計劃限制
- 免費計劃的服務在 15 分鐘無活動後會休眠
- 首次訪問可能需要等待服務重啟（約 30 秒）

### 數據庫連接
- 確保您的 MySQL 資料庫 `fs101.coded2.fun` 允許外部連接
- 檢查防火牆設定

### CORS 設定
- 如果遇到 CORS 問題，檢查 `NEXT_PUBLIC_ORIGIN` 設定
- 確保前端域名被正確允許

### 環境變數
- 敏感信息（如 API Key、密碼）應該在 Render 的環境變數中設定
- 不要在代碼中硬編碼敏感信息

## 故障排除

### 構建失敗
- 檢查 `requirements.txt` 文件是否完整
- 確認 Python 版本兼容性
- 查看構建日誌中的錯誤信息

### 服務無法啟動
- 檢查環境變數是否正確設定
- 確認啟動命令是否正確
- 查看服務日誌

### 數據庫連接問題
- 確認數據庫主機是否允許外部連接
- 檢查數據庫憑證是否正確
- 確認網絡連接

## 自動部署
Render 會自動監控您的 GitHub 倉庫，當您推送新代碼時會自動重新部署。

## 監控和日誌
- 在 Render 儀表板中查看服務狀態
- 查看實時日誌以診斷問題
- 設置告警通知

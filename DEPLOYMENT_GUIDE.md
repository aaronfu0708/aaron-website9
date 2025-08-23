# 服務串接部署指南

## 概述
本專案包含三個主要服務：
- **前端**: Next.js 應用，部署在 Vercel (https://aaron-website9.vercel.app)
- **後端**: Django API 服務，部署在 Render (https://aaron-website.onrender.com)
- **ML服務**: Flask 機器學習服務，部署在 Render (https://aaron-website9.onrender.com)

## 串接步驟

### 1. 環境變數配置

#### 前端 (Vercel)
在 Vercel 專案設定中加入以下環境變數：
```
NEXT_PUBLIC_BACKEND_API_URL=https://aaron-website.onrender.com
NEXT_PUBLIC_ML_SERVICE_URL=https://aaron-website9.onrender.com
NEXT_PUBLIC_FRONTEND_URL=https://aaron-website9.vercel.app
```

#### 後端 Django (Render)
在 Render 環境變數中加入：
```
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=0
DJANGO_ALLOWED_HOSTS=aaron-website.onrender.com
NEXT_PUBLIC_ORIGIN=https://aaron-website9.vercel.app,https://aaron-website9.onrender.com
CSRF_COOKIE_SECURE=true
SESSION_COOKIE_SECURE=true
SECURE_SSL_REDIRECT=true
```

#### ML服務 (Render)
在 Render 環境變數中加入：
```
FLASK_ENV=production
FLASK_DEBUG=0
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
ALLOWED_ORIGINS=https://aaron-website9.vercel.app,https://aaron-website.onrender.com
SECRET_KEY=your-ml-service-secret-key-here
```

### 2. CORS 設定

#### 後端 Django
Django 已設定允許以下來源的跨域請求：
- https://aaron-website9.vercel.app (前端)
- https://aaron-website9.onrender.com (ML服務)

#### ML服務
Flask 服務已設定允許以下來源的跨域請求：
- https://aaron-website9.vercel.app (前端)
- https://aaron-website.onrender.com (後端)

### 3. 部署順序

1. **先部署後端 Django**
   - 確保 API 端點正常運作
   - 測試 CORS 設定

2. **再部署 ML服務**
   - 確保服務能正常啟動
   - 測試與後端的連線

3. **最後部署前端**
   - 確保能正確呼叫後端和 ML服務
   - 測試所有功能

### 4. 測試串接

#### 測試後端連線
```bash
curl https://aaron-website.onrender.com/health
```

#### 測試 ML服務連線
```bash
curl https://aaron-website9.onrender.com/health
```

#### 測試前端
訪問 https://aaron-website9.vercel.app 並測試：
- 登入/註冊功能
- 題目生成功能
- 筆記管理功能

### 5. 常見問題

#### CORS 錯誤
- 檢查環境變數中的 `ALLOWED_ORIGINS` 設定
- 確認前端網址已加入允許清單

#### API 連線失敗
- 檢查環境變數中的 API URL 設定
- 確認服務是否正常運行
- 檢查防火牆和網路設定

#### 環境變數未生效
- 重新部署服務
- 檢查環境變數名稱是否正確
- 確認變數值格式正確

## 安全注意事項

1. **不要將敏感資訊提交到 Git**
   - 使用環境變數管理敏感設定
   - 定期更換密鑰和令牌

2. **HTTPS 強制**
   - 所有生產環境服務都使用 HTTPS
   - 設定適當的安全標頭

3. **CORS 限制**
   - 只允許必要的來源
   - 避免使用 `CORS_ALLOW_ALL_ORIGINS = True`

## 監控和維護

1. **健康檢查**
   - 定期檢查各服務的健康狀態
   - 設定監控告警

2. **日誌監控**
   - 監控錯誤日誌
   - 追蹤 API 呼叫頻率

3. **效能監控**
   - 監控回應時間
   - 追蹤資源使用情況
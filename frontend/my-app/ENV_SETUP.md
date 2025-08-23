# 前端環境變數設定說明

## 🎯 **必需的環境變數**

### **在 Vercel 上設定以下環境變數：**

```bash
# Django 後端 API 網址
NEXT_PUBLIC_BACKEND_API_URL=https://aaron-website9-backend.onrender.com

# ML 服務 API 網址
NEXT_PUBLIC_ML_SERVICE_URL=https://aaron-website9-ml.onrender.com

# 前端網址
NEXT_PUBLIC_FRONTEND_URL=https://aaron-website9.vercel.app
```

## 🔧 **設定步驟**

### 1. **Vercel 儀表板設定**
1. 進入您的 Vercel 專案
2. 點擊 "Settings" → "Environment Variables"
3. 添加上述三個環境變數

### 2. **本地開發設定**
創建 `.env.local` 文件：
```bash
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000
NEXT_PUBLIC_ML_SERVICE_URL=http://localhost:5000
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

## ⚠️ **重要提醒**

- **所有環境變數必須以 `NEXT_PUBLIC_` 開頭**
- **生產環境使用 HTTPS 協議**
- **確保後端和 ML 服務域名正確**
- **環境變數設定後需要重新部署**

## 🚀 **部署後測試**

設定完成後，測試以下功能：
1. 用戶登入/註冊
2. 題目獲取
3. AI 題目生成
4. 筆記功能
5. 支付功能

## 📝 **故障排除**

如果遇到問題：
1. 檢查環境變數是否正確設定
2. 確認後端服務是否正常運行
3. 查看瀏覽器控制台錯誤信息
4. 檢查 CORS 設定

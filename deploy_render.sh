#!/bin/bash

echo "🚀 開始準備 aaron-website9 後端部署到 Render..."

# 檢查是否在正確的目錄
if [ ! -f "render.yaml.template" ]; then
    echo "❌ 錯誤：請在 aaron-website9 目錄中執行此腳本"
    exit 1
fi

# 檢查 Git 狀態
echo "📋 檢查 Git 狀態..."
git status

# 添加所有更改
echo "📝 添加所有更改到 Git..."
git add .

# 提交更改
echo "💾 提交更改..."
git commit -m "feat: 添加 Render 部署配置，包含 Django 後端和 ML 服務"

# 推送到遠程倉庫
echo "📤 推送到 GitHub..."
git push origin main

echo "✅ 代碼已推送到 GitHub！"
echo ""
echo "📋 接下來請按照以下步驟在 Render 上部署："
echo ""
echo "🚀 部署 Django 後端："
echo "1. 前往 https://render.com"
echo "2. 使用 GitHub 帳號登入"
echo "3. 點擊 'New +' 按鈕"
echo "4. 選擇 'Web Service'"
echo "5. 選擇 'Connect a repository'"
echo "6. 選擇您的 aaron-website9 倉庫"
echo "7. 設定 Root Directory 為 'backend-django'"
echo "8. 設定 Build Command 為 './build.sh'"
echo "9. 設定 Start Command 為 'gunicorn myapps.wsgi:app'"
echo "10. 在 Environment Variables 中添加環境變數（參考 RENDER_DEPLOYMENT.md）"
echo "11. 點擊 'Create Web Service'"
echo ""
echo "🤖 部署 ML 服務："
echo "1. 在 Render 中點擊 'New +' 按鈕"
echo "2. 選擇 'Web Service'"
echo "3. 選擇相同的 aaron-website9 倉庫"
echo "4. 設定 Root Directory 為 'ml-service'"
echo "5. 設定 Build Command 為 './build.sh'"
echo "6. 設定 Start Command 為 'gunicorn -k eventlet -w 1 topic_apps:app'"
echo "7. 在 Environment Variables 中添加環境變數（參考 RENDER_DEPLOYMENT.md）"
echo "8. 點擊 'Create Web Service'"
echo ""
echo "🔗 部署完成後，您的前端就可以連接到新的後端 API 和 ML 服務了！"
echo "📖 詳細步驟請參考 RENDER_DEPLOYMENT.md 文件"
echo ""
echo "💡 提示：您可以複製 render.yaml.template 為 render.yaml 並填入真實配置進行一鍵部署！"

#!/usr/bin/env python3
"""
環境變數檢查腳本
用於診斷 Django 設定問題
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# 載入 .env 文件
ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / '.env')

print("=== Django 環境變數檢查 ===")
print(f"當前目錄: {os.getcwd()}")
print(f"ROOT 目錄: {ROOT}")
print()

# 檢查關鍵環境變數
env_vars = [
    'DJANGO_SECRET_KEY',
    'DJANGO_DEBUG',
    'DJANGO_ALLOWED_HOSTS',
    'DB_ENGINE',
    'DB_NAME',
    'DB_USER',
    'DB_HOST',
    'DB_PORT',
    'NEXT_PUBLIC_ORIGIN',
    'OPENAI_API_KEY'
]

print("環境變數狀態:")
for var in env_vars:
    value = os.getenv(var)
    if value:
        # 隱藏敏感信息
        if 'SECRET' in var or 'PASSWORD' in var or 'KEY' in var:
            display_value = f"{value[:10]}..." if len(value) > 10 else "***"
        else:
            display_value = value
        print(f"✅ {var}: {display_value}")
    else:
        print(f"❌ {var}: 未設定")

print()
print("=== 建議 ===")
print("1. 確保在 Render 上設定了所有必需的環境變數")
print("2. 檢查 DJANGO_ALLOWED_HOSTS 是否包含 'aaron-website9-backend.onrender.com'")
print("3. 確保 DJANGO_SECRET_KEY 已設定")
print("4. 檢查資料庫連接設定")

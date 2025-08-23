#!/usr/bin/env bash
# exit on error
set -o errexit

# 安裝依賴
pip install -r requirements.txt

# 收集靜態文件
python manage.py collectstatic --no-input

# 執行數據庫遷移
python manage.py migrate

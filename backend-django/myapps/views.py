from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

@csrf_exempt
@require_http_methods(["GET"])
def health_check(request):
    """
    健康檢查端點，用於 Render 部署檢查
    """
    try:
        # 檢查基本設定
        from django.conf import settings
        from django.db import connection
        
        # 測試資料庫連接
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return JsonResponse({
        'status': 'healthy',
        'message': 'Django 後端服務正常運行',
        'debug': getattr(settings, 'DEBUG', 'unknown'),
        'allowed_hosts': getattr(settings, 'ALLOWED_HOSTS', 'unknown'),
        'database': db_status,
        'secret_key_set': bool(getattr(settings, 'SECRET_KEY', None)),
        'timestamp': '2024-08-19'
    })

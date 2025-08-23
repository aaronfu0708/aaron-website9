from django.urls import path, include
from django.views.decorators.csrf import csrf_exempt
# 第三方套件
from rest_framework.routers import DefaultRouter
# app
from myapps.Authorization.auth_views import UserViewSet, AuthTokenViewSet, RegisterView ,forgot_password, reset_password , reset_password_from_email
from myapps.Authorization.feedback_views import FeedbackViewSet
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'token', AuthTokenViewSet, basename='auth-token')

# 自定義 JWT 登入視圖
@csrf_exempt
def custom_jwt_login(request):
    import json
    import logging
    from django.http import JsonResponse
    
    # 添加日誌記錄
    logger = logging.getLogger(__name__)
    logger.info(f"Login request received: {request.method}")
    
    if request.method == 'POST':
        try:
            # 解析請求數據
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')
            
            logger.info(f"Login attempt for email: {email}")
            
            if not email or not password:
                logger.warning("Missing email or password")
                return JsonResponse({'error': '需要提供 email 和 password'}, status=400)
            
            # 驗證用戶
            from django.contrib.auth import authenticate
            from myapps.Authorization.models import User, AuthToken
            
            # 由於 USERNAME_FIELD = 'email'，所以第一個參數還是 username，但值是 email
            user = authenticate(request, username=email, password=password)
            if not user:
                logger.warning(f"Invalid login credentials for email: {email}")
                return JsonResponse({'error': '登入憑證無效'}, status=401)
            
            # 生成 JWT token
            from rest_framework_simplejwt.tokens import RefreshToken
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            
            logger.info(f"Successful login for user: {user.email}")
            
            return JsonResponse({
                'token': str(access_token),  # 為了前端兼容性，保持 'token' 字段
                # 'access': str(access_token),
                'refresh': str(refresh),
                'user_id': user.id,
                'username': user.username,
                'email': user.email,
                'is_paid': user.is_paid
            })
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {str(e)}")
            return JsonResponse({'error': '無效的 JSON 格式'}, status=400)
        except Exception as e:
            logger.error(f"Unexpected error in login: {str(e)}")
            return JsonResponse({'error': f'伺服器錯誤: {str(e)}'}, status=500)
    
    logger.warning(f"Invalid request method: {request.method}")
    return JsonResponse({'error': '只支援 POST 請求'}, status=405)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),  # 手動註冊路徑
    path('login/', custom_jwt_login, name='login'),  # 自定義 JWT 登入路徑
    path('', include(router.urls)),  # 加入 DefaultRouter 的路徑
    path('forgot-password/', forgot_password),
    path('reset-password/', reset_password),
    path('reset-password-from-email/', reset_password_from_email),
    path('feedback/', FeedbackViewSet.as_view(), name='feedback'),

]
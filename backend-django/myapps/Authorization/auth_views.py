from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import viewsets, status, serializers
from django.conf import settings
from .models import User, AuthToken
from .serializers import UserSerializer, AuthTokenSerializer, RegisterInputSerializer, UserTokenSerializer, UserProfileSerializer
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.utils.http import urlsafe_base64_encode  ,urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.tokens import default_token_generator
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.decorators import api_view
from django.core.cache import cache
from django.utils import timezone

import jwt
# Create your views here.

class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]  # 僅允許已認證的使用者訪問
    
    def get_queryset(self):
        """優化查詢，只獲取當前用戶的資料"""
        return User.objects.filter(id=self.request.user.id).only(
            'id', 'username', 'email', 'created_at', 'is_paid'
        )
    
    def get_serializer_class(self):
        """根據操作選擇合適的序列化器"""
        if self.action == 'retrieve':
            return UserProfileSerializer  # 使用優化的序列化器
        return UserSerializer
    
    def retrieve(self, request, *args, **kwargs):
        """優化單個用戶資料獲取，使用緩存提升性能"""
        # 確保用戶只能獲取自己的資料
        if str(request.user.id) != kwargs.get('pk'):
            return Response({'error': '無權限訪問其他用戶資料'}, status=403)
        
        # 檢查緩存
        cache_key = f"user_profile_{request.user.id}"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)
        
        # 使用優化查詢
        user = User.objects.only(
            'id', 'username', 'email', 'created_at', 'is_paid'
        ).get(id=request.user.id)
        
        serializer = UserProfileSerializer(user)
        response_data = serializer.data
        
        # 設置緩存，有效期5分鐘
        cache.set(cache_key, response_data, 300)
        
        return Response(response_data)

class AuthTokenViewSet(viewsets.ModelViewSet):
    queryset = AuthToken.objects.all()
    serializer_class = AuthTokenSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

# 註冊帳號
@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(APIView):
    permission_classes = [AllowAny]  # 允許未認證的使用者
    def post(self, request, *args, **kwargs):
        serializer = RegisterInputSerializer(data=request.data)
        if serializer.is_valid():
            user = User.objects.create_user(
                username=serializer.validated_data['username'],
                email=serializer.validated_data['email'],
                password=serializer.validated_data['password'],
                is_staff=serializer.validated_data.get('is_staff', False),  # 預設不設為管理員
                is_paid=serializer.validated_data.get('is_paid', False)  # 預設不設為付費使用者
            )
            return Response({
                "message": "註冊成功",
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
                "is_paid": user.is_paid
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# 忘記密碼 API：發送重設連結
@api_view(['POST'])
def forgot_password(request):
    try:
        email = request.data.get('email')
        if not email:
            return Response({"error": "請提供電子郵件地址"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "使用者不存在"}, status=status.HTTP_404_NOT_FOUND)
        
        # 生成重設密碼的
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_link = f"http://localhost:3000/fgtpsd?uid={uid}&token={token}"
        
        # 嘗試發送郵件，並捕獲可能的錯誤
        try:
            send_mail(
                subject="重設密碼",
                message=f"請點擊以下連結重設您的密碼：{reset_link}",
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[email],
                fail_silently=False
            )
            return Response({"message": "重設密碼郵件已發送"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"郵件發送失敗: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        return Response({"error": f"伺服器錯誤: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@api_view(['POST'])
# 從忘記密碼進入的重設密碼 API
def reset_password_from_email(request):
    uidb64 = request.data.get('uid')
    print(f"Received uidb64: {uidb64}")
    uid = force_str(urlsafe_base64_decode(uidb64))
    new_password = request.data.get('new_password')

    try:
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({'error': '連結無效'}, status=400)

    user.set_password(new_password)
    user.save()
    return Response({'message': '密碼重設成功'}, status=200)


@api_view(['POST'])
# 使用者登入後重設密碼 API
def reset_password(request):
    user = request.user
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    try:
        user = User.objects.filter(id=user.id).first()
        if user.check_password(old_password):
            user.set_password(new_password)
            user.save()
            return Response({'message': '密碼重設成功'}, status=200)
        else:
            return Response({'error': '舊密碼錯誤'}, status=401)
    except Exception as e:
        return Response({'error': f'伺服器錯誤: {str(e)}'}, status=500)
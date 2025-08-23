from django.db import models 
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.core.validators import MinValueValidator , MaxValueValidator

# 簡單的 User Manager
class SimpleUserManager(BaseUserManager):
    def create_user(self, username, email, password=None, **extra_fields):
        user = self.model(username=username, email=email, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        # 存入預設資料庫DATABASES['default']  在多個DB時設定
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        user = self.create_user(username, email, password, **extra_fields)
        return user

# 自己創建的簡單 User 模型
class User(AbstractBaseUser):
    username = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    is_staff = models.BooleanField(default=False)  # 是否為管理員
    is_paid = models.BooleanField(default=False)   # 是否為付費使用者
    is_active = models.BooleanField(default=True)  # Django 需要這個欄位
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = SimpleUserManager()
    #指定自定義的 UserManager  ORM 會透過這個 objects 來做操作

    USERNAME_FIELD = 'email'  # 用於登入的欄位
    REQUIRED_FIELDS = ['username']  # 建立時必填的欄位

    def has_perm(self, perm, obj=None):
        return self.is_staff

    def has_module_perms(self, app_label):
        return self.is_staff


# JWT 資料庫
# 儲存使用者的 JWT token 和 refresh token
# user_id: 使用者ID
# jwt_token: JWT token
# refresh_token: Refresh token
# ip_address: 使用者 IP 位址
# created_at: 建立時間
# expired_at: token 過期時間
class AuthToken(models.Model):
    user = models.ForeignKey("Authorization.User", on_delete=models.CASCADE)
    jwt_token = models.CharField(max_length=512)
    refresh_token = models.CharField(max_length=512)
    ip_address = models.GenericIPAddressField(
        unpack_ipv4=False,
        null=False
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expired_at = models.DateTimeField()

    class Meta:
        db_table = "AuthToken"

class Feedback(models.Model):
    user = models.ForeignKey("Authorization.User", on_delete=models.CASCADE)
    level = models.IntegerField(default=1 , max_length=1 , validators=[MinValueValidator(1), MaxValueValidator(5)])  # 1-5 分
    content = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "Feedback"
        
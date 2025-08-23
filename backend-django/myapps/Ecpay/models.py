from django.db import models
from myapps.Authorization.models import User
# Create your models here.

# 綠界金流資料庫
# 儲存金流交易資訊
# user_id: 使用者ID
# amount: 交易金額
# status: 交易狀態
# created_at: 建立時間
# updated_at: 更新時間
# is_paid: 是否已付款
# payment_method: 付款方式choices: 'credit_card' (信用卡), 'bank_transfer' (銀行轉帳

class Order(models.Model):
    user = models.ForeignKey("Authorization.User", on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=32, choices=[('pending', 'Pending'), ('completed', 'Completed'), ('failed', 'Failed')], default='pending')
    # 綠界商店自訂單號 (傳給 ECPay 的 MerchantTradeNo)，用來在回傳時關聯訂單
    merchant_trade_no = models.CharField(max_length=64, unique=True, null=True, blank=True)
    # 付款完成時間（選擇性）
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # is_paid = models.BooleanField(default=False)
    payment_method = models.CharField(max_length=32, choices=[('Credit', 'Credit'), ('Bank Transfer', 'Bank Transfer')], default='Credit')

    class Meta:
        db_table = "Order"


# 使用者訂閱資料庫
# 儲存使用者訂閱資訊
# user_id: 使用者ID
# order_id: 訂單ID
# plan_id: 方案ID
# start_date: 訂閱開始日期
# end_date: 訂閱結束日期
# created_at: 建立時間
class UserSubscription(models.Model):
    user = models.ForeignKey("Authorization.User", on_delete=models.CASCADE)
    order = models.ForeignKey("Ecpay.Order", on_delete=models.CASCADE)
    plan = models.ForeignKey("Ecpay.PaymentPlan", on_delete=models.CASCADE)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "UserSubscription"


# 付費方案資料庫
# 儲存付費方案資訊
# name: 方案名稱
# description: 方案描述
# price: 方案價格
# duration_months: 方案持續時間，以月為單位
# created_at: 建立時間
class PaymentPlan(models.Model):
    name = models.CharField(max_length=64)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_months = models.IntegerField()  # 計劃持續時間，以月為單位
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "PaymentPlan"
# 綠界金流日誌資料庫
# 儲存綠界金流交易日誌
# order_id: 訂單ID
# status_code: 狀態碼
# status_message: 狀態訊息
# trade_no: 交易編號
# trade_date: 交易日期
# payment_type: 付款類型
# rtn_code: 回傳碼
# rtn_msg: 回傳訊息
# raw_post_data: 原始 POST 資料
# created_at: 建立時間
class EcpayLogs(models.Model):
    order = models.ForeignKey("Ecpay.Order", on_delete=models.CASCADE)
    status_code = models.IntegerField()
    status_message = models.CharField(max_length=256)
    trade_no = models.CharField(max_length=64)
    trade_date = models.DateTimeField()
    payment_type = models.CharField(max_length=32)
    rtn_code = models.CharField(max_length=32)
    rtn_msg = models.CharField(max_length=256)
    raw_post_data = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "EcpayLogs"
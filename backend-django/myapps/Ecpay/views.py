from django.shortcuts import render , redirect
from .serializers import UserSubscriptionSerializer, OrderSerializer, EcpayLogsSerializer 
from .models import UserSubscription, Order, EcpayLogs , PaymentPlan
from myapps.Authorization.models import User
from myapps.Authorization.serializers import UserSimplifiedSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import HttpResponse , HttpResponseRedirect
from django.utils import timezone
import requests , os
import random
from rest_framework import status
from rest_framework.permissions import AllowAny , IsAuthenticated
import hashlib
import time
from datetime import datetime
from .config import config
from django.db import transaction

# Create your views here.
DJANGO_BASE_URL = os.getenv("DJANGO_BASE_URL", "http://localhost:8000")
REACT_BASE_URL = os.getenv("REACT_BASE_URL", "http://localhost:3000")

class EcpayViewSet(APIView):
    permission_classes = [AllowAny]
    
    @staticmethod
    def generate_check_mac_value(params):
        """生成檢查碼"""
        if 'CheckMacValue' in params:
            del params['CheckMacValue']

        # 按照 key 依 A-Z 排序
        sorted_params = sorted(params.items())

        # 組合字串
        query_parts = []
        for key, value in sorted_params:
            query_parts.append(f"{key}={value}")
        query_string = "&".join(query_parts)
        
        # 加上 HashKey 和 HashIV
        raw_string = f"HashKey={config.HASH_KEY}&{query_string}&HashIV={config.HASH_IV}"
        
        # URL Encode
        from urllib.parse import quote_plus
        encoded_string = quote_plus(raw_string)
        
        # 字元替換
        encoded_string = encoded_string.replace('%2d', '-')
        encoded_string = encoded_string.replace('%5f', '_')
        encoded_string = encoded_string.replace('%2e', '.')
        encoded_string = encoded_string.replace('%21', '!')
        encoded_string = encoded_string.replace('%2a', '*')
        encoded_string = encoded_string.replace('%28', '(')
        encoded_string = encoded_string.replace('%29', ')')
        
        # 轉為小寫
        encoded_string = encoded_string.lower()
        
        # SHA256 加密並轉大寫
        sha256_hash = hashlib.sha256(encoded_string.encode('utf-8')).hexdigest()
        return sha256_hash.upper()
    
    # def get(self, request):
    #     """提供瀏覽器直接進入的測試入口（GET）。
    #     會產生一個自動提交到綠界的表單，方便你直接看到信用卡頁面。
    #     可用 query 參數覆蓋，例如：/ecpay/?amount=100&item=測試商品&desc=說明
    #     """
    #     amount = int(request.GET.get('amount', 100))
    #     item = request.GET.get('item', '測試商品')
    #     desc = request.GET.get('desc', '測試訂單')

    #     merchant_trade_no = f"ORDER{timezone.now().strftime('%Y%m%d%H%M%S')}"
    #     api_params = {
    #         "MerchantID": config.MERCHANT_ID,
    #         "MerchantTradeNo": merchant_trade_no,
    #         "MerchantTradeDate": timezone.now().strftime('%Y/%m/%d %H:%M:%S'),
    #         "PaymentType": "aio",
    #         "TotalAmount": amount,
    #         "TradeDesc": desc,
    #         "ItemName": item,
    #         "ReturnURL": config.RETURN_URL,
    #         "ClientBackURL": config.CLIENT_BACK_URL,
    #         "OrderResultURL": config.CLIENT_BACK_URL,
    #         "ChoosePayment": "Credit",
    #         "EncryptType": 1,
    #         "NeedExtraPaidInfo": "Y",
    #     }
    #     api_params["CheckMacValue"] = self.generate_check_mac_value(dict(api_params))
    #     html_form = self.generate_html_form(config.ACTION_URL, api_params)
    #     # 以 HttpResponse 回傳原始 HTML，避免被 DRF 當作字串轉義
    #     return HttpResponse(html_form, content_type="text/html; charset=utf-8")
    
    def post(self, request):
        # 訂單產生(整理訂單內容)
        payment_plan = PaymentPlan.objects.order_by('-created_at').first()
        if not payment_plan:
            return Response({"error": "No payment plan found"}, status=400)

        # 建立或取得訂單（若未登入，請改用 AllowAny + 不落地 DB）
        order = None
        if hasattr(request, 'user') and getattr(request.user, 'is_authenticated', False):
            order = Order.objects.filter(user=request.user, status="pending").first()
            if not order:
                order = Order.objects.create(
                    user_id=request.user.id,
                    amount=payment_plan.price,
                    status="pending",
                    payment_method=request.data.get("payment_method", "Credit")
                )

        amount = int(order.amount) if order else int(payment_plan.price)

        # 生成符合綠界規範的特店交易編號 (20 字元，英數字)
        # 規則：O + YYYYMMDDHHMMSS(14) + 5位隨機數 = 20
        merchant_trade_no = f"O{timezone.now().strftime('%Y%m%d%H%M%S')}{random.randint(0, 99999):05d}"
        # 確保長度為 20（開發期保護，正式可移除）
        if len(merchant_trade_no) != 20:
            merchant_trade_no = merchant_trade_no[:20]

        # 將 MerchantTradeNo 存入訂單（若有使用者與訂單）
        if order:
            order.merchant_trade_no = merchant_trade_no
            order.save(update_fields=["merchant_trade_no"])

        # 整理 API 參數（手動表單方式）
        api_params = {
            "MerchantID": config.MERCHANT_ID,
            "MerchantTradeNo": merchant_trade_no,
            "MerchantTradeDate": timezone.now().strftime('%Y/%m/%d %H:%M:%S'),
            "PaymentType": "aio",
            "TotalAmount": str(amount),  # 確保是字串
            "TradeDesc": payment_plan.description,
            "ItemName": payment_plan.name,
            # 伺服器接收付款結果（必要）：ECPay -> 後端
            "ReturnURL":  "https://adb20c71b316.ngrok-free.app/ECpay-return/",
            # 瀏覽器導回（可用 GET/POST），這裡讓它導到前端頁
            # "ClientBackURL": f"{REACT_BASE_URL}/payment/success",
            # 另一路徑（若設定為 POST）也導回，這裡暫導到同一個前端頁
            "OrderResultURL": f"{DJANGO_BASE_URL}/ECpay-return-post/",
            "ChoosePayment": "Credit",
            "EncryptType": "1",  # 確保是字串
            "NeedExtraPaidInfo": "Y",
        }
        api_params["CheckMacValue"] = self.generate_check_mac_value(dict(api_params))

        # 生成自動提交的 HTML 表單
        html_form = self.generate_html_form(config.ACTION_URL, api_params)
        # 以 HttpResponse 回傳原始 HTML，避免被 DRF 當作字串轉義
        return HttpResponse(html_form, content_type="text/html; charset=utf-8")
    
    def generate_html_form(self, action_url, params):
        """手動生成 HTML 表單"""
        form_inputs = ""
        for key, value in params.items():
            form_inputs += f'<input type="hidden" name="{key}" value="{value}" />\n'
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>正在跳轉到綠界金流...</title>
        </head>
        <body>
            <form id="ecpayForm" method="post" action="{action_url}" accept-charset="utf-8">
                {form_inputs}
            </form>
            <script>
                document.getElementById('ecpayForm').submit();
            </script>
            <p>正在跳轉到付款頁面，請稍候...</p>
        </body>
        </html>
        """
        return html
class EcpayReturnView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        data = request.data  # <QueryDict ...>
        merchant_trade_no = data.get('MerchantTradeNo')
        rtn_code = data.get('RtnCode')  # '1' 表成功

        # Debug：確認 trade no 與回傳碼
        print("[Return] merchant_trade_no:", merchant_trade_no, "rtn_code:", rtn_code)

        if not merchant_trade_no:
            return HttpResponse("0|FAIL", content_type="text/plain; charset=utf-8")

        # 以 merchant_trade_no 鎖定訂單
        try:
            order = (
                Order.objects
                .select_for_update()
                .get(merchant_trade_no=merchant_trade_no)
            )
        except Order.DoesNotExist:
            print(f"[Return] Order not found by MerchantTradeNo={merchant_trade_no}")
            return HttpResponse("0|FAIL", content_type="text/plain; charset=utf-8")

        # 若非成功，標記失敗並回 1|OK 讓 ECPay 停止重送（也可回 0|FAIL 視情況）
        if rtn_code != '1':
            if order.status != 'failed':
                order.status = 'failed'
                order.save(update_fields=["status"]) 
            EcpayLogs.objects.create(
                order_id=order.id,
                status_code=400,
                status_message="Payment failed",
                trade_no=data.get('TradeNo', ''),
                trade_date=timezone.now(),
                payment_type=data.get('PaymentType', ''),
                rtn_code=rtn_code or '',
                rtn_msg=data.get('RtnMsg', ''),
                raw_post_data=str(dict(data)),
            )
            return HttpResponse("1|OK", content_type="text/plain; charset=utf-8")

        # 冪等：避免重送重複入帳
        if order.status != "completed":
            order.status = "completed"
            order.paid_at = timezone.now()
            order.save(update_fields=["status", "paid_at"])

            # 更新會員狀態
            User.objects.filter(id=order.user_id).update(is_paid=True)

            # 建立訂閱紀錄（以最新方案）
            payment_plan = PaymentPlan.objects.order_by('-created_at').first()
            if payment_plan is not None:
                UserSubscription.objects.create(
                    user_id=order.user_id,
                    order_id=order.id,
                    plan_id=payment_plan.id,
                    start_date=timezone.now(),
                    end_date=timezone.now() + timezone.timedelta(days=payment_plan.duration_months * 30)
                )

        # 記錄成功/重送的回調
        EcpayLogs.objects.create(
            order_id=order.id,
            status_code=200,
            status_message="Payment callback",
            trade_no=data.get('TradeNo', ''),
            trade_date=timezone.now(),
            payment_type=data.get('PaymentType', ''),
            rtn_code=rtn_code or '',
            rtn_msg=data.get('RtnMsg', ''),
            raw_post_data=str(dict(data)),
        )

        # 一定回純文字 1|OK
        return HttpResponse("1|OK", content_type="text/plain; charset=utf-8")


class EcpayURLRedirect(APIView):
    permission_classes = [AllowAny]  # ECPay 回調不需要驗證

    def get(self, request):
        # ECPay 多半用 GET 帶參數回來
        params = request.query_params
        base_url = f"{REACT_BASE_URL}/user"
        query = params.urlencode()
        url = f"{base_url}?{query}" if query else base_url
        return redirect(url)

    def post(self, request):
        # 接收 ECPay 回傳的參數，再導到前端成功頁
        data = request.data
        print("ECPay 回調參數:", data)
        base_url = f"{REACT_BASE_URL}/user"
        from urllib.parse import urlencode
        query = urlencode(dict(data)) if data else ""
        url = f"{base_url}?{query}" if query else base_url
        return redirect(url)
    
class PaymentStatus(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 取得使用者的訂單狀態
        mt = request.query_params.get("merchant_trade_no")
        if not mt:
            return Response({"error":"missing merchant_trade_no"}, status=400)
        try:
            order = Order.objects.get(merchant_trade_no=mt)
        except Order.DoesNotExist:
            return Response({"status":"not_found"}, status=404)
        return Response({
            "merchant_trade_no": order.merchant_trade_no,
            "status": order.status,
            "paid_at": order.paid_at,
            "amount": str(order.amount),
        })
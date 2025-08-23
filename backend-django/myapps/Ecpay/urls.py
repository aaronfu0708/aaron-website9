from django.urls import path, include ,re_path
from django.views.decorators.csrf import csrf_exempt
from .views import EcpayViewSet, EcpayReturnView , EcpayURLRedirect ,PaymentStatus

urlpatterns = [
    path('ecpay/', csrf_exempt(EcpayViewSet.as_view()), name='ecpay'),
    path('ECpay-return/', csrf_exempt(EcpayReturnView.as_view()), name='ecpay_return'),
    re_path('ECpay-return-post/', csrf_exempt(EcpayURLRedirect.as_view()), name='ecpay_return_post'),
    path('payment-status/', csrf_exempt(PaymentStatus.as_view()), name='payment_status'),
]
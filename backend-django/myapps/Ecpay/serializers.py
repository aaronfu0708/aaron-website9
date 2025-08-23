from rest_framework import serializers
from .models import UserSubscription , Order , PaymentPlan ,EcpayLogs
from myapps.Authorization.serializers import UserSimplifiedSerializer

class UserSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        User = UserSimplifiedSerializer
        model = UserSubscription
        fields = 'user , order , plan , end_date , start_date'

class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        User = UserSimplifiedSerializer
        model = Order
        fields = 'user , amount  , status , is_paid , updated_at , payment_method ' 
        extra_kwargs = {
            'updated_at': {'required': False, 'allow_null': True},
            'status': {
                'required': False, 'allow_null': True,
                'default': 'pending'
            }
        }

class EcpayLogsSerializer(serializers.ModelSerializer):
    class Meta:
        model = EcpayLogs
        fields = '__all__'
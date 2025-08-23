import requests
from django.shortcuts import render , get_object_or_404
from django.http import JsonResponse
from .serializers import UserSerializer , FeedbackSerializer
from .models import User , Feedback
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny , IsAuthenticated
from rest_framework.decorators import api_view , permission_classes
from django.utils import timezone
from rest_framework.response import Response


class FeedbackViewSet(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        try:
            user = request.user
            level = request.data.get('level', 1)
            content = request.data.get('content', '')
            feedback = Feedback(user=user, level=level, content=content)
            feedback.save()
            return Response({'message': 'Feedback submitted successfully'}, status=201)
        except Exception as e:
            return Response({'error': str(e)}, status=400)
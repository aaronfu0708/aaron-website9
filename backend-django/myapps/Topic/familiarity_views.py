# apps/learning/views.py
from django.shortcuts import render
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import DifficultyLevels, UserFamiliarity
from .serializers import QuizSimplifiedSerializer
from .services import update_familiarity_weighted_average, update_familiarity_weighted_average_optimized
from .models import DifficultyLevels , UserFamiliarity , Quiz
from .serializers import UserFamiliaritySerializer ,QuizSimplifiedSerializer ,QuizSerializer
from django.core.validators import MinValueValidator
from decimal import Decimal

class SubmitAttemptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        body 範例（兩種格式）：
        格式1：{
          "quiz_topic_id": 123,
          "difficulty_level_id": 1,  // 或 "difficulty_level": "beginner"
          "total_questions": 5,
          "correct_answers": 4
        }
        格式2：{
          "topic_id": 123,
          "difficulty": "advanced",
          "accuracy": 0.8
        }
        """
        #檢查使用者
        quiz_user = request.user
        if not quiz_user.is_authenticated:
            return Response({"error": "User is not authenticated"}, status=403)

        # 判斷總題數 和 對錯
        
      # 判斷總題數 和 對錯
        

        # 支援兩種格式
        quiz_topic_id = request.data.get('quiz_topic_id') or request.data.get('topic_id')
        difficulty_level_id = request.data.get('difficulty_level_id')
        difficulty_level_name = request.data.get('difficulty_level') or request.data.get('difficulty')
        total_questions = request.data.get('total_questions')
        correct_answers = request.data.get('correct_answers')
        accuracy = request.data.get('accuracy')
        
        # 添加調試信息
        print(f"=== SubmitAttemptView 調試信息 ===")
        print(f"接收到的數據: {request.data}")
        print(f"quiz_topic_id: {quiz_topic_id}")
        print(f"difficulty_level_id: {difficulty_level_id}")
        print(f"difficulty_level_name: {difficulty_level_name}")
        print(f"total_questions: {total_questions}")
        print(f"correct_answers: {correct_answers}")
        print(f"accuracy: {accuracy}")
        print("=" * 50)

        if quiz_topic_id is None:
            return Response({"error": "quiz_topic_id (or topic_id) is required"}, status=400)

        # 難度處理：支援 ID 或名稱
        if difficulty_level_id is not None:
            try:
                difficulty_level = DifficultyLevels.objects.get(pk=difficulty_level_id)
                difficulty_level_name = difficulty_level.level_name
            except DifficultyLevels.DoesNotExist:
                return Response({"error": f"DifficultyLevels with ID {difficulty_level_id} not found"}, status=400)
        elif difficulty_level_name is None:
            return Response({"error": "difficulty_level_id or difficulty_level is required"}, status=400)

        # 檢查參數完整性
        if accuracy is None and (total_questions is None or correct_answers is None):
            return Response({"error": "Either provide 'accuracy' or both 'total_questions' and 'correct_answers'"}, status=400)

        try:
            # 檢查當前熟悉度是否已達上限
            from .models import UserFamiliarity
            current_uf = UserFamiliarity.objects.filter(
                user=request.user, 
                quiz_topic_id=quiz_topic_id
            ).first()
            
            if difficulty_level_id:
                difficulty_level = DifficultyLevels.objects.get(pk=difficulty_level_id)
            else:
                difficulty_level = DifficultyLevels.objects.get(level_name=difficulty_level_name)
            
            cap_pct = difficulty_level.familiarity_cap * 100  # 轉成百分比
            already_reached_cap = False
            
            if current_uf and current_uf.familiarity >= cap_pct:
                already_reached_cap = True

            # 呼叫服務函數（使用優化版本提升性能）
            new_fam = update_familiarity_weighted_average_optimized(
                user=request.user,
                quiz_topic_id=quiz_topic_id,
                difficulty_level_name=difficulty_level_name,
                accuracy=accuracy,
                total_questions_this_run=total_questions,
                correct_answers_this_run=correct_answers
            )
            return Response({
                "familiarity": float(new_fam),
                "quiz_topic_id": quiz_topic_id,
                "difficulty_level": difficulty_level_name,
                "difficulty_cap": float(cap_pct),
                "already_reached_cap": already_reached_cap,
                "updated": not already_reached_cap
            })
        except Exception as e:
            return Response({"error": str(e)}, status=500)
        

    # 取得用戶所有熟悉度記錄
    def get(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response({"error": "User is not authenticated"}, status=403)

        try:
            # 獲取用戶的所有熟悉度記錄，並使用 select_related 或 prefetch_related 優化查詢
            familiarities = UserFamiliarity.objects.filter(user=user, quiz_topic__deleted_at__isnull=True).select_related('quiz_topic')
            # 將結果序列化
            data = []
            for uf in familiarities:
                # 檢查 quiz_topic 是否存在
                if hasattr(uf, 'quiz_topic') and uf.quiz_topic :
                    quiz_topic_data = QuizSimplifiedSerializer(uf.quiz_topic).data
                else:
                    quiz_topic_data = {
                        "id": uf.quiz_topic_id,
                        "title": "已刪除的測驗",
                        "description": "此測驗已不存在"
                    }
                
                data.append({
                    "quiz_topic": quiz_topic_data,
                    "familiarity": float(uf.familiarity)
                })

            return Response(data)
        
        except Exception as e:
            return Response({"error": f"取得熟悉度記錄時發生錯誤: {str(e)}"}, status=500)
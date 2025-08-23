from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from .models import Quiz, Topic, Note

# 軟刪除管理視圖
class SoftDeleteManagementViewSet(APIView):
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, quiz_id):
        """軟刪除 Quiz 及其所有相關 Topic 和 Note"""
        try:
            quiz = Quiz.objects.get(id=quiz_id)
            
            # 獲取相關的 Note 數量（在軟刪除前）
            related_notes = Note.objects.filter(quiz_topic=quiz, deleted_at__isnull=True)
            notes_count = related_notes.count()
            
            # 軟刪除 Quiz（這會自動軟刪除相關的 Topic）
            quiz.soft_delete()
            
            # 軟刪除相關的 Note
            current_time = timezone.now()
            related_notes.update(deleted_at=current_time)
            
            return Response({
                'message': f'Quiz "{quiz.quiz_topic}" and all its topics have been soft deleted',
                'deleted_notes_count': notes_count,
                'deleted_at': current_time.isoformat()
            })
            
        except Quiz.DoesNotExist:
            return Response({
                'error': f'Quiz with ID {quiz_id} not found'
            }, status=404)
        except Exception as e:
            return Response({
                'error': f'Internal server error: {str(e)}'
            }, status=500)
    
    def post(self, request, quiz_id):
        """恢復軟刪除的 Quiz 及其相關 Note"""
        try:
            quiz = Quiz.all_objects.get(id=quiz_id)
            
            # 獲取相關的軟刪除 Note 數量（使用 all_objects 管理器）
            related_notes = Note.all_objects.filter(quiz_topic=quiz, deleted_at__isnull=False)
            notes_count = related_notes.count()
            
            # 恢復 Quiz
            quiz.restore()
            
            # 恢復相關的 Note
            related_notes.update(deleted_at=None)
            
            return Response({
                'message': f'Quiz "{quiz.quiz_topic}" has been restored',
                'restored_notes_count': notes_count
            })
            
        except Quiz.DoesNotExist:
            return Response({
                'error': f'Quiz with ID {quiz_id} not found'
            }, status=404)
        except Exception as e:
            return Response({
                'error': f'Internal server error: {str(e)}'
            }, status=500)
    
    def get(self, request):
        """獲取所有軟刪除的 Quiz"""
        try:
            deleted_quizzes = Quiz.all_objects.filter(deleted_at__isnull=False)
            
            quiz_list = []
            for quiz in deleted_quizzes:
                quiz_data = {
                    'id': quiz.id,
                    'quiz_topic': quiz.quiz_topic,
                    'created_at': quiz.created_at.isoformat() if quiz.created_at else None,
                    'deleted_at': quiz.deleted_at.isoformat() if quiz.deleted_at else None
                }
                quiz_list.append(quiz_data)
            
            return Response(quiz_list)
            
        except Exception as e:
            return Response({
                'error': f'Internal server error: {str(e)}'
            }, status=500)

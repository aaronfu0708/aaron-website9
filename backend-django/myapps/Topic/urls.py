from django.urls import path
from django.http import JsonResponse
from .views import QuizViewSet , TopicDetailViewSet, QuizTopicsViewSet , AddFavoriteViewSet , ChatViewSet , ChatContentToNoteView,NoteEdit , NoteListView , CreateQuizTopicView ,UserQuizView ,RetestView ,ParseAnswerView ,UsersQuizAndNote , SubmitAnswerView , NoteEditQuizTopicView
from .soft_delete_views import SoftDeleteManagementViewSet
from .familiarity_views import SubmitAttemptView

# API根端點
def api_root(request):
    """API根端點，顯示可用的API端點"""
    return JsonResponse({
        "message": "Django API 服務",
        "version": "v1",
        "endpoints": {
            "quiz": "/api/quiz/",
            "topics": "/api/topic/<id>/",
            "notes": "/api/notes/",
            "chat": "/api/chat/",
            "user_quiz_and_notes": "/api/user_quiz_and_notes/",
            "submit_answer": "/api/submit_answer/",
            "familiarity": "/api/familiarity/",
            "create_quiz": "/api/create_quiz/",
            "add_favorite": "/api/add-favorite/"
        }
    })

urlpatterns = [
    # API根端點
    path('', api_root, name='api-root'),
    
    # 創建題目和獲取所有題目
    path('quiz/', QuizViewSet.as_view(), name='quiz'),
    
    # 根據題目ID獲取單個題目詳細資料
    path('topic/<int:topic_id>/', TopicDetailViewSet.as_view(), name='topic_detail'),
    
    # 根據Quiz ID獲取該Quiz下的所有題目
    path('quiz/<int:quiz_id>/topics/', QuizTopicsViewSet.as_view(), name='quiz_topics'),
    
    # 軟刪除管理
    path('quiz/<int:quiz_id>/soft-delete/', SoftDeleteManagementViewSet.as_view(), name='soft_delete_quiz'),
    path('deleted-quizzes/', SoftDeleteManagementViewSet.as_view(), name='deleted_quizzes'),

    # 加入收藏
    path('add-favorite/', AddFavoriteViewSet.as_view(), name='add_favorite'),

    # AI聊天室
    path('chat/', ChatViewSet.as_view(), name='ai_chat'),
    path('chat/addtonote/', ChatContentToNoteView.as_view(), name='add_to_note'),
    path('notes/<int:note_id>/', NoteEdit.as_view(), name='note_edit'),
    path('notes/', NoteListView.as_view(), name='note-list'),
    path('create_quiz/', CreateQuizTopicView.as_view(), name='create_quiz'),
    path('note_edit_quiztopic/<int:note_id>/', NoteEditQuizTopicView.as_view(), name='NoteEditQuizTopicView'),

    # 查詢USER創建且加入收藏的主題
    path('user_quiz/', UserQuizView.as_view(), name='user_quiz'),
    # note內容重新測試
    path('retest/', RetestView.as_view(), name='retest'),

    # 解析答案
    path('parse_answer/', ParseAnswerView.as_view(), name='parse_answer'),

    # 取得用戶的所有quiz 和 note
    path('user_quiz_and_notes/', UsersQuizAndNote.as_view(), name='user_quiz_and_notes'),

    # 熟悉度計算
    path('familiarity/', SubmitAttemptView.as_view(), name='familiarity'),
    

    # 前端回傳用戶答案
    path('submit_answer/', SubmitAnswerView.as_view(), name='submit_answer')

]
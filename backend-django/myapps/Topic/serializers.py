from rest_framework import serializers
from .models import UserFavorite , Topic , Note , Chat , AiPrompt , AiInteraction , Quiz , UserFamiliarity , DifficultyLevels
from myapps.Authorization.serializers import UserSerializer , UserSimplifiedSerializer

class UserFavoriteSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = UserFavorite
        fields = ['id', 'user', 'note', 'created_at', 'deleted_at']
        extra_kwargs = {
            'deleted_at': {'required': False, 'allow_null': True}
        }

class TopicSerializer(serializers.ModelSerializer):
    # 優化：只選擇必要的欄位，避免載入過多資料
    class Meta:
        model = Topic
        fields = ['id', 'quiz_topic', 'difficulty', 'title', 'User_answer', 'explanation_text', 'Ai_answer', 'created_at', 'deleted_at', 'option_A', 'option_B', 'option_C', 'option_D']
        extra_kwargs = {
            'explanation_text': {'required': False, 'allow_null': True},
            'deleted_at': {'required': False, 'allow_null': True}
        }
        # 優化：限制序列化深度，避免過度巢狀查詢
        depth = 1

class QuizSerializer(serializers.ModelSerializer):
    # 優化：使用簡化的用戶序列化器，只載入必要欄位
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Quiz
        fields = ['id', 'user', 'quiz_topic', 'created_at', 'updated_at', 'deleted_at']
        extra_kwargs = {
            'updated_at': {'required': False, 'allow_null': True},
            'deleted_at': {'required': False, 'allow_null': True}
        }
        # 優化：限制序列化深度
        depth = 1

class UserFamiliaritySerializer(serializers.ModelSerializer):
    # 優化：使用簡化的序列化器，避免過度巢狀查詢
    user = UserSerializer(read_only=True)
    topic = TopicSerializer(read_only=True)
    
    class Meta:
        model = UserFamiliarity
        fields = ['id', 'user', 'topic', 'familiarity_score']
        # 優化：限制序列化深度
        depth = 1

class DifficultyLevelsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DifficultyLevels
        fields = ['id', 'level_name', 'familiarity_cap','weight_coefficients', 'created_at']

class ChatSerializer(serializers.ModelSerializer):
    # 優化：使用簡化的序列化器
    user = UserSerializer(read_only=True)
    topic = TopicSerializer(read_only=True)
    
    class Meta:
        model = Chat
        fields = ['id', 'topic', 'user', 'content', 'sender', 'created_at', 'deleted_at']
        extra_kwargs = {
            'deleted_at': {'required': False, 'allow_null': True}
        }
        # 優化：限制序列化深度
        depth = 1


class NoteSerializer(serializers.ModelSerializer):
    # 優化：使用簡化的序列化器，避免過度巢狀查詢
    user = UserSerializer(read_only=True)
    topic = TopicSerializer(read_only=True)
    quiz_topic = QuizSerializer(read_only=True)

    class Meta:
        model = Note
        fields = ['id', 'quiz_topic', 'title', 'topic', 'user', 'content', 'is_retake', 'created_at', 'updated_at', 'deleted_at']
        extra_kwargs = {
            'updated_at': {'required': False, 'allow_null': True},
            'deleted_at': {'required': False, 'allow_null': True},
            'is_retake': {'required': False},
            'title': {'required': False, 'allow_null': True}
        }
        # 優化：限制序列化深度
        depth = 1

class AiPromptSerializer(serializers.ModelSerializer):
    class Meta:
        model = AiPrompt
        fields = ['id', 'prompt', 'created_at', 'updated_at']
        extra_kwargs = {
            'updated_at': {'required': False, 'allow_null': True}
        }
        
class AiInteractionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    promppt = AiPromptSerializer(read_only=True)
    class Meta:
        model = AiInteraction
        fields = ['id', 'user','feedback','feedback_score', 'prompt', 'created_at']

# 簡化回傳內容----------------------------------
class UserFamiliaritySimplifiedSerializer(serializers.ModelSerializer):
    user = UserSimplifiedSerializer(read_only=True)

    class Meta:
        model = UserFamiliarity
        fields = ['id', 'familiarity_score','user', 'difficulty_level']


class QuizSimplifiedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quiz
        fields = ['id', 'quiz_topic' ]

class TopicSimplifiedSerializer(serializers.ModelSerializer):
    quiz = QuizSerializer(read_only=True)
    user = UserSimplifiedSerializer(read_only=True)
    class Meta:
        model = Topic
        fields = ['id', 'quiz', 'user']
class AddFavoriteTopicSerializer(serializers.ModelSerializer):
    quiz = QuizSerializer(read_only=True)

    class Meta:
        model = Topic
        fields = ['id','title', 'quiz_topic']

class NoteSimplifiedSerializer(serializers.ModelSerializer):
    quiz_topic_id = serializers.PrimaryKeyRelatedField(source='quiz_topic', read_only=True)
    class Meta:
        model = Note
        fields = ['id', 'title','content','quiz_topic_id']
# Generated manually for database optimization
# 手動生成用於資料庫優化

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Topic', '0006_merge_20250813_1504'),
    ]

    operations = [
        # 為 Topic 模型添加索引
        migrations.AddIndex(
            model_name='topic',
            index=models.Index(fields=['quiz_topic', 'deleted_at'], name='topic_quiz_deleted_idx'),
        ),
        migrations.AddIndex(
            model_name='topic',
            index=models.Index(fields=['user', 'deleted_at'], name='topic_user_deleted_idx'),
        ),
        migrations.AddIndex(
            model_name='topic',
            index=models.Index(fields=['difficulty', 'deleted_at'], name='topic_difficulty_deleted_idx'),
        ),
        migrations.AddIndex(
            model_name='topic',
            index=models.Index(fields=['created_at', 'deleted_at'], name='topic_created_deleted_idx'),
        ),
        
        # 為 Quiz 模型添加索引
        migrations.AddIndex(
            model_name='quiz',
            index=models.Index(fields=['user', 'deleted_at'], name='quiz_user_deleted_idx'),
        ),
        migrations.AddIndex(
            model_name='quiz',
            index=models.Index(fields=['created_at', 'deleted_at'], name='quiz_created_deleted_idx'),
        ),
        migrations.AddIndex(
            model_name='quiz',
            index=models.Index(fields=['quiz_topic', 'deleted_at'], name='quiz_topic_deleted_idx'),
        ),
        
        # 為 Note 模型添加索引
        migrations.AddIndex(
            model_name='note',
            index=models.Index(fields=['user', 'deleted_at'], name='note_user_deleted_idx'),
        ),
        migrations.AddIndex(
            model_name='note',
            index=models.Index(fields=['quiz_topic', 'deleted_at'], name='note_quiz_deleted_idx'),
        ),
        migrations.AddIndex(
            model_name='note',
            index=models.Index(fields=['created_at', 'deleted_at'], name='note_created_deleted_idx'),
        ),
        migrations.AddIndex(
            model_name='note',
            index=models.Index(fields=['user', 'quiz_topic', 'deleted_at'], name='note_user_quiz_deleted_idx'),
        ),
        
        # 為 UserFavorite 模型添加索引
        migrations.AddIndex(
            model_name='userfavorite',
            index=models.Index(fields=['user', 'deleted_at'], name='userfavorite_user_deleted_idx'),
        ),
        migrations.AddIndex(
            model_name='userfavorite',
            index=models.Index(fields=['quiz', 'deleted_at'], name='userfavorite_quiz_deleted_idx'),
        ),
        migrations.AddIndex(
            model_name='userfavorite',
            index=models.Index(fields=['topic', 'deleted_at'], name='userfavorite_topic_deleted_idx'),
        ),
        migrations.AddIndex(
            model_name='userfavorite',
            index=models.Index(fields=['note', 'deleted_at'], name='userfavorite_note_deleted_idx'),
        ),
        migrations.AddIndex(
            model_name='userfavorite',
            index=models.Index(fields=['user', 'quiz', 'deleted_at'], name='userfavorite_user_quiz_deleted_idx'),
        ),
    ]
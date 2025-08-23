# Generated manually for fixing DifficultyLevels table name issue
# 手動生成用於修復 DifficultyLevels 表名問題

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('Topic', '0007_add_database_indexes'),
    ]

    operations = [
        # 創建 DifficultyLevels 表（使用 Django 默認命名規則）
        migrations.RunSQL(
            # 前向遷移：創建表
            sql="""
            -- 檢查 Topic_difficultylevels 表是否存在
            SET @table_exists = (
                SELECT COUNT(*)
                FROM information_schema.tables 
                WHERE table_schema = DATABASE() 
                AND table_name = 'Topic_difficultylevels'
            );
            
            -- 如果表不存在，創建它
            SET @sql = IF(
                @table_exists = 0,
                'CREATE TABLE Topic_difficultylevels (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    level_name VARCHAR(128) UNIQUE NOT NULL,
                    familiarity_cap DECIMAL(5,2) DEFAULT 0.0,
                    weight_coefficients JSON DEFAULT (JSON_OBJECT()),
                    created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6)
                )',
                'SELECT "Topic_difficultylevels table already exists" as message'
            );
            
            PREPARE stmt FROM @sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
            
            -- 插入默認難度等級（如果不存在）
            INSERT IGNORE INTO Topic_difficultylevels (id, level_name, familiarity_cap, weight_coefficients) VALUES
            (1, 'beginner', 100.0, '{}'),
            (2, 'intermediate', 100.0, '{}'),
            (3, 'advanced', 100.0, '{}'),
            (4, 'master', 100.0, '{}'),
            (5, 'test', 100.0, '{}');
            """,
            
            # 反向遷移：刪除表
            reverse_sql="""
            DROP TABLE IF EXISTS Topic_difficultylevels;
            """
        ),
    ]

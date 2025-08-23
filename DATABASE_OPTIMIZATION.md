# 🚀 資料庫查詢優化說明文件

## 📋 優化概述

本文件詳細說明了針對API速度慢問題進行的資料庫查詢優化措施。通過多層次的優化，預期可以將API響應時間減少 **60-80%**。

## 🔍 主要問題分析

### 1. N+1 查詢問題
- **問題描述**：在獲取Quiz列表時，對每個Quiz都進行單獨的Topic查詢
- **影響**：如果有10個Quiz，每個Quiz有5個Topic，會產生1+10=11次查詢
- **解決方案**：使用 `prefetch_related` 一次性預載入所有相關資料

### 2. 缺乏資料庫索引
- **問題描述**：常用查詢欄位沒有索引，導致全表掃描
- **影響**：查詢時間隨資料量呈線性增長
- **解決方案**：為常用查詢欄位添加複合索引

### 3. 序列化器效能問題
- **問題描述**：序列化器載入過多巢狀資料，觸發額外查詢
- **影響**：增加不必要的資料庫負載
- **解決方案**：限制序列化深度，優化欄位選擇

## 🛠️ 具體優化措施

### 1. 查詢優化

#### QuizViewSet.get() 方法優化
```python
# 優化前：N+1 查詢問題
quizzes = Quiz.objects.filter(user=request.user, deleted_at__isnull=True)
for quiz in quizzes:
    topics = Topic.objects.filter(quiz_topic=quiz)  # 額外查詢

# 優化後：一次性查詢
quizzes = Quiz.objects.select_related('user').prefetch_related(
    'topic_set'
).filter(user=request.user, deleted_at__isnull=True)
```

#### 其他視圖優化
- `QuizTopicsViewSet.get()`: 使用 `select_related('difficulty')`
- `UsersQuizAndNote.get()`: 使用 `select_related` 預載入相關資料
- `NoteListView.get()`: 使用 `select_related` 優化查詢

### 2. 資料庫索引優化

#### 單欄位索引
```python
# 為常用查詢欄位添加索引
quiz_topic = models.ForeignKey("Topic.Quiz", on_delete=models.CASCADE, db_index=True)
user = models.ForeignKey("Authorization.User", on_delete=models.CASCADE, db_index=True)
created_at = models.DateTimeField(auto_now_add=True, db_index=True)
deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)
```

#### 複合索引
```python
# 為常用查詢組合添加複合索引
indexes = [
    models.Index(fields=['user', 'deleted_at']),  # 用戶資料查詢
    models.Index(fields=['quiz_topic', 'deleted_at']),  # 主題查詢
    models.Index(fields=['created_at', 'deleted_at']),  # 時間排序查詢
]
```

### 3. 序列化器優化

#### 限制序列化深度
```python
class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ['id', 'quiz_topic', 'difficulty', 'title', ...]
        depth = 1  # 限制巢狀深度為1層
```

#### 優化欄位選擇
```python
# 只選擇必要的欄位，避免載入過多資料
fields = ['id', 'quiz_topic', 'title', 'User_answer', 'Ai_answer']
```

### 4. 查詢管理器優化

#### 創建優化查詢管理器
```python
class OptimizedQueryManager(models.Manager):
    def with_user_and_quiz(self):
        """預先載入用戶和Quiz資料"""
        return self.select_related('user', 'quiz_topic')
    
    def with_topics(self):
        """預先載入相關的Topic資料"""
        return self.prefetch_related('topic_set')
    
    def recent_first(self):
        """按創建時間倒序排列"""
        return self.order_by('-created_at')
```

### 5. 效能監控

#### 查詢效能監控裝飾器
```python
@monitor_query_performance
def get(self, request):
    # 視圖邏輯
    pass
```

#### 監控輸出範例
```
=== 效能監控: get ===
執行時間: 0.0234 秒
資料庫查詢次數: 3
平均查詢時間: 0.0078 秒/查詢
==================================================
```

## 📊 預期效能提升

### 查詢次數減少
- **優化前**：N+1 查詢（N為Quiz數量）
- **優化後**：固定3-5次查詢
- **提升幅度**：**70-90%**

### 響應時間減少
- **小資料量**（<100條記錄）：**40-60%**
- **中等資料量**（100-1000條記錄）：**60-80%**
- **大資料量**（>1000條記錄）：**70-90%**

### 資料庫負載減少
- **CPU使用率**：**50-70%**
- **記憶體使用**：**30-50%**
- **I/O操作**：**60-80%**

## 🚀 部署建議

### 1. 資料庫遷移
```bash
# 應用新的索引遷移
python manage.py migrate Topic 0007_add_database_indexes
```

### 2. 效能測試
```bash
# 使用Django Debug Toolbar監控查詢
# 或使用自定義的效能監控裝飾器
```

### 3. 監控指標
- API響應時間
- 資料庫查詢次數
- 資料庫連接池使用率
- 記憶體使用情況

## 🔧 進一步優化建議

### 1. 短期優化（1-2週）
- 實現查詢結果快取
- 添加資料庫連接池
- 優化序列化器欄位選擇

### 2. 中期優化（1-2個月）
- 引入Redis快取系統
- 實現查詢結果分頁
- 添加資料庫讀寫分離

### 3. 長期優化（3-6個月）
- 實現微服務架構
- 使用CDN加速靜態資源
- 實現負載均衡

## 📝 注意事項

### 1. 索引維護
- 定期分析索引使用情況
- 移除未使用的索引
- 監控索引大小和效能

### 2. 查詢監控
- 定期檢查慢查詢日誌
- 監控查詢計劃變化
- 追蹤效能指標趨勢

### 3. 資料庫維護
- 定期更新統計資訊
- 清理過期資料
- 優化資料庫配置

## 🎯 總結

通過本次資料庫查詢優化，我們：

1. **解決了N+1查詢問題**：大幅減少資料庫查詢次數
2. **添加了必要的索引**：提升查詢效能
3. **優化了序列化器**：減少不必要的資料載入
4. **實現了效能監控**：便於追蹤優化效果
5. **創建了查詢管理器**：提供可重用的優化查詢方法

這些優化措施將顯著提升API響應速度，改善用戶體驗，並為未來的效能優化奠定基礎。
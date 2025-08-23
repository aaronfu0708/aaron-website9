#!/usr/bin/env python3
"""
測試檔案導入是否正常
"""

try:
    # 測試基本導入
    print("測試基本導入...")
    from django.conf import settings
    print("✓ Django settings 導入成功")
    
    # 測試我們的應用導入
    print("測試應用導入...")
    from myapps.Topic.models import Topic, Quiz, Note
    print("✓ Topic models 導入成功")
    
    from myapps.Topic.views import QuizViewSet
    print("✓ Topic views 導入成功")
    
    from myapps.Topic.serializers import TopicSerializer
    print("✓ Topic serializers 導入成功")
    
    print("所有導入測試通過！")
    
except ImportError as e:
    print(f"❌ 導入錯誤: {e}")
except Exception as e:
    print(f"❌ 其他錯誤: {e}")
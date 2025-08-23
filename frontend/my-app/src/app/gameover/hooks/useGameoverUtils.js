'use client';
// 遊戲結束頁面工具 Hook - 提供題目資料管理、筆記操作、Markdown 解析等核心功能

import { useState, useEffect, useCallback } from 'react';
import { getNotes, getSubjects, addNote } from '../../utils/noteUtils';

export function useGameoverUtils() {
  // 檢查用戶訂閱狀態
  const [isPlusSubscribed, setIsPlusSubscribed] = useState(false);

  // 從 note 頁面獲取真實數據
  const [subjects, setSubjects] = useState([]);
  const [notes, setNotes] = useState([]);
  
  // 新增：緩存機制，避免重複API調用
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const CACHE_DURATION = 30000; // 30秒緩存時間

  // 新增：統一的錯誤處理和重試機制
  const retryOperation = useCallback(async (operation, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error; // 最後一次重試失敗，拋出錯誤
        }
        // 等待後重試
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }, []);

  // 新增：安全的數據驗證
  const validateData = useCallback((data, type) => {
    if (!data) return false;
    
    switch (type) {
      case 'subjects':
        return Array.isArray(data) && data.every(item => typeof item === 'string');
      case 'notes':
        return Array.isArray(data) && data.every(item => 
          item && typeof item === 'object' && 
          typeof item.id === 'number' && 
          typeof item.title === 'string'
        );
      default:
        return true;
    }
  }, []);

  // 優化：使用 useCallback 避免重複創建函數
  const fetchData = useCallback(async () => {
    try {
      const now = Date.now();
      
      // 檢查緩存是否有效
      if (isDataLoaded && (now - lastFetchTime) < CACHE_DURATION) {
        return; // 使用緩存數據
      }
      
      // 並行獲取數據，提升性能
      const [subjectsData, notesData] = await Promise.all([
        getSubjects().catch(() => []), // 如果失敗返回空數組
        getNotes().catch(() => [])     // 如果失敗返回空數組
      ]);
      
      // 驗證數據完整性
      const validSubjects = validateData(subjectsData, 'subjects') ? subjectsData : [];
      const validNotes = validateData(notesData, 'notes') ? notesData : [];
      
      setSubjects(validSubjects);
      setNotes(validNotes);
      setIsDataLoaded(true);
      setLastFetchTime(now);
    } catch (error) {
      // 靜默處理錯誤，不影響用戶體驗
      console.warn('數據獲取失敗，使用空數據:', error);
      setSubjects([]);
      setNotes([]);
    }
  }, [isDataLoaded, lastFetchTime, validateData]);

  // 初始化檢查訂閱狀態和資料
  useEffect(() => {
    // 从localStorage獲得訂閱狀態
    const subscriptionStatus = localStorage.getItem('is_paid');
    setIsPlusSubscribed(subscriptionStatus === 'true');

    // 獲取數據
    fetchData();
  }, [fetchData]);

  // 題目數據（模擬從遊戲結果中獲取）
  const [questionData] = useState({
    1: {
      question: "判斷101-200之間有多少個質數並輸出所有質數",
      userAnswer: "A10個",
      correctAnswer: "B17個",
      status: "incorrect"
    },
    2: {
      question: "計算1到100的和",
      userAnswer: "5050",
      correctAnswer: "5050",
      status: "correct"
    },
    3: {
      question: "求斐波那契數列第10項",
      userAnswer: "34",
      correctAnswer: "55",
      status: "incorrect"
    },
    4: {
      question: "判斷一個數是否為回文數",
      userAnswer: "是",
      correctAnswer: "是",
      status: "correct"
    },
    5: {
      question: "求最大公約數",
      userAnswer: "6",
      correctAnswer: "12",
      status: "incorrect"
    }
  });

  // 檢查是否為Plus用戶
  const checkPlusSubscription = useCallback(() => {
    return isPlusSubscribed;
  }, [isPlusSubscribed]);

  // 顯示升級提示
  const showUpgradeAlert = useCallback(() => {
    if (window.showCustomAlert) {
      window.showCustomAlert('此功能僅限Plus用戶使用，請升級到Plus方案！');
    }
  }, []);

  // 簡單的Markdown解析函數
  const parseMarkdown = useCallback((text) => {
    return text
      // 標題
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // 粗體
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // 斜體
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // 程式碼
      .replace(/`(.*?)`/g, '<code>$1</code>')
      // 列表
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      // 分隔線
      .replace(/^---$/gim, '<hr>')
      // 換行
      .replace(/\n/g, '<br>');
  }, []);

  // 更新內容預覽
  const updateContentPreview = useCallback((textareaId, previewId) => {
    const textarea = document.getElementById(textareaId);
    const preview = document.getElementById(previewId);
    
    if (textarea && preview) {
      const content = textarea.value;
      const parsedContent = parseMarkdown(content);
      preview.innerHTML = parsedContent;
    }
  }, [parseMarkdown]);

  // 添加筆記到系統（僅Plus用戶可用）- 優化為樂觀更新
  const addNoteToSystem = useCallback(async (note) => {
    if (!checkPlusSubscription()) {
      showUpgradeAlert();
      return;
    }

    try {
      // 樂觀更新：立即更新本地狀態
      const newNoteWithId = {
        ...note,
        id: note.id || Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      setNotes(prev => [...prev, newNoteWithId]);
      
      // 如果主題不存在，也添加到主題列表
      if (!subjects.includes(note.subject)) {
        setSubjects(prev => [...prev, note.subject]);
      }
      
      // 後台靜默同步到服務器
      const result = await addNote(newNoteWithId);
      if (!result.success) {
        // 如果失敗，靜默處理，不影響用戶體驗
        console.warn('筆記同步失敗:', result.message);
      }
      
      return result;
      
    } catch (error) {
      // 靜默處理錯誤，不影響用戶體驗
      console.warn('添加筆記失敗:', error);
      return { success: false, message: '保存失敗，請重試！' };
    }
  }, [checkPlusSubscription, showUpgradeAlert, subjects]);

  // 顯示自定義提示
  const showCustomAlert = useCallback((message) => {
    if (window.showCustomAlert) {
      window.showCustomAlert(message);
    }
  }, []);

  // 顯示自定義輸入
  const showCustomPrompt = useCallback((title, callback) => {
    if (window.showGameoverCustomPrompt) {
      window.showGameoverCustomPrompt(title, callback);
    }
  }, []);

  return {
    questionData,
    subjects,
    notes,
    isPlusSubscribed,
    checkPlusSubscription,
    showUpgradeAlert,
    addNoteToSystem,
    showCustomAlert,
    showCustomPrompt,
    parseMarkdown,
    updateContentPreview
  };
} 
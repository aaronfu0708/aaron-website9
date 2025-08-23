"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Image from "next/image";
import Header from "../components/Header";
import Menu from "../components/Menu";
import styles from "../styles/NotePage.module.css";
import {
  getNotes,
  getSubjects,
  addNote,
  deleteNote,
  updateNote,
  moveNote,
  addSubject,
  deleteSubject,
  deleteSubjectFast,
  deleteSubjectSmart,
  getNotesBySubject,
  generateQuestions,
  cleanTextContent,
  parseMarkdown,
  loadUserQuizAndNotes,
  clearCache,
} from "../utils/noteUtils";
import { safeAlert, safeConfirm } from "../utils/dialogs";
import { safeLogout } from "../utils/auth";

export default function NotePage() {
  const [notes, setNotes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [currentSubject, setCurrentSubject] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMoveDropdownOpen, setIsMoveDropdownOpen] = useState(false);
  const [selectedMoveSubject, setSelectedMoveSubject] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [activeActionBar, setActiveActionBar] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [modalTextContent, setModalTextContent] = useState("");
  const [modalType, setModalType] = useState(""); // 'add', 'edit', 'view', 'move', 'addSubject', 'deleteSubject'
  const [editingNote, setEditingNote] = useState(null);
  const [movingNote, setMovingNote] = useState(null);
  const [isClient, setIsClient] = useState(false); // 新增：標記是否為客戶端
  
  // 初始化時直接從 localStorage 同步讀取，避免畫面先以 false 呈現造成閃屏
  const [isPlusSubscribed, setIsPlusSubscribed] = useState(null); // 初始化為 null

  // 新增：防抖狀態，防止漢堡選單重複點擊
  const [isMenuTransitioning, setIsMenuTransitioning] = useState(false);
  
  // 新增：額外的狀態保護
  const [lastMenuToggleTime, setLastMenuToggleTime] = useState(0);
  const MENU_TOGGLE_COOLDOWN = 500; // 500ms冷卻時間

  // 新增：localStorage 緩存相關
  const [isLoadingFromCache, setIsLoadingFromCache] = useState(true);
  const LOCAL_STORAGE_NOTES_KEY = 'notes_cache';
  const LOCAL_STORAGE_SUBJECTS_KEY = 'subjects_cache';
  const LOCAL_STORAGE_TIMESTAMP_KEY = 'notes_timestamp';
  const LOCAL_STORAGE_CURRENT_SUBJECT_KEY = 'current_subject'; // 新增：保存當前主題
  const CACHE_DURATION = 300000; // 5分鐘緩存時間

  // 新增：保存當前主題到localStorage
  const saveCurrentSubject = useCallback((subject) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_CURRENT_SUBJECT_KEY, JSON.stringify(subject));
    } catch (error) {
      // 靜默處理保存失敗
    }
  }, []);

  // 新增：更新本地緩存函數
  const updateLocalCache = useCallback((newNotes, newSubjects) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_NOTES_KEY, JSON.stringify(newNotes));
      localStorage.setItem(LOCAL_STORAGE_SUBJECTS_KEY, JSON.stringify(newSubjects));
      localStorage.setItem(LOCAL_STORAGE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      // 靜默處理緩存更新失敗
    }
  }, []);

  // 新增：清除本地緩存函數
  const clearLocalCache = useCallback(() => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_NOTES_KEY);
      localStorage.removeItem(LOCAL_STORAGE_SUBJECTS_KEY);
      localStorage.removeItem(LOCAL_STORAGE_TIMESTAMP_KEY);
    } catch (error) {
      // 靜默處理緩存清除失敗
    }
  }, []);

  // 使用 useMemo 優化筆記內容處理，避免每次渲染都重新處理
  const processedNotes = useMemo(() => {
    return notes.map(note => ({
      ...note,
      cleanedContent: cleanTextContent(note.content),
      parsedContent: parseMarkdown(cleanTextContent(note.content))
    }));
  }, [notes]);

  // 使用 useMemo 優化當前主題筆記的計算，避免每次渲染都重新計算
  const currentSubjectNotes = useMemo(() => {
    return Array.isArray(processedNotes)
      ? processedNotes.filter((note) => note.subject === currentSubject)
      : [];
  }, [processedNotes, currentSubject]);

  // 渲染筆記卡片
  const renderNoteCard = (note) => {
    // 使用已處理的內容，避免重複處理
    const processedNote = processedNotes.find(n => n.id === note.id) || note;
    const cleanedContent = processedNote.cleanedContent || cleanTextContent(note.content);
    const parsedContent = processedNote.parsedContent || parseMarkdown(cleanedContent);

    return (
      <article key={note.id} className={styles.noteCard} data-note-id={note.id}>
        <div className={styles.cardContent}>
          <h3 className={styles.noteTitle}>{note.title}</h3>
          <div
            className={styles.noteText}
            dangerouslySetInnerHTML={{ __html: parsedContent }}
          />
        </div>

        <div className={styles.addButton}>
          <div
            className={styles.generateButton}
            onClick={() => handleGenerateQuestions(note)}
          >
            <span className={styles.arrowUp}>↑</span>
            <span className={styles.generateText}>生成題目</span>
          </div>
          <span
            className={styles.addPlus}
            onClick={() => toggleActionBar(note.id)}
          >
            <Image src="/img/Vector-31.png" alt="Add" width={15} height={15} />
          </span>
          <div
            className={`${styles.actionBar} ${
              activeActionBar === note.id ? styles.active : ""
            }`}
          >
            <span
              className={styles.actionItem}
              onClick={() => handleDeleteNote(note)}
            >
              刪除
            </span>
            <span
              className={styles.actionItem}
              onClick={() => handleMoveNote(note)}
            >
              搬移
            </span>
            <span
              className={styles.actionItem}
              onClick={() => handleViewNote(note)}
            >
              查看
            </span>
            <span
              className={styles.actionItem}
              onClick={() => handleEditNote(note)}
            >
              編輯
            </span>
          </div>
        </div>
      </article>
    );
  };

  // 客戶端初始化
  useEffect(() => {
    setIsClient(true);
    
    // 從 localStorage 讀取訂閱狀態
    try {
      const subscriptionStatus = localStorage.getItem("is_paid");
      setIsPlusSubscribed(subscriptionStatus === "true" ? true : false);
    } catch (e) {
      setIsPlusSubscribed(false);
    }
    
    // 修復滾動問題：確保頁面初始化時滾動正常
    if (typeof document !== 'undefined') {
      // 重置 body 的 overflow 設置
      document.body.style.overflow = "auto";
      // 確保選單狀態與滾動狀態同步
      setIsMenuOpen(false);
    }
    
    // 清理函數：確保頁面離開時滾動狀態正常
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = "auto";
      }
      
      // 可選：頁面離開時清除緩存（如果需要強制刷新）
      // clearLocalCache();
    };
  }, []);

  // 新增：監聽主題創建事件，實現即時同步
  useEffect(() => {
    if (!isClient) return;

    const handleTopicCreated = (event) => {
      const { topic, id } = event.detail;
      
      // 樂觀更新：立即將新主題添加到本地狀態
      setSubjects(prev => {
        // 避免重複添加
        if (prev.includes(topic)) return prev;
        return [...prev, topic];
      });
      

      // 清除緩存，強制下次獲取最新數據
      clearCache();
    };

    // 監聽主題創建事件
    window.addEventListener('topicCreated', handleTopicCreated);
    
    // 監聽從 homegame 頁面傳來的數據
    const handleStorageChange = (e) => {
      if (e.key === 'quizData') {
        try {
          const quizData = JSON.parse(e.newValue || '{}');
          if (quizData.created_topic && quizData.topic_id) {
            // 觸發主題創建事件
            window.dispatchEvent(new CustomEvent('topicCreated', {
              detail: { 
                topic: quizData.created_topic, 
                id: quizData.topic_id 
              }
            }));
          }
        } catch (error) {
          // 靜默處理錯誤
        }
      }
    };

    // 監聽 sessionStorage 變化
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('topicCreated', handleTopicCreated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isClient, currentSubject]);

  // 監聽 currentSubject 變化，自動保存到 localStorage
  useEffect(() => {
    if (currentSubject && currentSubject.trim() !== '') {
      saveCurrentSubject(currentSubject);
    }
  }, [currentSubject, saveCurrentSubject]);

  // 初始化數據 - 優化為只調用一次API
  useEffect(() => {
    if (!isClient) return; // 確保只在客戶端執行
    
    (async () => {
      try {
        // 立即嘗試從本地緩存顯示數據
        try {
          const cachedNotes = localStorage.getItem(LOCAL_STORAGE_NOTES_KEY);
          const cachedSubjects = localStorage.getItem(LOCAL_STORAGE_SUBJECTS_KEY);
          const cachedTimestamp = localStorage.getItem(LOCAL_STORAGE_TIMESTAMP_KEY);
          const cachedCurrentSubject = localStorage.getItem(LOCAL_STORAGE_CURRENT_SUBJECT_KEY);
          
          if (cachedNotes && cachedSubjects && cachedTimestamp && cachedCurrentSubject) {
            const age = Date.now() - parseInt(cachedTimestamp);
            if (age < CACHE_DURATION) {
              // 緩存有效，立即顯示
              const parsedNotes = JSON.parse(cachedNotes);
              const parsedSubjects = JSON.parse(cachedSubjects);
              const parsedCurrentSubject = JSON.parse(cachedCurrentSubject);
              
              setNotes(parsedNotes);
              setSubjects(parsedSubjects);
              setCurrentSubject(parsedCurrentSubject);
              
              if (parsedSubjects.length > 0) {
                // 優先使用保存的主題，只有在保存的主題無效時才重置
                if (!parsedSubjects.includes(parsedCurrentSubject)) {
                  setCurrentSubject(parsedSubjects[0]);
                }
              }
              
              setIsLoadingFromCache(false);
            }
          }
        } catch (error) {
          // 靜默處理緩存讀取失敗
        }
        
        // 並行獲取最新數據（在後台更新）
        const loadResult = await loadUserQuizAndNotes();
        
        if (!loadResult.success) {
          if (notes.length === 0) {
            safeAlert("載入筆記失敗，請重新整理頁面");
          }
          return;
        }

        // 從本地 noteUtils 獲取已處理的數據，不需要再次調用API
        const notesData = await getNotes();
        const subjectsData = await getSubjects();
        
        setNotes(notesData);
        setSubjects(subjectsData);

        if (subjectsData.length > 0) {
          // 優先使用保存的主題，只有在保存的主題無效時才重置
          const savedCurrentSubject = localStorage.getItem(LOCAL_STORAGE_CURRENT_SUBJECT_KEY);
          if (savedCurrentSubject && subjectsData.includes(JSON.parse(savedCurrentSubject))) {
            setCurrentSubject(JSON.parse(savedCurrentSubject));
          } else if (!subjectsData.includes(currentSubject)) {
            setCurrentSubject(subjectsData[0]);
          }
        } else {
          setCurrentSubject(""); // 沒有主題時重置為空字符串
        }
        
        // 保存到本地緩存
        updateLocalCache(notesData, subjectsData);
        
        setIsLoadingFromCache(false);
      } catch (error) {
        if (notes.length === 0) {
          safeAlert("初始化數據失敗，請重新整理頁面");
        }
        setIsLoadingFromCache(false);
      }
    })();
  }, [isClient, currentSubject]);

  // subjects 更新後，自動選定可用主題，避免初次進頁 currentSubject 為空而不渲染
  useEffect(() => {
    if (subjects.length === 0) return;
    
    // 優先使用保存的主題，只有在保存的主題無效時才重置
    const savedCurrentSubject = localStorage.getItem(LOCAL_STORAGE_CURRENT_SUBJECT_KEY);
    if (savedCurrentSubject && subjects.includes(JSON.parse(savedCurrentSubject))) {
      setCurrentSubject(JSON.parse(savedCurrentSubject));
    } else {
      setCurrentSubject((prev) =>
        prev && subjects.includes(prev) ? prev : subjects[0]
      );
    }
  }, [subjects]);

  // 檢查是否為Plus用戶 - 使用 useCallback 優化
  const checkPlusSubscription = useCallback(() => {
    return isPlusSubscribed === true;
  }, [isPlusSubscribed]);

  // 顯示升級提示 - 使用 useCallback 優化
  const showUpgradeAlert = useCallback(() => {
    safeAlert("此功能僅限Plus用戶使用，請升級到Plus方案！");
  }, []);

  // 切換選單 - 使用 useCallback 優化 + 滾動修復
  const toggleMenu = useCallback(() => {
    const now = Date.now();
    
    // 檢查冷卻時間
    if (now - lastMenuToggleTime < MENU_TOGGLE_COOLDOWN) {
      return;
    }
    
    // 防止重複點擊和過渡期間的點擊
    if (isMenuTransitioning) {
      return;
    }
    
    // 設置冷卻時間
    setLastMenuToggleTime(now);
    setIsMenuTransitioning(true);
    
    const newMenuState = !isMenuOpen;
    setIsMenuOpen(newMenuState);
    
    // 修復滾動問題：確保 overflow 設置與選單狀態同步
    if (newMenuState) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    
    // 300ms後重置防抖狀態（與CSS過渡時間一致）
    setTimeout(() => {
      setIsMenuTransitioning(false);
    }, 300);
  }, [isMenuOpen, isMenuTransitioning, lastMenuToggleTime]);

  // 關閉選單 - 使用 useCallback 優化 + 滾動修復
  const closeMenu = useCallback(() => {
    // 防止重複點擊和過渡期間的點擊
    if (isMenuTransitioning) {
      return;
    }
    
    setIsMenuTransitioning(true);
    
    setIsMenuOpen(false);
    // 修復滾動問題：確保滾動恢復
    document.body.style.overflow = "auto";
    
    // 300ms後重置防抖狀態（與CSS過渡時間一致）
    setTimeout(() => {
      setIsMenuTransitioning(false);
    }, 300);
  }, [isMenuTransitioning]);

  // 切換下拉選單 - 使用 useCallback 優化
  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen(!isDropdownOpen);
  }, [isDropdownOpen]);

  // 選擇主題 - 使用 useCallback 優化
  const selectSubject = useCallback((subject) => {
    setCurrentSubject(subject);
    setIsDropdownOpen(false);
  }, []);

  // 新增主題 - 使用 useCallback 優化
  const handleAddSubject = useCallback(() => {
    if (!checkPlusSubscription()) {
      showUpgradeAlert();
      return;
    }
    setModalType("addSubject");
    setModalContent("");
    setShowModal(true);
  }, [checkPlusSubscription, showUpgradeAlert]);

  // 確認新增主題 - 優化為樂觀更新
  const confirmAddSubject = useCallback(async () => {
    if (!checkPlusSubscription()) {
      showUpgradeAlert();
      return;
    }
    if (modalContent.trim()) {
      const newSubject = modalContent.trim();
      
      // 樂觀更新：立即更新UI
      const newSubjects = [...subjects, newSubject];
      setSubjects(newSubjects);
      setCurrentSubject(newSubject);
      setShowModal(false);
      setModalContent("");
      
      // 更新本地緩存
      updateLocalCache(notes, newSubjects);
      
      // 立即顯示成功訊息，提升用戶體驗
      safeAlert("主題新增成功！");
      
      // 後台同步到服務器（靜默處理）
      try {
        const result = await addSubject(newSubject);
        if (!result.success) {
          // 如果失敗，回滾UI
          setSubjects(prev => prev.filter(s => s !== newSubject));
          // 回滾緩存
          updateLocalCache(notes, subjects.filter(s => s !== newSubject));
          // 靜默處理失敗，不顯示額外訊息
        }
      } catch (error) {
        // 靜默處理錯誤，不顯示額外訊息
        // 回滾UI
        setSubjects(prev => prev.filter(s => s !== newSubject));
        // 回滾緩存
        updateLocalCache(notes, subjects.filter(s => s !== newSubject));
      }
    }
  }, [modalContent, checkPlusSubscription, showUpgradeAlert]);

  // 刪除主題 - 使用 useCallback 優化
  const handleDeleteSubject = useCallback((subject, event) => {
    if (!checkPlusSubscription()) {
      showUpgradeAlert();
      return;
    }
    event.stopPropagation();
    setModalType("deleteSubject");
    setModalContent(subject);
    setShowModal(true);
  }, [checkPlusSubscription, showUpgradeAlert]);

  // 確認刪除主題 (軟刪除) - 優化為樂觀更新
  const confirmDeleteSubject = useCallback(async () => {
    if (!checkPlusSubscription()) {
      showUpgradeAlert();
      return;
    }

    const subjectToDelete = modalContent;
    
    // 樂觀更新：立即從UI移除
    const newSubjects = subjects.filter((s) => s !== subjectToDelete);
    setSubjects(newSubjects);
    
    if (currentSubject === subjectToDelete) {
      setCurrentSubject((prev) => {
        const next = newSubjects[0] || "";
        return next;
      });
    }
    
    // 更新本地緩存
    updateLocalCache(notes, newSubjects);

    // 關閉模態框，立即給用戶反饋
    setShowModal(false);
    setModalContent("");
    
    // 立即顯示成功訊息，提升用戶體驗
    safeAlert("主題刪除成功！");

    // 後台同步到服務器（靜默處理）
    try {
      const result = await deleteSubjectSmart(subjectToDelete);
      
      if (!result?.success) {
        // 如果失敗，回滾UI
        setSubjects((prev) => [...prev, subjectToDelete]);
        if (currentSubject === subjectToDelete) {
          setCurrentSubject(subjectToDelete);
        }
        // 靜默處理失敗，不顯示額外訊息
      }
    } catch (error) {
      // 靜默處理錯誤，不顯示額外訊息
      // 回滾UI
      setSubjects((prev) => [...prev, subjectToDelete]);
      if (currentSubject === subjectToDelete) {
        setCurrentSubject(subjectToDelete);
      }
    }
  }, [modalContent, currentSubject, subjects, checkPlusSubscription, showUpgradeAlert]);

  // 新增筆記 - 使用 useCallback 優化
  const handleAddNote = useCallback(() => {
    if (!checkPlusSubscription()) {
      showUpgradeAlert();
      return;
    }
    if (subjects.length === 0) {
      safeAlert("請先新增主題！");
      return;
    }
    setModalType("add");
    setModalContent(null);
    setModalTextContent(""); // 初始化為空字符串，格式為 "標題\n---\n內容"
    setShowModal(true);
  }, [subjects.length, checkPlusSubscription, showUpgradeAlert]);

  // 確認新增筆記 - 優化為樂觀更新
  const confirmAddNote = useCallback(async () => {
    if (!checkPlusSubscription()) {
      showUpgradeAlert();
      return;
    }

    // 從 modalTextContent 中提取標題和內容
    const parts = modalTextContent.split("\n---\n");
    const title = parts[0] || "";
    const content = parts[1] || "";

    if (!title.trim()) {
      safeAlert("請輸入筆記標題！");
      return;
    }

    if (!content.trim()) {
      safeAlert("請輸入筆記內容！");
      return;
    }

    const newNote = {
      id: Date.now() + Math.random(), // 臨時ID
      title: title.trim(),
      content: content.trim(),
      subject: currentSubject,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 樂觀更新：立即更新UI
    setNotes(prev => [...prev, newNote]);
    setShowModal(false);
    setModalContent(null);
    setModalTextContent("");
    safeAlert("筆記新增成功！");

    // 後台同步到服務器
    const result = await addNote(newNote);
    if (!result.success) {
      // 如果失敗，回滾UI
      setNotes(prev => prev.filter(n => n.id !== newNote.id));
      safeAlert(result.message || "保存失敗，請重試！");
    }
  }, [modalTextContent, currentSubject, checkPlusSubscription, showUpgradeAlert]);

  // 編輯筆記 - 使用 useCallback 優化
  const handleEditNote = useCallback((note) => {
    if (!checkPlusSubscription()) {
      showUpgradeAlert();
      return;
    }
    setModalType("edit");
    setModalContent(note);
    // 設置正確的格式：標題---內容
    setModalTextContent(`${note.title}\n---\n${note.content}`);
    setEditingNote(note);
    setShowModal(true);
  }, [checkPlusSubscription, showUpgradeAlert]);

  // 確認編輯筆記 - 優化為樂觀更新
  const confirmEditNote = useCallback(async () => {
    if (!checkPlusSubscription()) {
      showUpgradeAlert();
      return;
    }
    if (modalTextContent.trim() && editingNote) {
      // 從 modalTextContent 中提取標題和內容
      const parts = modalTextContent.split("\n---\n");
      const title = parts[0] || "";
      const content = parts[1] || "";

      if (!title.trim()) {
        safeAlert("請輸入筆記標題！");
        return;
      }

      const updatedNote = {
        ...editingNote,
        title: title.trim(),
        content: content.trim(),
        updatedAt: new Date().toISOString(),
      };

      // 樂觀更新：立即更新UI
      setNotes(prev => prev.map(n => n.id === editingNote.id ? updatedNote : n));
      setShowModal(false);
      setModalContent(null);
      setModalTextContent("");
      setEditingNote(null);
      safeAlert("筆記更新成功！");

      // 後台同步到服務器
      const result = await updateNote(editingNote.id, updatedNote);
      if (!result.success) {
        // 如果失敗，回滾UI
        setNotes(prev => prev.map(n => n.id === editingNote.id ? editingNote : n));
        safeAlert(result.message || "筆記更新失敗！");
      }
    } else {
      safeAlert("請輸入筆記內容！");
    }
  }, [modalTextContent, editingNote, checkPlusSubscription, showUpgradeAlert]);

  // 查看筆記 - 使用 useCallback 優化
  const handleViewNote = useCallback((note) => {
    if (!checkPlusSubscription()) {
      showUpgradeAlert();
      return;
    }
    setModalType("view");
    setModalContent(note);
    setModalTextContent(note.content);
    setShowModal(true);
  }, [checkPlusSubscription, showUpgradeAlert]);

  // 刪除筆記 - 優化為樂觀更新
  const handleDeleteNote = useCallback((note) => {
    if (!checkPlusSubscription()) {
      showUpgradeAlert();
      return;
    }
    safeConfirm(
      "確定要刪除這則筆記嗎？",
      async () => {
        // 樂觀更新：立即從UI移除
        setNotes(prev => prev.filter(n => n.id !== note.id));
        safeAlert("筆記刪除成功！");

        // 後台同步到服務器
        const result = await deleteNote(note.id);
        if (!result.success) {
          // 如果失敗，回滾UI
          setNotes(prev => [...prev, note]);
          safeAlert(result.message || "筆記刪除失敗！");
        }
      },
      () => {}
    );
  }, [checkPlusSubscription, showUpgradeAlert]);

  // 搬移筆記 - 使用 useCallback 優化
  const handleMoveNote = useCallback((note) => {
    if (!checkPlusSubscription()) {
      showUpgradeAlert();
      return;
    }
    setModalType("move");
    setMovingNote(note);
    // 重置選擇的主題，讓用戶重新選擇
    setSelectedMoveSubject("");
    // 重置新主題名稱
    setNewSubjectName("");
    // 確保下拉選單是關閉的
    setIsMoveDropdownOpen(false);
    setShowModal(true);
  }, [checkPlusSubscription, showUpgradeAlert]);

  // 確認搬移筆記 - 優化為樂觀更新
  const confirmMoveNote = useCallback(async () => {
    if (!checkPlusSubscription()) {
      showUpgradeAlert();
      return;
    }

    // 確定要搬移到的主題
    let targetSubject = "";
    if (selectedMoveSubject && selectedMoveSubject !== currentSubject) {
      targetSubject = selectedMoveSubject;
    } else if (newSubjectName && newSubjectName.trim() !== "") {
      targetSubject = newSubjectName.trim();
    }

    if (!targetSubject) {
      safeAlert("請選擇現有主題或輸入新主題名稱！");
      return;
    }

    if (targetSubject === currentSubject) {
      safeAlert("筆記已經在當前主題中！");
      return;
    }

    const originalNote = movingNote;
    const originalSubject = currentSubject;

    // 樂觀更新：立即更新UI
    setNotes(prev => prev.map(n => 
      n.id === movingNote.id 
        ? { ...n, subject: targetSubject }
        : n
    ));
    setShowModal(false);
    setMovingNote(null);
    setSelectedMoveSubject("");
    setNewSubjectName("");
    safeAlert("筆記搬移成功！");

    // 後台同步到服務器
    try {
      // 如果是新主題，先創建主題
      if (newSubjectName && newSubjectName.trim() !== "") {
        const createSubjectResult = await addSubject(targetSubject);
        if (!createSubjectResult.success) {
          throw new Error(createSubjectResult.message);
        }
      }

      // 調用 moveNote 函數
      const result = await moveNote(movingNote.id, targetSubject);
      if (!result.success) {
        throw new Error(result.message);
      }
    } catch (error) {
      // 如果失敗，回滾UI
      setNotes(prev => prev.map(n => 
        n.id === originalNote.id 
          ? { ...n, subject: originalSubject }
          : n
      ));
      safeAlert(`搬移失敗：${error.message}`);
    }
  }, [selectedMoveSubject, newSubjectName, currentSubject, movingNote, checkPlusSubscription, showUpgradeAlert]);

  // 生成題目 - 使用 useCallback 優化
  const handleGenerateQuestions = useCallback(async (note) => {
    if (!checkPlusSubscription()) {
      showUpgradeAlert();
      return;
    }

    try {
      // 顯示生成中的提示
      safeAlert("正在分析筆記內容，完成後將跳轉到遊戲頁面...");
      
      // 調用AI生成主題（傳遞筆記內容和標題）
      const result = await generateQuestions(note.content, note.title);
      
      if (result.success && result.topic) {
        // 將生成的主題存儲到sessionStorage，供homegame頁面使用
        sessionStorage.setItem("generatedTopic", result.topic);
        sessionStorage.setItem("generatedTopicSource", "note");
        sessionStorage.setItem("generatedTopicNoteId", note.id);
        
        // 直接跳轉到homegame頁面
        window.location.href = "/homegame";
        
      } else {
        safeAlert(`❌ 生成主題失敗：${result.message}`);
      }
      
    } catch (error) {
      safeAlert("❌ 生成主題失敗，請稍後再試");
    }
  }, [checkPlusSubscription, showUpgradeAlert]);

  // 切換動作欄 - 使用 useCallback 優化
  const toggleActionBar = useCallback((noteId) => {
    setActiveActionBar(activeActionBar === noteId ? null : noteId);
  }, [activeActionBar]);

  // 關閉所有動作欄 - 使用 useCallback 優化
  const closeAllActionBars = useCallback(() => {
    setActiveActionBar(null);
  }, []);

  // 關閉模態框 - 使用 useCallback 優化
  const closeModal = useCallback(() => {
    setShowModal(false);
    setModalContent(null);
    setModalTextContent("");
    setModalType("");
    setEditingNote(null);
    setMovingNote(null);
    setSelectedMoveSubject("");
    setNewSubjectName("");
  }, []);

  // 鍵盤事件處理
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMenu();
        closeAllActionBars();
        if (showModal) {
          closeModal();
        }
        setIsDropdownOpen(false);
        setIsMoveDropdownOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showModal]);

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event) => {
      // 檢查是否點擊了下拉選單容器或其子元素
      const dropdownContainer = event.target.closest(
        "[data-dropdown-container]"
      );
      if (!dropdownContainer) {
        setIsDropdownOpen(false);
      }

      // 檢查是否點擊了搬移下拉選單容器或其子元素
      const moveDropdownContainer = event.target.closest(
        "[data-move-dropdown-container]"
      );
      if (!moveDropdownContainer) {
        setIsMoveDropdownOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // 渲染模態框
  const renderModal = () => {
    if (!showModal) return null;

    return (
      <div className={styles.modal} onClick={closeModal}>
        <div
          className={styles.modalContent}
          onClick={(e) => e.stopPropagation()}
        >
          {modalType === "add" && (
            <>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>新增筆記</h2>
                <button className={styles.modalClose} onClick={closeModal}>
                  &times;
                </button>
              </div>
              <div className={styles.modalBody}>
                <div style={{ marginBottom: "15px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "5px",
                      fontWeight: "600",
                      color: "#333",
                    }}
                  >
                    筆記名稱：
                  </label>
                  <input
                    type="text"
                    placeholder="請輸入筆記名稱"
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      fontSize: "16px",
                      boxSizing: "border-box",
                    }}
                    value={
                      modalTextContent
                        ? modalTextContent.split("\n---\n")[0] || ""
                        : ""
                    }
                    onChange={(e) => {
                      const parts = modalTextContent.split("\n---\n");
                      const content = parts[1] || "";
                      setModalTextContent(`${e.target.value}\n---\n${content}`);
                    }}
                  />
                </div>
                <div style={{ marginBottom: "15px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "5px",
                      fontWeight: "600",
                      color: "#333",
                    }}
                  >
                    筆記內容：
                  </label>
                  <p
                    style={{
                      marginBottom: "10px",
                      color: "#666",
                      fontSize: "14px",
                    }}
                  >
                    支援 Markdown 語法
                  </p>
                  <textarea
                    className={styles.modalTextarea}
                    placeholder={
                      "請輸入筆記內容...\n範例格式：\n- 粗體：**文字**\n- 斜體：*文字*\n- 標題：# ## ###\n- 列表：- 項目\n- 程式碼：`code`\n- 分隔線：---"
                    }
                    value={
                      modalTextContent
                        ? modalTextContent.split("\n---\n")[1] || ""
                        : ""
                    }
                    onChange={(e) => {
                      const parts = modalTextContent.split("\n---\n");
                      const title = parts[0] || "";
                      setModalTextContent(`${title}\n---\n${e.target.value}`);
                    }}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  className={`${styles.modalBtn} ${styles.modalBtnSecondary}`}
                  onClick={closeModal}
                >
                  取消
                </button>
                <button
                  className={`${styles.modalBtn} ${styles.modalBtnPrimary}`}
                  onClick={confirmAddNote}
                >
                  儲存筆記
                </button>
              </div>
            </>
          )}

          {modalType === "edit" && (
            <>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>編輯筆記</h2>
                <button className={styles.modalClose} onClick={closeModal}>
                  &times;
                </button>
              </div>
              <div className={styles.modalBody}>
                <div style={{ marginBottom: "15px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "5px",
                      fontWeight: "600",
                      color: "#333",
                    }}
                  >
                    筆記名稱：
                  </label>
                  <input
                    type="text"
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      fontSize: "16px",
                      boxSizing: "border-box",
                    }}
                    value={modalTextContent.split("\n---\n")[0] || ""}
                    onChange={(e) => {
                      const [_, content] = modalTextContent.split("\n---\n");
                      setModalTextContent(
                        `${e.target.value}\n---\n${content || ""}`
                      );
                    }}
                  />
                </div>
                <div style={{ marginBottom: "15px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "5px",
                      fontWeight: "600",
                      color: "#333",
                    }}
                  >
                    筆記內容：
                  </label>
                  <p
                    style={{
                      marginBottom: "10px",
                      color: "#666",
                      fontSize: "14px",
                    }}
                  >
                    支援 Markdown 語法
                  </p>
                  <textarea
                    className={styles.modalTextarea}
                    value={modalTextContent.split("\n---\n")[1] || ""}
                    onChange={(e) => {
                      const [title] = modalTextContent.split("\n---\n");
                      setModalTextContent(
                        `${title || ""}\n---\n${e.target.value}`
                      );
                    }}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  className={`${styles.modalBtn} ${styles.modalBtnSecondary}`}
                  onClick={closeModal}
                >
                  取消
                </button>
                <button
                  className={`${styles.modalBtn} ${styles.modalBtnPrimary}`}
                  onClick={confirmEditNote}
                >
                  儲存修改
                </button>
              </div>
            </>
          )}

          {modalType === "view" && (
            <>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>查看筆記</h2>
                <button className={styles.modalClose} onClick={closeModal}>
                  &times;
                </button>
              </div>
              <div className={styles.modalBody}>
                <div style={{ marginBottom: "20px" }}>
                  <p>
                    <strong>{modalContent ? modalContent.title : ""}</strong>
                  </p>
                </div>
                <div
                  style={{
                    background: "#f8f9fa",
                    padding: "20px",
                    borderRadius: "8px",
                    lineHeight: "1.6",
                  }}
                  dangerouslySetInnerHTML={{
                    __html: parseMarkdown(
                      cleanTextContent(modalContent ? modalContent.content : "")
                    ),
                  }}
                ></div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  className={`${styles.modalBtn} ${styles.modalBtnPrimary}`}
                  onClick={closeModal}
                >
                  關閉
                </button>
              </div>
            </>
          )}

          {modalType === "move" && (
            <>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>搬移筆記</h2>
                <button className={styles.modalClose} onClick={closeModal}>
                  &times;
                </button>
              </div>
              <div className={styles.modalBody}>
                <p style={{ marginBottom: "15px" }}>選擇要搬移到的主題：</p>
                <div
                  className={styles.moveCustomSelectContainer}
                  data-move-dropdown-container
                  style={{ marginBottom: "15px" }}
                >
                  <div
                    className={styles.moveCustomSelect}
                    onClick={() => setIsMoveDropdownOpen(!isMoveDropdownOpen)}
                  >
                    <span>{selectedMoveSubject || "請選擇主題"}</span>
                    <Image
                      src="/img/Vector-17.png"
                      alt="Arrow"
                      width={16}
                      height={16}
                    />
                  </div>
                  {isMoveDropdownOpen && (
                    <div className={styles.moveCustomDropdown}>
                      {subjects.length === 0 ? (
                        <div
                          style={{
                            padding: "10px",
                            color: "#666",
                            textAlign: "center",
                          }}
                        >
                          暫無其他主題，請輸入新主題名稱
                        </div>
                      ) : (
                        subjects
                          .filter((subject) => subject !== currentSubject)
                          .map((subject) => (
                            <button
                              key={subject}
                              className={`${styles.moveDropdownOption} ${
                                subject === selectedMoveSubject
                                  ? styles.selected
                                  : ""
                              }`}
                              onClick={() => {
                                setSelectedMoveSubject(subject);
                                setIsMoveDropdownOpen(false);
                                // 清空新主題名稱，因為選擇了現有主題
                                setNewSubjectName("");
                              }}
                            >
                              <span className={styles.moveOptionText}>
                                {subject}
                              </span>
                            </button>
                          ))
                      )}
                    </div>
                  )}
                </div>
                <p style={{ color: "#666", fontSize: "14px" }}>
                  或輸入新主題名稱：
                </p>
                <input
                  type="text"
                  placeholder="輸入新主題名稱"
                  style={{
                    width: "100%",
                    padding: "15px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "16px",
                  }}
                  value={newSubjectName}
                  onChange={(e) => {
                    setNewSubjectName(e.target.value);
                    // 清空現有主題選擇，因為輸入了新主題
                    setSelectedMoveSubject("");
                  }}
                />
              </div>
              <div className={styles.modalFooter}>
                <button
                  className={`${styles.modalBtn} ${styles.modalBtnSecondary}`}
                  onClick={closeModal}
                >
                  取消
                </button>
                <button
                  className={`${styles.modalBtn} ${styles.modalBtnPrimary}`}
                  onClick={confirmMoveNote}
                >
                  確認搬移
                </button>
              </div>
            </>
          )}

          {modalType === "addSubject" && (
            <>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>新增主題</h2>
                <button className={styles.modalClose} onClick={closeModal}>
                  &times;
                </button>
              </div>
              <div className={styles.modalBody}>
                <p style={{ marginBottom: "15px" }}>請輸入新主題名稱：</p>
                <input
                  type="text"
                  placeholder="例如：程式設計、英文、歷史..."
                  style={{
                    width: "100%",
                    padding: "15px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "16px",
                  }}
                  value={modalContent || ""}
                  onChange={(e) => setModalContent(e.target.value)}
                />
              </div>
              <div className={styles.modalFooter}>
                <button
                  className={`${styles.modalBtn} ${styles.modalBtnSecondary}`}
                  onClick={closeModal}
                >
                  取消
                </button>
                <button
                  className={`${styles.modalBtn} ${styles.modalBtnPrimary}`}
                  onClick={confirmAddSubject}
                >
                  新增主題
                </button>
              </div>
            </>
          )}

          {modalType === "deleteSubject" && (
            <>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>刪除主題</h2>
                <button className={styles.modalClose} onClick={closeModal}>
                  &times;
                </button>
              </div>
              <div className={styles.modalBody}>
                <p style={{ marginBottom: "15px", color: "#d32f2f" }}>
                  確定要刪除主題「{modalContent}」嗎？
                </p>
                <p style={{ marginBottom: "15px", color: "#d32f2f" }}>
                  此操作會刪除該主題的所有筆記，且無法復原！
                </p>
              </div>
              <div className={styles.modalFooter}>
                <button
                  className={`${styles.modalBtn} ${styles.modalBtnSecondary}`}
                  onClick={closeModal}
                >
                  取消
                </button>
                <button
                  className={`${styles.modalBtn} ${styles.modalBtnPrimary}`}
                  onClick={confirmDeleteSubject}
                  style={{ background: "#d32f2f", color: "white" }}
                >
                  確認刪除
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 頭部 */}
      <Header
        showMenu={true}
        isMenuOpen={isMenuOpen}
        onToggleMenu={toggleMenu}
        enableNoteQLink={true}
      />

      {/* 主要內容 */}
      <main className={styles.mainContent}>
        <div className={styles.filterContainer}>
          <label className={styles.filterLabel}>選擇主題</label>
          <div className={styles.filterRow}>
            <div className={styles.selectWrapper}>
              <div
                className={styles.customSelectContainer}
                data-dropdown-container
              >
                <div className={styles.customSelect} onClick={toggleDropdown}>
                  <span>{currentSubject || "新增主題"}</span>
                </div>
                <Image
                  src="/img/Vector-17.png"
                  className={styles.selectArrow}
                  alt="Arrow"
                  width={16}
                  height={16}
                />
                <div
                  className={`${styles.customDropdown} ${
                    isDropdownOpen ? styles.active : ""
                  }`}
                >
                  {subjects.length === 0 ? (
                    <button
                      className={styles.customDropdownOption}
                      onClick={handleAddSubject}
                    >
                      <span className={styles.optionText}>新增主題</span>
                    </button>
                  ) : (
                    <>
                      {subjects.map((subject) => (
                        <div
                          key={subject}
                          className={`${styles.customDropdownOption} ${
                            subject === currentSubject ? styles.selected : ""
                          }`}
                        >
                          <span
                            className={styles.optionText}
                            onClick={() => selectSubject(subject)}
                            style={{ cursor: "pointer" }}
                          >
                            {subject}
                          </span>
                          <button
                            className={styles.deleteOptionBtn}
                            onClick={(e) => handleDeleteSubject(subject, e)}
                          >
                            <Image
                              src="/img/Vector-25.png"
                              alt="刪除"
                              width={16}
                              height={16}
                            />
                          </button>
                        </div>
                      ))}
                      <div
                        style={{
                          height: "1px",
                          backgroundColor: "rgba(255, 255, 255, 0.2)",
                          margin: "8px 16px",
                        }}
                      ></div>
                      <button
                        className={styles.customDropdownOption}
                        onClick={handleAddSubject}
                      >
                        <span className={styles.optionText}>新增主題</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              className={styles.addNoteButton}
              onClick={handleAddNote}
              // 確保服務器端和客戶端渲染一致
              disabled={!isClient || isPlusSubscribed === false}
            >
              新增筆記
            </button>
          </div>
        </div>

        <div className={styles.notesGrid}>
          {!isClient ? (
            // 服務器端渲染時顯示載入狀態，避免水合不匹配
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Image
                  src="/img/folder2.gif"
                  alt="載入中"
                  width={64}
                  height={64}
                />
              </div>
              <h3>載入中...</h3>
              <p>正在載入您的筆記和主題...</p>
            </div>
          ) : isPlusSubscribed === null ? (
            // 客戶端初始化中，顯示載入狀態
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Image
                  src="/img/folder2.gif"
                  alt="載入中"
                  width={64}
                  height={64}
                />
              </div>
              <h3>載入中...</h3>
              <p>正在檢查您的訂閱狀態...</p>
            </div>
          ) : isPlusSubscribed === false ? (
            <div className={styles.upgradeState}>
              <div className={styles.upgradeIcon}>
                <Image
                  src="/img/Vector-41.png"
                  alt="升級"
                  width={64}
                  height={64}
                />
              </div>
              <h3>升級Plus方案</h3>
              <p>筆記功能僅限Plus用戶使用，請升級到Plus方案！</p>
              <button
                className={styles.upgradeButton}
                onClick={() => (window.location.href = "/user")}
              >
                立即升級
              </button>
            </div>
          ) : subjects.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Image
                  src="/img/folder2.gif"
                  alt="主題"
                  width={64}
                  height={64}
                />
              </div>
              <h3>還沒有主題</h3>
              <p>點擊「新增主題」開始創建你的學習主題吧！</p>
            </div>
          ) : currentSubjectNotes.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Image
                  src="/img/folder2.gif"
                  alt="筆記"
                  width={64}
                  height={64}
                />
              </div>
              <h3>還沒有筆記</h3>
              <p>點擊「新增筆記」開始記錄你的學習筆記吧！</p>
            </div>
          ) : (
            currentSubjectNotes.map(renderNoteCard)
          )}
        </div>
      </main>

      {/* 選單 */}
      <Menu isOpen={isMenuOpen} onClose={closeMenu} onLogout={safeLogout} />

      {/* 動作背景 */}
      <div
        className={`${styles.actionBackdrop} ${
          activeActionBar ? styles.active : ""
        }`}
        onClick={closeAllActionBars}
      />

      {/* 模態框 */}
      {renderModal()}
    </>
  );
}

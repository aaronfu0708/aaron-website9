"use client";

import { useRouter } from "next/navigation";
import { API_ENDPOINTS } from "../utils/apiConfig";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "../styles/HomeGamePage.module.css";
import { safeAlert, safeConfirm } from "../utils/dialogs";
import Header from "../components/Header";
import { safeLogout } from "../utils/auth";
import Menu from "../components/Menu";
import DecryptedText from "../components/DecryptedText";
import TargetCursor from "../components/TargetCursor";

export default function HomeGamePage() {
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDecryption, setShowDecryption] = useState(false);
  const [decryptionStep, setDecryptionStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // 新增：防抖狀態，防止漢堡選單重複點擊
  const [isMenuTransitioning, setIsMenuTransitioning] = useState(false);

  // 初始化路由器
  const router = useRouter();

  // 檢查是否從筆記頁面跳轉過來，並自動填入生成的主題
  useEffect(() => {
    const generatedTopic = sessionStorage.getItem("generatedTopic");
    const generatedTopicSource = sessionStorage.getItem("generatedTopicSource");
    
    if (generatedTopic && generatedTopicSource === "note") {
      // 自動填入AI生成的主題
      setTopic(generatedTopic);
      
      // 清除sessionStorage中的臨時數據
      sessionStorage.removeItem("generatedTopic");
      sessionStorage.removeItem("generatedTopicSource");
      sessionStorage.removeItem("generatedTopicNoteId");
      
      // 自動選擇一個難度（預設為intermediate）
      setSelectedDifficulty("intermediate");
      
      // 自動填入題數（預設為5題）
      setQuestionCount("5");
    }
  }, []);

  // 難度選項配置
  const difficultyOptions = [
    {
      id: "test",
      name: "測驗",
      icon: "/img/Vector-5.png",
      className: "difficultyTest",
    },
    {
      id: "master",
      name: "大師",
      icon: "/img/Vector-4.png",
      className: "difficultyMaster",
    },
    {
      id: "beginner",
      name: "初級",
      icon: "/img/Vector.png",
      className: "difficultyBeginner",
    },
    {
      id: "intermediate",
      name: "中級",
      icon: "/img/Vector-2.png",
      className: "difficultyIntermediate",
    },
    {
      id: "advanced",
      name: "高級",
      icon: "/img/Vector-3.png",
      className: "difficultyAdvanced",
    },
  ];

  // 選擇難度
  const selectDifficulty = (difficultyId) => {
    setSelectedDifficulty(difficultyId);
  };

  // 切換選單
  const toggleMenu = useCallback(() => {
    // 防止重複點擊和過渡期間的點擊
    if (isMenuTransitioning) {
      return;
    }
    
    setIsMenuTransitioning(true);
    
    if (!isMenuOpen) {
      setIsMenuOpen(true);
      document.body.style.overflow = "hidden";
    } else {
      setIsMenuOpen(false);
      document.body.style.overflow = "auto";
    }
    
    // 300ms後重置防抖狀態（與CSS過渡時間一致）
    setTimeout(() => {
      setIsMenuTransitioning(false);
    }, 300);
  }, [isMenuOpen, isMenuTransitioning]);

  // 關閉選單
  const closeMenu = useCallback(() => {
    // 防止重複點擊和過渡期間的點擊
    if (isMenuTransitioning) {
      return;
    }
    
    setIsMenuTransitioning(true);
    
    setIsMenuOpen(false);
    document.body.style.overflow = "auto";
    
    // 300ms後重置防抖狀態（與CSS過渡時間一致）
    setTimeout(() => {
      setIsMenuTransitioning(false);
    }, 300);
  }, [isMenuTransitioning]);

  // 開始挑戰
  const startChallenge = async () => {
    const validDifficulties = ["advanced", "intermediate"];

    if (!selectedDifficulty) {
      safeAlert("請選擇難度");
      return;
    }

    if (!topic.trim()) {
      safeAlert("請輸入主題");
      return;
    }

    const count = parseInt(questionCount, 10);
    if (!count || count < 1 || count > 15) {
      safeAlert("請輸入有效的題數（1~15 題）");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      safeAlert("請先登入再開始挑戰");
      return;
    }

    // 開始解密動畫和生題同時進行
    setShowDecryption(true);
    setIsGenerating(true);
    setDecryptionStep(0);
    
    // 立即開始生題
    generateQuestions();
  };

  // 解密動畫步驟控制
  const handleDecryptionComplete = () => {
    // 在生題進行中，動畫持續循環前3步
    if (isGenerating && decryptionStep < 3) {
      setDecryptionStep(prev => prev + 1);
    } else if (isGenerating && decryptionStep === 3) {
      // 循環回到第0步
      setDecryptionStep(0);
    }
    // 第4步（完成文字）由生題完成後手動設置，不自動推進
  };

  // 生成題目
  const generateQuestions = async () => {
    try {
      const token = localStorage.getItem("token");
      
      // 樂觀更新：立即將主題添加到本地狀態，讓用戶立即看到
      const newTopic = topic.trim();
      
      // 第一步：先創建Quiz主題（如果不存在）
      let quizTopicId = null;
      try {
        const createQuizRes = await fetch(API_ENDPOINTS.BACKEND.CREATE_QUIZ, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            quiz_topic: newTopic 
          }),
        });

        if (createQuizRes.ok) {
          const createResult = await createQuizRes.json();
          quizTopicId = createResult.quiz_topic_id;
          
          // 樂觀更新：立即將新主題添加到本地筆記系統
          // 這裡可以觸發一個全局事件，通知筆記頁面更新主題列表
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            const event = new CustomEvent('topicCreated', {
              detail: { topic: newTopic, id: quizTopicId }
            });
            window.dispatchEvent(event);
          }
          
        } else if (createQuizRes.status === 400) {
          // 主題已存在，獲取現有主題ID
          const subjectsRes = await fetch(API_ENDPOINTS.BACKEND.USER_QUIZ_AND_NOTES, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
          
          if (subjectsRes.ok) {
            const subjectsData = await subjectsRes.json();
            const topics = Array.isArray(subjectsData?.favorite_quiz_topics) ? subjectsData.favorite_quiz_topics : [];
            const existingTopic = topics.find(t => t?.quiz_topic === newTopic);
            if (existingTopic) {
              quizTopicId = existingTopic.id;
            }
          }
        }
      } catch (error) {
        console.warn("創建Quiz主題時出錯:", error);
        // 繼續執行，不阻止題目生成
      }

      // 第二步：生成題目
      const res = await fetch(API_ENDPOINTS.BACKEND.QUIZ, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: localStorage.getItem("userId"),
          topic: newTopic,
          difficulty: selectedDifficulty,
          question_count: parseInt(questionCount, 10),
        }),
      });

      const result = await res.json();
      
      // 將主題信息也存儲到 sessionStorage，供筆記頁面使用
      sessionStorage.setItem(
        "quizData",
        JSON.stringify({
          quiz: result.quiz, // 單題形式
          topics: result.topics || [], // 多題陣列形式
          question_count: parseInt(questionCount, 10), // 設定題數
          created_topic: newTopic, // 新增：記錄創建的主題
          topic_id: quizTopicId, // 新增：記錄主題ID
        })
      );
      
      // 確保資料已存儲到sessionStorage
      const storedData = sessionStorage.getItem("quizData");
      if (!storedData) {
        setShowDecryption(false);
        setIsGenerating(false);
        return;
      }
      
      // 生題完成，顯示完成文字
      setDecryptionStep(4);
      
      // 等待1.5秒後跳轉
      setTimeout(() => {
        setShowDecryption(false);
        setIsGenerating(false);
        // 再次確認資料存在後跳轉
        if (sessionStorage.getItem("quizData")) {
          router.push("/game");
        }
      }, 1500);
      
    } catch (err) {
      safeAlert("題目發送失敗，請稍後再試");
      setShowDecryption(false);
      setIsGenerating(false);
    }
  };

  // 鍵盤事件處理
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu]);

  // 防止雙擊縮放
  useEffect(() => {
    const handleTouchStart = (event) => {
      const target = event.target;
      const isInteractiveElement =
        target.tagName === "BUTTON" ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.closest(".custom-select") ||
        target.closest(".menu-button") ||
        target.closest(".action-item");

      if (isInteractiveElement && event.touches.length > 1) {
        event.preventDefault();
      }
    };

    document.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
    };
  }, []);

  return (
    <>
      {/* TargetCursor 漢堡關閉時顯示*/}
      {!isMenuOpen && (
        <TargetCursor 
          spinDuration={2}
          hideDefaultCursor={true}
        />
      )}

      {/* 頭部 */}
      <Header
        showMenu={true}
        isMenuOpen={isMenuOpen}
        onToggleMenu={toggleMenu}
        enableNoteQLink={true}
      />

      {/* 主要內容 */}
      <main id="game-select" className={styles.gameSelectSection}>
        <div className={styles.pageContainer}>
                      <input
              type="text"
              className={`${styles.topicInput} cursor-target`}
              placeholder="輸入主題"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />

          <div className={styles.difficultyHub}>
            <Image
              src="/img/Vector-19.png"
              alt="Hub outline"
              className={styles.hubOutline}
              width={600}
              height={500}
              priority={true}
            />
            <h2 className={styles.hubTitle}>難度選擇</h2>

            {difficultyOptions.map((option) => (
              <button
                key={option.id}
                className={`${styles.difficultyButton} ${
                  styles[option.className]
                } ${selectedDifficulty === option.id ? styles.selected : ""} cursor-target`}
                onClick={() => selectDifficulty(option.id)}
              >
                <Image
                  src={option.icon}
                  alt={option.name}
                  width={24}
                  height={24}
                />
                <span>{option.name}</span>
              </button>
            ))}
          </div>

          <div className={styles.challengeStartForm}>
            <input
              type="number"
              className={`${styles.questionCountInput} cursor-target`}
              placeholder="輸入題數"
              min="1"
              max="50"
              value={questionCount}
              onChange={(e) => setQuestionCount(e.target.value)}
            />
            <button className={`${styles.startButton} cursor-target`} onClick={startChallenge}>
              <span>開始挑戰&nbsp;</span>
              <Image
                src="/img/Vector-12.png"
                alt="Arrow right"
                width={12}
                height={12}
              />
            </button>
          </div>
        </div>
      </main>

      {/* 解密動畫覆蓋層 */}
      {showDecryption && (
        <div className={styles.decryptionOverlay}>
          <div className={styles.decryptionContainer}>
            <DecryptedText
              text={
                decryptionStep === 0 ? "正在初始化題目生成系統..." :
                decryptionStep === 1 ? "正在分析難度等級和主題內容..." :
                decryptionStep === 2 ? "正在生成個性化題目，請稍候..." :
                decryptionStep === 3 ? "正在優化題目內容..." :
                decryptionStep === 4 ? "題目生成完成！準備開始..." :
                ""
              }
              onComplete={handleDecryptionComplete}
              speed={80}
              className={styles.decryptionText}
              key="decryption-text" 
            />
          </div>
        </div>
      )}

      {/* 選單 */}
      <Menu isOpen={isMenuOpen} onClose={closeMenu} onLogout={safeLogout} />
    </>
  );
}

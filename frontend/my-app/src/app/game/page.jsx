"use client";

import { useEffect, useState, useCallback } from "react";
import { API_ENDPOINTS } from "../utils/apiConfig";
import Image from "next/image";
import styles from "../styles/GamePage.module.css";
import Header from "../components/Header";
import Menu from "../components/Menu";
import DecryptedText from "../components/DecryptedText";
import { safeLogout } from "../utils/auth";

export default function GamePage() {
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showCompleteButton, setShowCompleteButton] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(1);
  const [quizData, setQuizData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOptionDisabled, setIsOptionDisabled] = useState(false); // 防連點狀態
  const [isSubmitting, setIsSubmitting] = useState(false); // 防重複提交狀態
  
  // 解密動畫相關狀態
  const [showDecryption, setShowDecryption] = useState(false);
  const [decryptionStep, setDecryptionStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // 新增：防抖狀態，防止漢堡選單重複點擊
  const [isMenuTransitioning, setIsMenuTransitioning] = useState(false);

  // 初始化資料
  useEffect(() => {
    const data = sessionStorage.getItem("quizData");
    if (data) {
      try {
        const parsed = JSON.parse(data);
        setQuizData(parsed.quiz || {});
        setQuestions(parsed.topics || []);
        setTotalQuestions(parsed.question_count || 1);
      } catch (err) {
        console.error("解析 quizData 失敗：", err);
      }
    } else {
      window.location.href = "/";
    }
  }, []);

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

  const handleOptionClick = (index) => {
    if (isOptionDisabled) return;

    const currentTopic = questions[currentQuestion - 1];
    if (!currentTopic) return;

    const optionLetter = ["A", "B", "C", "D"][index];

    setIsOptionDisabled(true);

    setUserAnswers((prev) => {
      const filtered = prev.filter((ans) => ans.topicId !== currentTopic.id);
      return [
        ...filtered,
        { topicId: currentTopic.id, selected: optionLetter },
      ];
    });

    setSelectedOption(index);

    if (currentQuestion === totalQuestions) {
      // 最後一題選完後才顯示完成按鈕，且不跳題
      setShowCompleteButton(true);
      setIsOptionDisabled(false);
      return;
    }

    setTimeout(() => {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedOption(null);
      setIsOptionDisabled(false);
    }, 300);
  };

  // 解密動畫步驟控制
  const handleDecryptionComplete = () => {
    // 在處理進行中，動畫持續循環前3步
    if (isProcessing && decryptionStep < 3) {
      setDecryptionStep(prev => prev + 1);
    } else if (isProcessing && decryptionStep === 3) {
      // 循環回到第0步
      setDecryptionStep(0);
    }
    // 第4步（完成文字）由處理完成後手動設置，不自動推進
  };

  const handleCompleteChallenge = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    // 開始解密動畫和處理同時進行
    setShowDecryption(true);
    setIsProcessing(true);
    setDecryptionStep(0);
    
    // 立即開始處理答案
    processAnswers();
  };

  // 處理答案提交
  const processAnswers = async () => {
    try {
      // 驗證 userAnswers 數據
      if (!userAnswers || userAnswers.length === 0) {
        console.error("userAnswers 為空或未定義");
        safeAlert("沒有答案數據，請重新答題");
        setShowDecryption(false);
        setIsProcessing(false);
        return;
      }
      
      // 組成後端需要的資料格式
      const payload = {
        updates: userAnswers.map(({ topicId, selected }) => ({
          id: topicId,
          user_answer: selected,
        })),
      };

      const token = localStorage.getItem("token");

      // POST 到後端
      const res = await fetch(API_ENDPOINTS.BACKEND.SUBMIT_ANSWER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // 附上 token
        },
        body: JSON.stringify(payload),
      });

      // 改善錯誤處理，提供更詳細的錯誤信息
      if (!res.ok) {
        const errorText = await res.text();
        console.error("=== 提交答案失敗 ===");
        console.error("狀態碼:", res.status);
        console.error("狀態文字:", res.statusText);
        console.error("回應標頭:", Object.fromEntries(res.headers.entries()));
        console.error("回應內容:", errorText);
        console.error("=====================");
        
        // 根據不同狀態碼提供具體的錯誤信息
        let errorMessage = "提交答案失敗";
        if (res.status === 401) {
          errorMessage = "認證失敗，請重新登入";
        } else if (res.status === 400) {
          errorMessage = "請求格式錯誤";
        } else if (res.status === 500) {
          errorMessage = "伺服器內部錯誤";
        } else if (res.status === 503) {
          errorMessage = "服務暫時不可用";
        }
        
        console.warn(`API調用失敗 (${res.status}): ${errorMessage}`);
        
        // 不阻止流程繼續，設置默認值
        console.warn("使用默認值繼續執行");
      }
      
      // 獲取熟悉度（即使API失敗也設置默認值）
      let Familiarity = 0;
      try {
        if (res.ok) {
          const data = await res.json();
          Familiarity = data.familiarity || 0;
        } else {
          console.warn("API失敗，使用默認熟悉度值: 0");
        }
      } catch (parseError) {
        console.warn("解析API回應失敗，使用默認值:", parseError);
        Familiarity = 0;
      }
      
      sessionStorage.setItem("familiarity", Familiarity);
      
      // 處理完成，顯示完成文字
      setDecryptionStep(4);
      
      // 等待1.5秒後跳轉
      setTimeout(() => {
        setShowDecryption(false);
        setIsProcessing(false);
        // 寫入 sessionStorage 並導向 /gameover
        sessionStorage.setItem("userAnswers", JSON.stringify(userAnswers));
        window.location.href = "/gameover";
      }, 1500);
      
    } catch (err) {
      console.error("提交答案發生錯誤：", err);
      setShowDecryption(false);
      setIsProcessing(false);
    }
  };

  const options = questions.length
    ? [
        `A ${questions[currentQuestion - 1]?.option_A}`,
        `B ${questions[currentQuestion - 1]?.option_B}`,
        `C ${questions[currentQuestion - 1]?.option_C}`,
        `D ${questions[currentQuestion - 1]?.option_D}`,
      ]
    : [];

  const progressPercent = (currentQuestion / totalQuestions) * 100;

  return (
    <>
      <Header
        showMenu={true}
        isMenuOpen={isMenuOpen}
        onToggleMenu={toggleMenu}
        enableNoteQLink={true}
      />
      <Menu isOpen={isMenuOpen} onClose={closeMenu} onLogout={safeLogout} />

      <main className={styles.gameMain}>
        <div className={styles.questionContainer}>
          <h2 className={styles.questionNumber}>
            第 {currentQuestion} 題 / {totalQuestions} 題
          </h2>

          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          <p className={styles.questionText}>
            {questions[currentQuestion - 1]?.title || "題目載入中..."}
          </p>

          <div className={styles.gameSection}>
            {currentQuestion > 1 && (
              <div
                className={styles.backButton}
                onClick={() => {
                  setCurrentQuestion((prev) => prev - 1);
                  setSelectedOption(null);
                }}
              >
                <Image
                  src="/img/Vector-9.png"
                  alt="Back"
                  width={14}
                  height={14}
                />
                <span className={styles.backText}>回上一題</span>
              </div>
            )}

            <div className={styles.answerGrid}>
              {options.map((option, index) => (
                <div
                  key={index}
                  className={`${styles.answerOption} ${
                    selectedOption === index ? styles.selected : ""
                  }`}
                  onClick={() => handleOptionClick(index)}
                  style={{ pointerEvents: isOptionDisabled ? "none" : "auto" }} // 點擊禁用
                >
                  {option}
                </div>
              ))}
            </div>

            {currentQuestion === totalQuestions && showCompleteButton && (
              <div className={styles.completeButtonContainer}>
                <button
                  className={styles.completeButton}
                  onClick={handleCompleteChallenge}
                >
                  完成挑戰
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 解密動畫覆蓋層 */}
      {showDecryption && (
        <div className={styles.decryptionOverlay}>
          <div className={styles.decryptionContainer}>
            <DecryptedText
              text={
                decryptionStep === 0 ? "正在整理您的答題記錄..." :
                decryptionStep === 1 ? "正在分析答題結果..." :
                decryptionStep === 2 ? "正在載入 AI 解析系統..." :
                decryptionStep === 3 ? "正在優化解析系統..." :
                decryptionStep === 4 ? "準備完成！查看您的挑戰結果..." :
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
    </>
  );
};

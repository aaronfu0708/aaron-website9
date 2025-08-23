"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Header from "../components/Header";
import Menu from "../components/Menu";
import ResultsCard from "../components/GameOver/ResultsCard";
import QuestionsGrid from "../components/GameOver/QuestionsGrid";
import AnalysisOverlay from "../components/GameOver/AnalysisOverlay";
import FavoriteModal from "../components/GameOver/FavoriteModal";
import AnalysisFavoriteModal from "../components/GameOver/AnalysisFavoriteModal";
import AnalysisFullFavoriteModal from "../components/GameOver/AnalysisFullFavoriteModal";
import CustomAlertModal from "../components/GameOver/CustomAlertModal";
import CustomPromptModal from "../components/GameOver/CustomPromptModal";
import { useGameoverUtils } from "./hooks/useGameoverUtils";
import styles from "../styles/GameOverPage.module.css";
import { safeLogout } from "../utils/auth";

export default function GameOverPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isFavoriteModalOpen, setIsFavoriteModalOpen] = useState(false);
  const [isAnalysisFavoriteModalOpen, setIsAnalysisFavoriteModalOpen] =
    useState(false);
  const [isAnalysisFullFavoriteModalOpen, setIsAnalysisFullFavoriteModalOpen] =
    useState(false);
  const [isCustomAlertOpen, setIsCustomAlertOpen] = useState(false);
  const [isCustomPromptOpen, setIsCustomPromptOpen] = useState(false);
  const [customAlertMessage, setCustomAlertMessage] = useState("");
  const [customPromptTitle, setCustomPromptTitle] = useState("");
  const [customPromptCallback, setCustomPromptCallback] = useState(null);
  const [currentQuestionData, setCurrentQuestionData] = useState(null);
  // gameover 資料狀態
  const [quizMeta, setQuizMeta] = useState(null); // 測驗基本資訊（quiz.id / quiz_topic / created_at...）
  const [questions, setQuestions] = useState([]); // 視圖用的「每題資料」陣列（整合題目＋作答＋對錯）
  const [userAnswers, setUserAnswers] = useState([]); // 使用者作答
  const [stats, setStats] = useState({
    // 成績摘要
    total: 0,
    correct: 0,
    wrong: 0,
    accuracy: 0,
  });

  // 新增：防抖狀態，防止漢堡選單重複點擊
  const [isMenuTransitioning, setIsMenuTransitioning] = useState(false);

  const {
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
    updateContentPreview,
  } = useGameoverUtils();

  const handleToggleMenu = useCallback(() => {
    // 防止重複點擊和過渡期間的點擊
    if (isMenuTransitioning) {
      return;
    }
    
    setIsMenuTransitioning(true);
    
    setIsMenuOpen(!isMenuOpen);
    
    // 300ms後重置防抖狀態（與CSS過渡時間一致）
    setTimeout(() => {
      setIsMenuTransitioning(false);
    }, 300);
  }, [isMenuOpen, isMenuTransitioning]);

  const handleCloseMenu = useCallback(() => {
    // 防止重複點擊和過渡期間的點擊
    if (isMenuTransitioning) {
      return;
    }
    
    setIsMenuTransitioning(true);
    
    setIsMenuOpen(false);
    
    // 300ms後重置防抖狀態（與CSS過渡時間一致）
    setTimeout(() => {
      setIsMenuTransitioning(false);
    }, 300);
  }, [isMenuTransitioning]);

  const [analysisIndex, setAnalysisIndex] = useState(null);

  const handleOpenAnalysis = (questionNumber) => {
    if (!checkPlusSubscription()) {
      showUpgradeAlert();
      return;
    }
    setAnalysisIndex(questionNumber - 1);
    setIsAnalysisOpen(true);
  };

  const handleCloseAnalysis = () => {
    setIsAnalysisOpen(false);
  };

  const handleOpenFavoriteModal = (questionNumber) => {
    if (!checkPlusSubscription()) {
      showUpgradeAlert();
      return;
    }

    const idx = Number.isInteger(questionNumber)
      ? questionNumber - 1
      : questionNumber;
    const q = questions[idx];
    if (!q) return;

    // 準備選項
    const options = q.options ?? {
      A: q.option_A,
      B: q.option_B,
      C: q.option_C,
      D: q.option_D,
    };

    // 轉成選項文字
    const userAnsText = q.userSelected
      ? options[q.userSelected] ?? q.userSelected
      : "";
    const correctAnsText = q.aiAnswer ? options[q.aiAnswer] ?? q.aiAnswer : "";

    setCurrentQuestionData({
      number: q.number,
      ...q,
      options,
      userAnswerText: userAnsText,
      correctAnswerText: correctAnsText,
    });
    setIsFavoriteModalOpen(true);
  };

  const handleCloseFavoriteModal = () => {
    setIsFavoriteModalOpen(false);
    setCurrentQuestionData(null);
  };

  const handleOpenAnalysisFavoriteModal = () => {
    if (!checkPlusSubscription()) {
      showUpgradeAlert();
      return;
    }
    setIsAnalysisFavoriteModalOpen(true);
  };

  const handleCloseAnalysisFavoriteModal = () => {
    setIsAnalysisFavoriteModalOpen(false);
  };

  const handleOpenAnalysisFullFavoriteModal = () => {
    if (!checkPlusSubscription()) {
      showUpgradeAlert();
      return;
    }
    setIsAnalysisFullFavoriteModalOpen(true);
  };

  const handleCloseAnalysisFullFavoriteModal = () => {
    setIsAnalysisFullFavoriteModalOpen(false);
  };

  const handleShowCustomAlert = (message) => {
    setCustomAlertMessage(message);
    setIsCustomAlertOpen(true);
  };

  const handleCloseCustomAlert = () => {
    setIsCustomAlertOpen(false);
  };

  const handleShowCustomPrompt = (title, callback) => {
    setCustomPromptTitle(title);
    setCustomPromptCallback(() => callback);
    setIsCustomPromptOpen(true);
  };

  const handleCloseCustomPrompt = () => {
    setIsCustomPromptOpen(false);
    if (customPromptCallback) {
      customPromptCallback(null);
    }
  };

  const handleConfirmCustomPrompt = (value) => {
    setIsCustomPromptOpen(false);
    if (customPromptCallback) {
      customPromptCallback(value);
    }
  };

  // 把 topics + userAnswers 合併成畫面要用的資料，並計算成績
  const buildViewModel = (topics = [], answers = []) => {
    const answerMap = new Map(answers.map((a) => [a.topicId, a.selected])); // topicId -> "A|B|C|D"
    const merged = topics.map((t, i) => {
      const userSelected = answerMap.get(t.id) ?? null;
      const isCorrect = userSelected ? userSelected === t.Ai_answer : false;
      return {
        number: i + 1,
        id: t.id,
        title: t.title,
        options: { A: t.option_A, B: t.option_B, C: t.option_C, D: t.option_D },
        aiAnswer: t.Ai_answer,
        userSelected,
        isCorrect,
        status: isCorrect ? "correct" : "wrong",
      };
    });
    const correct = merged.filter((q) => q.isCorrect).length;
    const total = merged.length;
    const wrong = total - correct;
    const accuracy = total ? Math.round((correct / total) * 100) : 0;
    return { merged, summary: { total, correct, wrong, accuracy } };
  };

  // 將工具函數暴露給全域
  useEffect(() => {
    window.showCustomAlert = handleShowCustomAlert;
    window.showGameoverCustomPrompt = handleShowCustomPrompt;
    window.addNoteToSystem = addNoteToSystem;
    window.parseMarkdown = parseMarkdown;
    window.updateContentPreview = updateContentPreview;
    window.subjects = subjects;
    window.notes = notes;

    return () => {
      delete window.showCustomAlert;
      delete window.showGameoverCustomPrompt;
      delete window.addNoteToSystem;
      delete window.parseMarkdown;
      delete window.updateContentPreview;
      delete window.subjects;
      delete window.notes;
    };
  }, [
    handleShowCustomAlert,
    handleShowCustomPrompt,
    addNoteToSystem,
    parseMarkdown,
    updateContentPreview,
    subjects,
    notes,
  ]);

  // 載入 sessionStorage 並初始化頁面資料
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("quizData");
      const rawAns = sessionStorage.getItem("userAnswers");
      
      if (!raw || !rawAns) {
        // 靜默處理，不顯示警告
        return;
      }

      const quizData = JSON.parse(raw);
      const answers = JSON.parse(rawAns);
      
      // 驗證數據完整性
      if (!quizData || !Array.isArray(quizData.topics) || !Array.isArray(answers)) {
        console.warn("quizData 格式不正確");
        return;
      }

      const { quiz, topics, question_count } = quizData;

      setQuizMeta(quiz ?? null);
      setUserAnswers(answers);

      const { merged, summary } = buildViewModel(topics, answers);
      setQuestions(merged);

      // total 以 question_count 優先，沒有就用 merged.length
      setStats({
        total: Number.isFinite(question_count) ? question_count : merged.length,
        correct: summary.correct,
        wrong: summary.wrong,
        accuracy: summary.accuracy,
      });

    } catch (e) {
      // 靜默處理錯誤，不影響用戶體驗
      console.warn("初始化 gameover 資料失敗:", e);
    }
  }, []);

  return (
    <>
      <Header
        showMenu={true}
        isMenuOpen={isMenuOpen}
        onToggleMenu={handleToggleMenu}
        enableNoteQLink={true}
      />

      <main>
        <ResultsCard quiz={quizMeta} stats={stats} styles={styles} />{" "}
        <QuestionsGrid
          questionData={questions}
          onOpenFavoriteModal={handleOpenFavoriteModal}
          onOpenAnalysis={handleOpenAnalysis}
          styles={styles}
          isPlusSubscribed={isPlusSubscribed}
        />
      </main>

      <Menu
        isOpen={isMenuOpen}
        onClose={handleCloseMenu}
        onLogout={safeLogout}
      />

      <AnalysisOverlay
        isOpen={isAnalysisOpen}
        onClose={handleCloseAnalysis}
        onOpenAnalysisFavoriteModal={handleOpenAnalysisFavoriteModal}
        onOpenAnalysisFullFavoriteModal={handleOpenAnalysisFullFavoriteModal}
        styles={styles}
        topicIndex={analysisIndex}
      />

      <FavoriteModal
        isOpen={isFavoriteModalOpen}
        onClose={handleCloseFavoriteModal}
        questionData={currentQuestionData}
        subjects={subjects}
        notes={notes}
        onShowCustomAlert={handleShowCustomAlert}
        onShowCustomPrompt={handleShowCustomPrompt}
        styles={styles}
      />

      <AnalysisFavoriteModal
        isOpen={isAnalysisFavoriteModalOpen}
        onClose={handleCloseAnalysisFavoriteModal}
        subjects={subjects}
        notes={notes}
        onShowCustomAlert={handleShowCustomAlert}
        onShowCustomPrompt={handleShowCustomPrompt}
        styles={styles}
      />

      <AnalysisFullFavoriteModal
        isOpen={isAnalysisFullFavoriteModalOpen}
        onClose={handleCloseAnalysisFullFavoriteModal}
        subjects={subjects}
        notes={notes}
        onShowCustomAlert={handleShowCustomAlert}
        onShowCustomPrompt={handleShowCustomPrompt}
        styles={styles}
      />

      <CustomAlertModal
        isOpen={isCustomAlertOpen}
        message={customAlertMessage}
        onClose={handleCloseCustomAlert}
        styles={styles}
      />

      <CustomPromptModal
        isOpen={isCustomPromptOpen}
        title={customPromptTitle}
        onClose={handleCloseCustomPrompt}
        onConfirm={handleConfirmCustomPrompt}
        styles={styles}
      />
    </>
  );
}

"use client";
// 問題卡片網格容器組件 - 負責渲染所有題目卡片並處理收藏/分析事件

import { useEffect, useRef } from "react";
import QuestionCard from "./QuestionCard";

export default function QuestionsGrid({
  questionData,
  onOpenFavoriteModal,
  onOpenAnalysis,
  styles,
  isPlusSubscribed,
}) {
  const questionsGridRef = useRef(null);

  useEffect(() => {
    const questionsGrid = questionsGridRef.current;
    if (!questionsGrid) return;

    // 監聽事件
    const handleFavoriteClick = (event) => {
      onOpenFavoriteModal(event.detail.questionNumber);
    };

    const handleAnalysisClick = () => {
      onOpenAnalysis();
    };

    questionsGrid.addEventListener("favoriteClick", handleFavoriteClick);
    questionsGrid.addEventListener("analysisClick", handleAnalysisClick);

    return () => {
      questionsGrid.removeEventListener("favoriteClick", handleFavoriteClick);
      questionsGrid.removeEventListener("analysisClick", handleAnalysisClick);
    };
  }, [questionData, onOpenFavoriteModal, onOpenAnalysis]);

  // 正規化資料，兼容「陣列」與「物件」
  const items = Array.isArray(questionData)
    ? questionData.map((q, idx) => [idx + 1, q]) 
    : Object.entries(questionData || {});

  return (
    <div id="details" className="details-section">
      <div className="container">
        <div ref={questionsGridRef} className={styles["questions-grid"]}>
          {items.map(([number, question]) => (
            <QuestionCard
              key={number}
              number={number}
              question={question}
              onOpenFavoriteModal={() => onOpenFavoriteModal(number)}
              onOpenAnalysis={() => onOpenAnalysis(number)}
              styles={styles}
              isPlusSubscribed={isPlusSubscribed}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";
// 單個問題卡片組件 - 顯示題目詳情、答案狀態和操作按鈕（收藏/分析）

import Image from "next/image";

export default function QuestionCard({
  number,
  question,
  onOpenFavoriteModal,
  onOpenAnalysis,
  styles,
  isPlusSubscribed,
}) {
  // 相容舊/新欄位名稱
  const statusKey =
    question?.status ?? (question?.isCorrect ? "correct" : "wrong");

  const statusClass =
    styles[statusKey] ||
    (statusKey === "correct"
      ? styles.correct || styles.success
      : styles.wrong || styles.error || styles.incorrect);

  const qText = question.question || question.title || "";
  const userCode = question.userAnswer || question.userSelected || null;
  const correctCode = question.correctAnswer || question.aiAnswer || null;

  // 選項資料來源（新資料有 question.options；若舊資料沒有，退回單一欄位）
  const options = question.options || {
    A: question.options_A,
    B: question.options_B,
    C: question.options_C,
    D: question.options_D,
  };

  // 將代號轉成選項文字，若查步調就顯示原代號避免空白
  const userAnsText = userCode ? (options?.[userCode] ?? userCode) : "";
  const correctAnsText = correctCode ? (options?.[correctCode] ?? correctCode) : "";

  return (
    <article className={styles["question-card"]} data-question={number}>
      <header className={styles["card-header"]}>
        <h3 className={styles["card-title"]}>題目詳情</h3>
        <div className={`${styles["status-tag"]} ${statusClass}`}>
          {question.isCorrect ? "✓ 正確" : "x 錯誤"}
        </div>
      </header>
      <div className={styles["card-body"]}>
        <p className="question-number">第 {number} 題</p>
        <p className="question-text">題目: {qText}</p>
        <p className="answer-text">您的答案: {userAnsText}</p>
        <p className="answer-text">正確答案: {correctAnsText}</p>
      </div>
      {isPlusSubscribed ? (
        <footer className={styles["card-actions"]}>
          <button
            className={`${styles["action-btn"]} ${styles["btn-favorite"]}`}
            onClick={onOpenFavoriteModal}
          >
            <Image src="/img/Vector-11.png" alt="" width={15} height={15} />
            <span>收藏</span>
          </button>
          <button
            className={`${styles["action-btn"]} ${styles["btn-analysis"]}`}
            onClick={onOpenAnalysis}
          >
            <Image src="/img/Vector-10.png" alt="" width={15} height={15} />
            <span>解析</span>
          </button>
        </footer>
      ) : (
        <footer className={styles["card-actions"]}>
          <div className={styles["upgrade-notice"]}>
            <span>升級Plus方案解鎖收藏和解析功能</span>
          </div>
        </footer>
      )}
    </article>
  );
}

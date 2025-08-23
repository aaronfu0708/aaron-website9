"use client";
// 遊戲結果摘要卡片組件 - 顯示總分、正確題數等遊戲統計資訊

export default function ResultsCard({ styles, quiz, stats }) {
  return (
    <div id="results" className={styles["results-section"]}>
      <div className="container">
        <div className={styles["results-card"]}>
          <h2 className={styles["results-title"]}>挑戰結果</h2>
          <p className={styles["results-summary"]}>
            答對題數{stats?.correct ?? 0}/{stats?.total ?? 0}
            <br />
            正確率：{(stats?.accuracy ?? 0).toFixed ? stats.accuracy.toFixed(1) : stats?.accuracy ?? 0}%
          </p>
        </div>
      </div>
    </div>
  );
}

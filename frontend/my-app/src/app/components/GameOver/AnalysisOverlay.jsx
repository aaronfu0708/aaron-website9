"use client";
// AI 解析側邊欄組件 - 提供題目解析對話介面，支援與 AI 互動討論

import { useState, useEffect } from "react";
import { API_ENDPOINTS } from "../../utils/apiConfig";
import Image from "next/image";

export default function AnalysisOverlay({
  isOpen,
  onClose,
  onOpenAnalysisFavoriteModal,
  onOpenAnalysisFullFavoriteModal,
  styles,
  topicIndex,
}) {
  const [inputValue, setInputValue] = useState("");
  const [currentTopic, setCurrentTopic] = useState(null);

  // 為每個題目創建獨立的聊天室
  const [chatRooms, setChatRooms] = useState({});

  // 即時對話訊息狀態
  const [isLoading, setIsLoading] = useState(false); // 等待 AI 回覆中

  // 獲取當前題目的聊天記錄
  const getCurrentChatRoom = () => {
    if (!currentTopic?.id) return [];
    return chatRooms[currentTopic.id] || [];
  };

  // 更新當前題目的聊天記錄
  const updateCurrentChatRoom = (newMessages) => {
    if (!currentTopic?.id) return;
    setChatRooms((prev) => ({
      ...prev,
      [currentTopic.id]: newMessages,
    }));
  };

  // 當題目索引變更時，更新當前題目
  useEffect(() => {
    if (!isOpen || topicIndex == null) return;
    const raw = sessionStorage.getItem("quizData");
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.topics) && data.topics[topicIndex]) {
      setCurrentTopic(data.topics[topicIndex]);
      // 切換題目時清空輸入框
      setInputValue("");
    }
  }, [isOpen, topicIndex]);

  // 處理訊息發送
  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    // 獲取當前題目的聊天記錄
    const currentMessages = getCurrentChatRoom();
    
    // 先把使用者訊息丟進對話
    const newMessages = [...currentMessages, { role: "user", content: text }];
    updateCurrentChatRoom(newMessages);
    setInputValue("");
    setIsLoading(true);

    try {
      const API_URL = API_ENDPOINTS.BACKEND.CHAT; // 依你的後端實際路徑調整
      const token = localStorage.getItem("token");
      const quizData = JSON.parse(sessionStorage.getItem("quizData") || "{}");
      const user = quizData.quiz.user.username;

      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          user_id: localStorage.getItem("userId") || null,
          sender: user,
          message: text,
          topic_id: currentTopic?.id ?? null,
        }),
      });

      const data = await res.json();

      // 兼容 data.ai-response.content、data.ai_response.content、data.content、data.reply
      const aiText =
        data?.ai_response?.content ??
        data?.["ai-response"]?.content ??
        data?.content ??
        data?.reply ??
        "（沒有收到 AI 內容）";

      // 更新當前題目的聊天記錄
      const updatedMessages = [...newMessages, { role: "ai", content: aiText }];
      updateCurrentChatRoom(updatedMessages);
    } catch (err) {
      console.error("AI 對話錯誤：", err);
      // 更新當前題目的聊天記錄
      const updatedMessages = [...newMessages, { role: "ai", content: "抱歉，伺服器忙碌或發生錯誤，稍後再試。" }];
      updateCurrentChatRoom(updatedMessages);
    } finally {
      setIsLoading(false);
    }
  };

  // 將目前題目與對話整理成可收藏的 Markdown
  const buildFullContent = () => {
    const lines = [];
    lines.push("# 完整對話記錄");

    if (currentTopic?.explanation_text) {
      lines.push("");
      lines.push(currentTopic.explanation_text);
    }

    lines.push("");
    lines.push(`對於題目:${currentTopic?.title || ""}還有什麼問題嗎?`);

    const currentMessages = getCurrentChatRoom();
    if (currentMessages.length > 0) {
      lines.push("");
      currentMessages.forEach((m) => {
        const who = m.role === "user" ? "你" : "AI";
        lines.push(`### ${who}：`);
        lines.push(m.content || "");
        lines.push("");
      });
    } else {
      lines.push("");
      lines.push("你的問題會在這裡");
      lines.push("");
      lines.push("AI的回答在這裡");
    }

    return lines.join("\n");
  };

  // 處理收藏解析內容 (收藏AI回覆對話)
  const handleOpenFavoriteWithText = (text) => {
    if (typeof window !== "undefined") {
      window.__analysisSelectedContent = {
        content: text || "",
        title: `解析內容收藏 - ${new Date().toLocaleDateString("zh-TW")}`,
      };
    }
    onOpenAnalysisFavoriteModal();
  };

  // 處理收藏完整對話
  const handleOpenFullFavorite = () => {
    const content = buildFullContent();
    const title = `完整對話收藏 - ${new Date().toLocaleDateString("zh-TW")}`;
    if (typeof window !== "undefined") {
      window.__analysisFullContent = { content, title };
    }
    onOpenAnalysisFullFavoriteModal();
  };

  // 處理按鍵事件，Enter 鍵送出訊息
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <>
      <div
        className={`${styles["overlay-backdrop"]} ${
          isOpen ? styles.active : ""
        }`}
        onClick={onClose}
      />

      <div
        className={`${styles["analysis-overlay"]} ${
          isOpen ? styles.active : ""
        }`}
      >
        <div className={styles["analysis-header"]}>
          <h2 className={styles["analysis-title"]}>解析</h2>
          <button className={styles["close-btn"]} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles["analysis-content"]}>
          <div className={styles["chat-messages"]}>
            <div className={`${styles.message} ${styles.ai}`}>
              {/* <div
                className={styles["placeholder-icon"]}
                onClick={onOpenAnalysisFavoriteModal}
              >
                +
              </div> */}
              <span>{currentTopic?.explanation_text || "正在載入解析..."}</span>
            </div>
            <div className={`${styles.message} ${styles.ai}`}>
              {"對於題目：" + (currentTopic?.title || "") + "還有什麼問題嗎？"}{" "}
            </div>
            {(() => {
              const currentMessages = getCurrentChatRoom();
              return currentMessages.length === 0 ? null : (
                <>
                  {currentMessages.map((m, i) => (
                    <div
                      key={i}
                      className={`${styles.message} ${
                        m.role === "user" ? styles.user : styles.ai
                      }`}
                    >
                      {m.role === "ai" && (
                        <div
                          className={styles["placeholder-icon"]}
                          onClick={() => handleOpenFavoriteWithText(m.content)}
                        >
                          +
                        </div>
                      )}
                      <span>{m.content}</span>
                    </div>
                  ))}

                  {isLoading && (
                    <div className={`${styles.message} ${styles.placeholder}`}>
                      正在思考中…
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        <div className={styles["analysis-input"]}>
          <span className={styles["add-icon"]} onClick={handleOpenFullFavorite}>
            +
          </span>
          <input
            type="text"
            className={styles["input-field"]}
            placeholder="輸入問題"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button className={styles["send-btn"]} onClick={handleSend}>
            <span>→</span>
          </button>
        </div>
      </div>
    </>
  );
}

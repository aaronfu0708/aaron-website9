"use client";
// 題目收藏模態框組件 - 允許用戶將題目收藏到指定的筆記本中

import { useState, useEffect } from "react";
import { API_ENDPOINTS } from "../../utils/apiConfig";
import Image from "next/image";
import SubjectSelector from "./SubjectSelector";
import NoteSelector from "./NoteSelector";
import ContentEditor from "./ContentEditor";

export default function FavoriteModal({
  isOpen,
  onClose,
  questionData,
  subjects,
  notes,
  onShowCustomAlert,
  onShowCustomPrompt,
  styles,
}) {
  const [currentSubject, setCurrentSubject] = useState("新增主題");
  const [currentNoteId, setCurrentNoteId] = useState(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [questionContent, setQuestionContent] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(true);

  useEffect(() => {
    if (isOpen && questionData) {
      // 選項映射
      const options = questionData.options ?? {
        A: questionData.option_A,
        B: questionData.option_B,
        C: questionData.option_C,
        D: questionData.option_D,
      };

      // 正確答案代號
      const correctCode =
        questionData.correctAnswer ?? questionData.aiAnswer ?? "";
      const correctAnsText = options[correctCode] ?? correctCode;

      // 從 sessionStorage 取得 quizData
      const quizData = JSON.parse(sessionStorage.getItem("quizData") || "{}");
      let explanation = "";

      if (quizData?.topics && Array.isArray(quizData.topics)) {
        const matchedTopic = quizData.topics.find(
          (t) => t.id === questionData.id
        );
        explanation = matchedTopic?.explanation_text || "";
      }

      // 組合內容：正確答案 + 解析
      const content = `## 題目解析\n${explanation}\n\n**正確答案：** ${correctAnsText}`;
      // 從 sessionStorage 取得 quiz_topic
      const title = quizData?.quiz?.quiz_topic || "題目收藏";
      // 取得題目標題
      const questionTitle =
        questionData.title || `收藏題目 - 第${questionData.number}題`;

      setQuestionContent(content);
      setNoteTitle(questionTitle);

      // 重置選擇器
      setCurrentSubject(title);
      setCurrentNoteId(null);
    }
  }, [isOpen, questionData]);

  // 新增：組裝並送出收藏資料
  const sendFavoriteToBackend = async () => {
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("token");

    if (!userId) {
      throw new Error("找不到 userId，請確認已登入。");
    }

    if (!token) {
      throw new Error("找不到 token，請確認已登入。");
    }

    const quizData = JSON.parse(sessionStorage.getItem("quizData") || "{}");

    // 選項映射
    const options = questionData.options ?? {
      A: questionData.option_A,
      B: questionData.option_B,
      C: questionData.option_C,
      D: questionData.option_D,
    };

    // 使用者答案與正確答案轉成文字
    const userAnsText = questionData.userSelected
      ? options[questionData.userSelected] ?? questionData.userSelected
      : "";
    const aiAnsText = questionData.aiAnswer
      ? options[questionData.aiAnswer] ?? questionData.aiAnswer
      : "";

    // 解析文字
    let explanation = "";
    if (quizData?.topics && Array.isArray(quizData.topics)) {
      const matched = quizData.topics.find((t) => t.id === questionData.id);
      explanation = matched?.explanation_text || "";
    }

    // 獲取主題ID - 根據當前選擇的主題名稱找到對應的ID
    let topicId = null;
    try {
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
        const targetTopic = topics.find(t => t?.quiz_topic === currentSubject);
        if (targetTopic) {
          topicId = targetTopic.id;
        }
      }
    } catch (error) {
      // 靜默處理錯誤，不阻擋收藏流程
    }

    // 如果找不到主題ID，先创建主题
    if (!topicId) {
      try {
        // 檢查主題名稱是否有效
        if (!currentSubject || currentSubject.trim() === "") {
          throw new Error("主題名稱不能為空");
        }

        const createRes = await fetch(API_ENDPOINTS.BACKEND.CREATE_QUIZ, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            quiz_topic: currentSubject.trim() 
          }),
        });
        
        if (createRes.ok) {
          const newTopic = await createRes.json();
          // 檢查返回的數據結構
          topicId = newTopic.quiz_topic_id || newTopic.id;
          if (!topicId) {
            throw new Error("創建主題成功但返回的ID無效");
          }
        } else {
          const errorText = await createRes.text();
          throw new Error(`創建主題失敗: ${createRes.status} - ${errorText}`);
        }
      } catch (error) {
        // 靜默處理錯誤，不阻擋收藏流程
        console.warn("創建主題失敗:", error.message);
        // 使用默認主題ID作為後備方案
        topicId = 1; // 假設有默認主題ID為1
      }
    }

    // 確保有有效的 topicId
    if (!topicId) {
      throw new Error("無法獲取或創建主題ID");
    }

    const payload = {
      user_id: Number(userId),
      topic_id: Number(topicId), // 確保是數字
      title: questionData.title || `收藏題目 - 第${questionData.number}題`,
      content: {
        explanation_text: explanation || "",
        user_answer: userAnsText || "",
        Ai_answer: aiAnsText || "",
      },
    };

    const res = await fetch(API_ENDPOINTS.BACKEND.ADD_FAVORITE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || `收藏失敗 (${res.status})`);
    }

    return await res.json().catch(() => ({}));
  };

  const handleConfirm = async () => {
    if (!questionData) {
      onShowCustomAlert("沒有要收藏的題目數據！");
      return;
    }

    try {
      // 樂觀更新：立即顯示成功訊息
      onShowCustomAlert(`題目已收藏到「${currentSubject}」主題！`);
      
      // 立即關閉模態框，提升用戶體驗
      onClose();

      // 後台靜默處理收藏邏輯
      if (currentNoteId === "add_note" || currentNoteId === null) {
        // 新增筆記
        const userTitle = noteTitle.trim();
        const finalTitle = userTitle || `收藏題目 - 第${questionData.number}題`;

        const newNote = {
          id: Date.now(),
          title: finalTitle,
          content: questionContent,
          subject: currentSubject,
        };

        if (window.addNoteToSystem) {
          // 靜默調用，不等待結果
          window.addNoteToSystem(newNote).catch(() => {
            // 靜默處理錯誤，不影響用戶體驗
          });
        }
      } else {
        // 添加到現有筆記
        const targetNote = Array.isArray(filteredNotes) ? filteredNotes.find((note) => note.id === currentNoteId) : null;

        if (targetNote) {
          const existingContent = targetNote.content || "";
          const updatedContent = `${existingContent}
---
## 新增題目
${questionContent}`;

          const updatedNote = {
            ...targetNote,
            content: updatedContent,
          };

          // 靜默更新筆記，不等待結果
          try {
            const token = localStorage.getItem("token");
            fetch(`${API_ENDPOINTS.BACKEND.NOTES}${currentNoteId}/`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: token ? `Bearer ${token}` : "",
              },
              body: JSON.stringify({
                title: updatedNote.title,
                content: updatedNote.content,
              }),
            }).catch(() => {
              // 靜默處理錯誤
            });
          } catch (error) {
            // 靜默處理錯誤
          }
        }
      }

      // 靜默處理後端收藏狀態更新
      try {
        await sendFavoriteToBackend();
      } catch (err) {
        // 靜默處理錯誤，不影響用戶體驗
      }

    } catch (error) {
      // 靜默處理錯誤，不影響用戶體驗
    }
  };

  const filteredNotes = Array.isArray(notes) ? notes.filter((note) => note.subject === currentSubject) : [];

  return (
    <div
      className={`${styles["favorite-modal"]} ${isOpen ? styles.active : ""}`}
    >
      <div className={styles["favorite-modal-content"]}>
        <div className={styles["favorite-modal-header"]}>
          <h2 className={styles["favorite-modal-title"]}>收藏題目</h2>
          <button className={styles["favorite-modal-close"]} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles["favorite-modal-body"]}>
          <div className={styles["favorite-question-info"]}>
            <h3>題目內容</h3>
            <ContentEditor
              content={questionContent}
              onChange={setQuestionContent}
              isPreviewMode={isPreviewMode}
              onTogglePreview={() => setIsPreviewMode(!isPreviewMode)}
              styles={styles}
            />
          </div>

          <SubjectSelector
            subjects={subjects}
            currentSubject={currentSubject}
            onSubjectChange={setCurrentSubject}
            onShowCustomPrompt={onShowCustomPrompt}
            onShowCustomAlert={onShowCustomAlert}
            styles={styles}
          />

          <NoteSelector
            notes={filteredNotes}
            currentNoteId={currentNoteId}
            onNoteChange={setCurrentNoteId}
            styles={styles}
            currentSubject={currentSubject}
          />

          {(currentNoteId === "add_note" || currentNoteId === null) && (
            <div className={styles["favorite-note-title-input"]}>
              <label
                htmlFor="favorite-note-title"
                className={styles["favorite-filter-label"]}
              >
                筆記標題
              </label>
              <input
                type="text"
                id="favorite-note-title"
                className={styles["favorite-note-title-field"]}
                placeholder="請輸入筆記標題..."
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className={styles["favorite-modal-footer"]}>
          <button
            className={`${styles["favorite-modal-btn"]} ${styles["favorite-modal-btn-secondary"]}`}
            onClick={onClose}
          >
            取消
          </button>
          <button
            className={`${styles["favorite-modal-btn"]} ${styles["favorite-modal-btn-primary"]}`}
            onClick={handleConfirm}
          >
            收藏
          </button>
        </div>
      </div>
    </div>
  );
}


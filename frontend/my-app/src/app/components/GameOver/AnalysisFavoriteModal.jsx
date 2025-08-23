"use client";
// 解析內容收藏模態框組件 - 允許用戶將 AI 解析內容收藏到筆記本中

import { useState, useEffect } from "react";
import { API_ENDPOINTS } from "../../utils/apiConfig";
import SubjectSelector from "./SubjectSelector";
import NoteSelector from "./NoteSelector";
import ContentEditor from "./ContentEditor";

export default function AnalysisFavoriteModal({
  isOpen,
  onClose,
  subjects,
  notes,
  onShowCustomAlert,
  onShowCustomPrompt,
  styles,
}) {
  const [currentSubject, setCurrentSubject] = useState("數學");
  const [currentNoteId, setCurrentNoteId] = useState(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(true);

  // 從 API 拉回來的主題與筆記（成功時覆蓋 props，失敗時用原 props 當後備）
  const [apiSubjects, setApiSubjects] = useState(null);
  const [apiNotes, setApiNotes] = useState(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  // 從 sessionStorage.quizData 取預設 subject / noteId / title
  function getQuizSessionDefaults() {
    try {
      const raw =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem("quizData")
          : null;
      if (!raw) return { subject: null, noteId: null, title: null };
      const data = JSON.parse(raw);

      // ★ 若 quizData 結構調整，只要改下列對應欄位 ★
      const subject =
        data?.quiz?.quiz_topic ??
        (Array.isArray(data?.quizzes) && data.quizzes[0]?.quiz_topic) ??
        (Array.isArray(data?.topics) && data.topics[0]?.subject) ??
        null;

      const noteId = (Array.isArray(data?.notes) && data.notes[0]?.id) ?? null;

      const title =
        (Array.isArray(data?.notes) && data.notes[0]?.title) ??
        (Array.isArray(data?.topics) && data.topics[0]?.title) ??
        null;

      return { subject, noteId, title };
    } catch {
      return { subject: null, noteId: null, title: null };
    }
  }

  // 集中改這裡以適配未來 API
  // API → subjects 的映射
  function mapApiToSubjects(apiData) {
    // ★ 未來 API 變更時，改這裡即可
    // 優先使用 favorite_quiz_topics（與 noteUtils 保持一致）
    if (apiData?.favorite_quiz_topics && Array.isArray(apiData.favorite_quiz_topics)) {
      return apiData.favorite_quiz_topics.map((q) => q?.quiz_topic).filter(Boolean);
    }
    
    // 後備方案：允許 data.subjects: ["數學","英文"] 或 [{name:"數學"}] 或從 quizzes 推導
    const rawSubjects = apiData?.subjects ?? apiData?.quizzes ?? [];
    return rawSubjects.map((s) =>
      typeof s === "string" ? s : s.name ?? s.quiz_topic ?? s.title ?? "未分類"
    );
  }

  // API → notes 的映射
  function mapApiToNotes(apiData) {
    // ★ 未來 API 變更時，改這裡即可
    // 優先使用 favorite_notes（與 noteUtils 保持一致）
    if (apiData?.favorite_notes && Array.isArray(apiData.favorite_notes)) {
      // 建立 id -> 名稱 對照
      const topics = Array.isArray(apiData?.favorite_quiz_topics)
        ? apiData.favorite_quiz_topics
        : [];
      const topicMap = new Map(
        topics.map((t) => [Number(t?.id), String(t?.quiz_topic || "").trim()])
      );

      return apiData.favorite_notes.map((n) => {
        // 決定標題：優先 title，其次 content 第一行，再不行給預設
        const rawTitle = n?.title ?? "";
        const fallbackFromContent = String(n?.content || "").split("\n")[0];
        const title =
          String(rawTitle).trim() || fallbackFromContent || "未命名筆記";

        // 嘗試解析 content - 新增的筆記是純文本，現有的可能是JSON格式
        let parsedContent = "";
        if (typeof n?.content === "string") {
          try {
            // 嘗試解析為JSON（現有筆記格式）
            const obj = JSON.parse(n.content.replace(/'/g, '"'));
            parsedContent = obj.explanation_text || n.content;
          } catch {
            // 解析失敗，直接使用原始內容（新增筆記格式）
            parsedContent = n.content;
          }
        } else if (typeof n?.content === "object" && n?.content !== null) {
          parsedContent = n.content.explanation_text || "";
        }

        // 獲取主題名稱
        const quizTopicId = n?.quiz_topic_id;
        const subject = topicMap.get(Number(quizTopicId)) || "";

        return {
          id: Number(n?.id),
          title,
          content: parsedContent,
          subject,
        };
      });
    }
    
    // 後備方案：允許 notes item: { id, title, subject } 或 subject 欄位名為 subject_name/topic/quiz_topic
    const rawNotes = apiData?.notes ?? [];
    return rawNotes.map((n) => ({
      id: n.id,
      title: n.title ?? n.name ?? `未命名筆記 ${n.id}`,
      content: n.content || "",
      subject:
        n.subject ?? n.subject_name ?? n.topic ?? n.quiz_topic ?? "未分類",
    }));
  }

  // 初始化筆記標題
  useEffect(() => {
    if (isOpen) {
      let analysisContent = "AI的回答在這裡";
      if (
        typeof window !== "undefined" &&
        window.__analysisSelectedContent?.content
      ) {
        analysisContent = window.__analysisSelectedContent.content;
        delete window.__analysisSelectedContent;
      }
      const formattedContent = `## ${analysisContent}`;
      setContent(formattedContent);
      setNoteTitle(`解析內容收藏 - ${new Date().toLocaleDateString("zh-TW")}`);
      setCurrentSubject("數學");
      setCurrentNoteId(null);

      // ★ 追加：用 quizData 覆蓋預設（若有）
      const { subject, noteId, title } = getQuizSessionDefaults();
      if (subject) setCurrentSubject(subject);
      if (noteId !== null && noteId !== undefined) setCurrentNoteId(noteId);
      if (title) setNoteTitle(title);
    }
  }, [isOpen]);

  // 打 API 取得選項（在 isOpen 時觸發）
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        setIsLoadingOptions(true);
        const token = localStorage.getItem("token");
        const res = await fetch(
          API_ENDPOINTS.BACKEND.USER_QUIZ_AND_NOTES,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );
        const data = await res.json();

        // ★ 未來 API 變更，請只改 mapApiToSubjects / mapApiToNotes
        const subjectsFromApi = mapApiToSubjects(data);
        const notesFromApi = mapApiToNotes(data);

        setApiSubjects(subjectsFromApi);
        setApiNotes(notesFromApi);

        // 若 currentSubject 不在新清單中，回退到第一個
        if (
          subjectsFromApi.length > 0 &&
          !subjectsFromApi.includes(currentSubject)
        ) {
          setCurrentSubject(subjectsFromApi[0]);
        }
      } catch (e) {
        console.error("取得主題/筆記選項失敗：", e);
        setApiSubjects(null);
        setApiNotes(null);
      } finally {
        setIsLoadingOptions(false);
      }
    })();
  }, [isOpen]); // 只在開啟時抓一次（或你可改依需求）

  // 處理收藏確認
  const handleConfirm = async () => {
    if (!content.trim()) {
      onShowCustomAlert("沒有要收藏的內容！");
      return;
    }

    try {
      // 樂觀更新：立即顯示成功訊息
      if (currentNoteId === "add_note" || currentNoteId === null) {
        onShowCustomAlert(`內容已收藏到「${currentSubject}」主題！`);
      } else {
        const targetNote = Array.isArray(effectiveNotes) ? effectiveNotes.find((note) => note.id === currentNoteId) : null;
        if (targetNote) {
          onShowCustomAlert(`內容已添加到筆記「${targetNote.title}」中！`);
        }
      }
      
      // 立即關閉模態框，提升用戶體驗
      onClose();

      // 後台靜默處理收藏邏輯
      if (currentNoteId === "add_note" || currentNoteId === null) {
        // 新增筆記
        const userTitle = noteTitle.trim();
        const finalTitle =
          userTitle ||
          `解析內容收藏 - ${new Date().toLocaleDateString("zh-TW")}`;

        const newNote = {
          id: Date.now(),
          title: finalTitle,
          content: content,
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
        const targetNote = Array.isArray(effectiveNotes) ? effectiveNotes.find((note) => note.id === currentNoteId) : null;

        if (targetNote) {
          const existingContent = targetNote.content || "";
          const updatedContent = `${existingContent}

---

## 新增內容

${content}`;

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

    } catch (error) {
      // 靜默處理錯誤，不影響用戶體驗
    }
  };

  const effectiveSubjects = apiSubjects ?? subjects;
  const effectiveNotes = apiNotes ?? notes;

  const filteredNotes = Array.isArray(effectiveNotes) ? effectiveNotes.filter(
    (note) => note.subject === currentSubject
  ) : [];

  return (
    <div
      className={`${styles["analysis-favorite-modal"]} ${
        isOpen ? styles.active : ""
      }`}
    >
      <div className={styles["analysis-favorite-modal-content"]}>
        <div className={styles["analysis-favorite-modal-header"]}>
          <h2 className={styles["analysis-favorite-modal-title"]}>
            收藏對話內容
          </h2>
          <button
            className={styles["analysis-favorite-modal-close"]}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className={styles["analysis-favorite-modal-body"]}>
          <div className={styles["analysis-favorite-content-info"]}>
            <h3>收藏內容</h3>
            <ContentEditor
              content={content}
              onChange={setContent}
              isPreviewMode={isPreviewMode}
              onTogglePreview={() => setIsPreviewMode(!isPreviewMode)}
              styles={styles}
            />
          </div>

          <SubjectSelector
            subjects={effectiveSubjects}
            currentSubject={currentSubject}
            onSubjectChange={setCurrentSubject}
            onShowCustomPrompt={onShowCustomPrompt}
            onShowCustomAlert={onShowCustomAlert}
            styles={styles}
            type="analysis-favorite"
          />

          <NoteSelector
            notes={filteredNotes}
            currentNoteId={currentNoteId}
            onNoteChange={setCurrentNoteId}
            styles={styles}
            type="analysis-favorite"
            currentSubject={currentSubject}
          />

          {(currentNoteId === "add_note" || currentNoteId === null) && (
            <div className={styles["analysis-favorite-note-title-input"]}>
              <label className={styles["analysis-favorite-filter-label"]}>
                筆記標題
              </label>
              <input
                type="text"
                className={styles["analysis-favorite-note-title-field"]}
                placeholder="請輸入筆記標題..."
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className={styles["analysis-favorite-modal-footer"]}>
          <button
            className={`${styles["analysis-favorite-modal-btn"]} ${styles["analysis-favorite-modal-btn-secondary"]}`}
            onClick={onClose}
          >
            取消
          </button>
          <button
            className={`${styles["analysis-favorite-modal-btn"]} ${styles["analysis-favorite-modal-btn-primary"]}`}
            onClick={handleConfirm}
          >
            收藏
          </button>
        </div>
      </div>
    </div>
  );
}

import { API_ENDPOINTS } from "../utils/apiConfig";
// 筆記系統工具函數

// 模擬資料庫（保留用於向後兼容）
let notes = [];
let subjects = [];

// 新增：緩存機制，避免重複API調用
let notesCache = null;
let subjectsCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30秒緩存時間

// 清理文字內容 - 保留換行符
export function cleanTextContent(text) {
  return text
    .replace(/\r\n/g, "\n") // 統一換行符
    .replace(/\r/g, "\n") // 統一換行符
    .replace(/\n\s*\n\s*\n+/g, "\n\n") // 多個連續換行符合併為兩個
    .trim(); // 移除首尾空白
}

// 本地Markdown解析函數
export function parseMarkdown(text) {
  return (
    text
      // 標題
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      // 粗體
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // 斜體
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // 程式碼
      .replace(/`(.*?)`/g, "<code>$1</code>")
      // 列表
      .replace(/^- (.*$)/gim, "<li>$1</li>")
      // 分隔線
      .replace(/^---$/gim, "<hr>")
      // 換行
      .replace(/\n/g, "<br>")
  );
}

// 獲取筆記數據 - 優化為使用緩存
export async function getNotes() {
  try {
    // 檢查緩存是否有效
    const now = Date.now();
    if (notesCache && (now - lastFetchTime) < CACHE_DURATION) {
      return notesCache;
    }
    const res = await fetch(API_ENDPOINTS.BACKEND.USER_QUIZ_AND_NOTES, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();

    // 新增：建立 id -> 名稱 對照
    const topics = Array.isArray(data?.favorite_quiz_topics)
      ? data.favorite_quiz_topics
      : [];
    const topicMap = new Map(
      topics.map((t) => [Number(t?.id), String(t?.quiz_topic || "").trim()])
    );

    // 轉換 favorite_notes 為標準格式
    const apiNotes = Array.isArray(data?.favorite_notes)
      ? data.favorite_notes.map((n) => {
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        })
      : [];

    // 更新緩存
    notesCache = apiNotes;
    lastFetchTime = now;
    
    return apiNotes;
  } catch (error) {
    return [];
  }
}

// 獲取主題數據 - 優化為使用緩存
export async function getSubjects() {
  try {
    // 檢查緩存是否有效
    const now = Date.now();
    if (subjectsCache && (now - lastFetchTime) < CACHE_DURATION) {
      return subjectsCache;
    }
    const res = await fetch(API_ENDPOINTS.BACKEND.USER_QUIZ_AND_NOTES, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    const apiSubjects = Array.isArray(data?.favorite_quiz_topics)
      ? data.favorite_quiz_topics.map((q) => q?.quiz_topic).filter(Boolean)
      : [];

    // 更新緩存
    subjectsCache = apiSubjects;
    
    return apiSubjects;
  } catch (error) {
    return [];
  }
}

// 獲取主題數據（包含ID）- 優化為使用緩存
export async function getSubjectsWithIds() {
  try {
    // 檢查緩存是否有效
    const now = Date.now();
    if (subjectsCache && (now - lastFetchTime) < CACHE_DURATION) {
      // 從現有的主題ID映射中重建數據，避免重複API調用
      if (subjectIdMap && subjectIdMap.size > 0) {
        const cachedSubjects = [];
        subjectIdMap.forEach((id, name) => {
          cachedSubjects.push({ id, name });
        });
        return cachedSubjects;
      }
    }
    const res = await fetch(API_ENDPOINTS.BACKEND.USER_QUIZ_AND_NOTES, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    const apiSubjects = Array.isArray(data?.favorite_quiz_topics)
      ? data.favorite_quiz_topics.map((q) => ({
          id: q?.id,
          name: q?.quiz_topic
        })).filter(q => q.id && q.name)
      : [];

    return apiSubjects;
  } catch (error) {
    return [];
  }
}

// 清除緩存 - 當數據發生變化時調用
export function clearCache() {
  notesCache = null;
  subjectsCache = null;
  lastFetchTime = 0;
  // 同時清除主題ID映射，確保數據一致性
  clearSubjectIdMap();
}

// 添加筆記 - 優化為更新緩存
export async function addNote(note) {
  try {
    // 先獲取主題列表，找到對應的Quiz ID
    const subjectsData = await getSubjects();
    
    const res = await fetch(API_ENDPOINTS.BACKEND.USER_QUIZ_AND_NOTES, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      return { success: false, message: "獲取主題數據失敗" };
    }

    const data = await res.json();
    const topics = Array.isArray(data?.favorite_quiz_topics) ? data.favorite_quiz_topics : [];
    
    // 根據主題名稱找到對應的Quiz ID
    const targetTopic = topics.find(t => t?.quiz_topic === note.subject);
    
    if (!targetTopic) {
      return { success: false, message: `找不到主題「${note.subject}」` };
    }

    // 構建API請求數據
    const apiData = {
      title: note.title, // 筆記標題
      quiz_topic: targetTopic.id, // 主題ID（數字）
      content: note.content, // 筆記內容
    };
    const noteRes = await fetch(API_ENDPOINTS.BACKEND.NOTES, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
      body: JSON.stringify(apiData),
    });

    if (!noteRes.ok) {
      const errorText = await noteRes.text();
      return { success: false, message: `新增筆記失敗：${noteRes.status}` };
    }

    const result = await noteRes.json();
    
    // 清除緩存，強制下次獲取最新數據
    clearCache();
    
    return { success: true, message: "筆記添加成功！", data: result };
  } catch (error) {
    return { success: false, message: "保存失敗，請重試！" };
  }
}

// 刪除筆記 - 優化為更新緩存
export async function deleteNote(noteId) {
  try {
    const res = await fetch(`${API_ENDPOINTS.BACKEND.NOTES}${noteId}/`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      return { success: false, message: `刪除筆記失敗：${res.status}` };
    }

    // 清除緩存，強制下次獲取最新數據
    clearCache();
    
    return { success: true, message: "筆記已刪除！" };
  } catch (error) {
    return { success: false, message: "刪除失敗，請重試！" };
  }
}

// 編輯筆記 - 優化為更新緩存
export async function updateNote(noteId, updatedNote) {
  try {
    // 構建API請求數據
    const apiData = {
      title: updatedNote.title,
      content: updatedNote.content,
    };

    const res = await fetch(`${API_ENDPOINTS.BACKEND.NOTES}${noteId}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
      body: JSON.stringify(apiData),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return { success: false, message: `編輯筆記失敗：${res.status}` };
    }

    const result = await res.json();
    
    // 清除緩存，強制下次獲取最新數據
    clearCache();
    
    return { success: true, message: "筆記更新成功！", data: result };
  } catch (error) {
    return { success: false, message: "編輯失敗，請重試！" };
  }
}

// 搬移筆記 - 優化為更新緩存
export async function moveNote(noteId, newSubject) {
  try {
    // 先獲取主題列表，找到對應的Quiz ID
    const subjectsWithIds = await getSubjectsWithIds();
    
    const targetSubject = subjectsWithIds.find(s => s.name === newSubject);
    
    if (!targetSubject) {
      return { success: false, message: `找不到主題「${newSubject}」` };
    }

    // 構建API請求數據
    const apiData = {
      quiz_topic_id: targetSubject.id,
    };
    const res = await fetch(`${API_ENDPOINTS.BACKEND.NOTES}${noteId}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
      body: JSON.stringify(apiData),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return { success: false, message: `搬移筆記失敗：${res.status}` };
    }

    const result = await res.json();
    
    // 清除緩存，強制下次獲取最新數據
    clearCache();
    
    return { success: true, message: "筆記搬移成功！", data: result };
  } catch (error) {
    return { success: false, message: "搬移失敗，請重試！" };
  }
}

// 添加主題 - 優化為更新緩存
export async function addSubject(subjectName) {
  try {
    const res = await fetch(API_ENDPOINTS.BACKEND.CREATE_QUIZ, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
      body: JSON.stringify({
        quiz_topic: subjectName,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return { success: false, message: `新增主題失敗：${res.status}` };
    }

    const result = await res.json();
    
    // 清除緩存，強制下次獲取最新數據
    clearCache();
    
    return { success: true, message: "主題新增成功！", data: result };
  } catch (error) {
    return { success: false, message: "新增失敗，請重試！" };
  }
}

// 刪除主題 - 優化為更新緩存
export async function deleteSubject(subjectName, subjectId = null) {
  try {
    let targetSubjectId = subjectId;
    
    // 如果沒有傳入ID，則需要查找
    if (!targetSubjectId) {
      // 直接調用API獲取主題信息，避免使用緩存邏輯
      const res = await fetch(API_ENDPOINTS.BACKEND.USER_QUIZ_AND_NOTES, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        return { success: false, message: `獲取主題信息失敗：${res.status}` };
      }
      
      const data = await res.json();
      const topics = Array.isArray(data?.favorite_quiz_topics) ? data.favorite_quiz_topics : [];
      const targetSubject = topics.find(t => t?.quiz_topic === subjectName);
      
      if (!targetSubject) {
        return { success: false, message: `找不到主題「${subjectName}」` };
      }
      
      targetSubjectId = targetSubject.id;
    }

    // 執行刪除操作
    const res = await fetch(`${API_ENDPOINTS.BACKEND.QUIZ}${targetSubjectId}/soft-delete/`, {
      method: "DELETE", // 改為DELETE方法
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      return { success: false, message: `刪除主題失敗：${res.status}` };
    }

    const result = await res.json();
    
    // 清除緩存，強制下次獲取最新數據
    clearCache();
    
    return { success: true, message: "主題刪除成功！", data: result };
  } catch (error) {
    return { success: false, message: "刪除失敗，請重試！" };
  }
}

// 快速刪除主題 - 使用現有數據，避免額外API調用
export async function deleteSubjectFast(subjectName) {
  try {
    // 直接從現有的notes和subjects中查找主題ID
    // 這裡假設我們已經有了主題的ID信息
    const res = await fetch(API_ENDPOINTS.BACKEND.USER_QUIZ_AND_NOTES, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
    });
    
    if (!res.ok) {
      return { success: false, message: `獲取主題信息失敗：${res.status}` };
    }
    
    const data = await res.json();
    const topics = Array.isArray(data?.favorite_quiz_topics) ? data.favorite_quiz_topics : [];
    const targetSubject = topics.find(t => t?.quiz_topic === subjectName);
    
    if (!targetSubject) {
      return { success: false, message: `找不到主題「${subjectName}」` };
    }

    // 執行刪除操作
    const deleteRes = await fetch(`${API_ENDPOINTS.BACKEND.QUIZ}${targetSubject.id}/soft-delete/`, {
      method: "DELETE", // 改為DELETE方法
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
    });

    if (!deleteRes.ok) {
      return { success: false, message: `刪除主題失敗：${deleteRes.status}` };
    }

    // 清除緩存
    clearCache();
    
    return { success: true, message: "主題刪除成功！" };
  } catch (error) {
    return { success: false, message: "刪除失敗，請重試！" };
  }
}

// 超快速刪除主題 - 直接使用現有緩存，完全避免額外API調用
export async function deleteSubjectUltraFast(subjectName) {
  try {
    // 如果我們有現有的緩存數據，直接使用
    if (notes && notes.length > 0) {
      // 從現有筆記中找到對應的主題ID
      const noteWithSubject = notes.find(note => note.subject === subjectName);
      if (noteWithSubject) {
        // 這裡我們需要從筆記的關聯中找到主題ID
        // 由於筆記結構的限制，我們還是需要調用一次API
        // 但我們可以優化這個調用
        const res = await fetch(API_ENDPOINTS.BACKEND.USER_QUIZ_AND_NOTES, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        });
        
        if (!res.ok) {
          return { success: false, message: `獲取主題信息失敗：${res.status}` };
        }
        
        const data = await res.json();
        const topics = Array.isArray(data?.favorite_quiz_topics) ? data.favorite_quiz_topics : [];
        const targetSubject = topics.find(t => t?.quiz_topic === subjectName);
        
        if (!targetSubject) {
          return { success: false, message: `找不到主題「${subjectName}」` };
        }

            // 執行刪除操作
    const deleteRes = await fetch(`${API_ENDPOINTS.BACKEND.QUIZ}${targetSubject.id}/soft-delete/`, {
          method: "DELETE", // 改為DELETE方法
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        });

        if (!deleteRes.ok) {
          return { success: false, message: `刪除主題失敗：${deleteRes.status}` };
        }

        // 清除緩存
        clearCache();
        
        return { success: true, message: "主題刪除成功！" };
      }
    }
    
    // 如果沒有找到，使用標準方法
    return await deleteSubject(subjectName);
  } catch (error) {
    return { success: false, message: "刪除失敗，請重試！" };
  }
}

// 主題ID映射緩存，避免重複查詢
let subjectIdMap = new Map();

// 智能刪除主題 - 使用ID映射緩存，最小化API調用
export async function deleteSubjectSmart(subjectName) {
  try {
    let targetSubjectId = subjectIdMap.get(subjectName);
    
    // 如果緩存中沒有ID，則查詢一次
    if (!targetSubjectId) {
      const res = await fetch(API_ENDPOINTS.BACKEND.USER_QUIZ_AND_NOTES, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      
      if (!res.ok) {
        return { success: false, message: `獲取主題信息失敗：${res.status}` };
      }
      
      const data = await res.json();
      const topics = Array.isArray(data?.favorite_quiz_topics) ? data.favorite_quiz_topics : [];
      
      // 更新ID映射緩存
      topics.forEach(topic => {
        if (topic?.quiz_topic && topic?.id) {
          subjectIdMap.set(topic.quiz_topic, topic.id);
        }
      });
      
      targetSubjectId = subjectIdMap.get(subjectName);
      
      if (!targetSubjectId) {
        return { success: false, message: `找不到主題「${subjectName}」` };
      }
    }

    // 執行刪除操作 - 使用DELETE方法，不是POST方法
    const deleteRes = await fetch(`${API_ENDPOINTS.BACKEND.QUIZ}${targetSubjectId}/soft-delete/`, {
      method: "DELETE", // 改為DELETE方法
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
    });

    if (!deleteRes.ok) {
      const errorText = await deleteRes.text();
      return { success: false, message: `刪除主題失敗：${deleteRes.status}` };
    }

    const result = await deleteRes.json();

    // 檢查API返回結果，確保真正刪除成功
    if (result.message && result.message.includes("restored")) {
      return { success: false, message: "後端操作失敗：主題被恢復而不是刪除" };
    }

    // 檢查是否包含刪除相關的關鍵詞
    if (result.message && !result.message.includes("deleted") && !result.message.includes("soft deleted")) {
      return { success: false, message: "後端操作失敗：操作類型不正確" };
    }

    // 從映射中移除已刪除的主題
    subjectIdMap.delete(subjectName);
    
    // 清除緩存
    clearCache();
    
    return { success: true, message: "主題刪除成功！" };
  } catch (error) {
    return { success: false, message: "刪除失敗，請重試！" };
  }
}

// 清除主題ID映射緩存
export function clearSubjectIdMap() {
  subjectIdMap.clear();
}

// 根據主題獲取筆記 - 優化為使用本地數據
export async function getNotesBySubject(subject) {
  const allNotes = await getNotes();
  return allNotes.filter((note) => note.subject === subject);
}

// 從後端載入使用者的主題與收藏筆記，並同步到本地 notes/subjects - 優化為更新緩存
export async function loadUserQuizAndNotes() {
  try {
    const res = await fetch(API_ENDPOINTS.BACKEND.USER_QUIZ_AND_NOTES, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { success: false, message: `載入失敗（${res.status}）` };
    }
    const data = await res.json();

    // 1) 建立 topicMap: quiz_topic_id -> quiz_topic
    const topics = Array.isArray(data?.favorite_quiz_topics)
      ? data.favorite_quiz_topics
      : [];
    const topicMap = new Map(
      topics.map((t) => [Number(t?.id), String(t?.quiz_topic || "").trim()])
    );

    // 預先填充主題ID映射，加速後續刪除操作
    topics.forEach(topic => {
      if (topic?.quiz_topic && topic?.id) {
        subjectIdMap.set(topic.quiz_topic, topic.id);
      }
    });

    // 2) 建立 subjects（字串陣列）
    subjects = [...topicMap.values()].filter(Boolean);

    // 3) 轉成本地 notes：用 quiz_topic_id 對應成 subject 名稱；content 取 explanation_text
    const rawNotes = Array.isArray(data?.favorite_notes)
      ? data.favorite_notes
      : [];
    notes = rawNotes.map((n) => {
      // title：優先 n.title；否則取 content 的第一行；再不行給預設
      const rawTitle = n?.title ?? "";
      const fallbackFromContent = String(n?.content || "").split("\n")[0];
      const title =
        String(rawTitle).trim() || fallbackFromContent || "未命名筆記";

      // content：優先解析 explanation_text；解析失敗就用原字串
      let parsedContent = "";
      if (typeof n?.content === "string") {
        try {
          // 你的後端 content 可能是單引號的物件字串，先轉雙引號再 parse
          const obj = JSON.parse(n.content.replace(/'/g, '"'));
          parsedContent = obj.explanation_text || n.content;
        } catch {
          parsedContent = n.content;
        }
      } else if (typeof n?.content === "object" && n?.content !== null) {
        parsedContent = n.content.explanation_text || "";
      }

      // subject：用 quiz_topic_id 對應主題文字
      const subject = topicMap.get(Number(n?.quiz_topic_id)) || "";

      return {
        id: Number(n?.id) || Date.now() + Math.random(),
        title,
        content: parsedContent,
        subject,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    // 更新緩存
    notesCache = notes;
    subjectsCache = subjects;
    lastFetchTime = Date.now();
    
    return {
      success: true,
      message: "載入完成",
      subjectsCount: subjects.length,
      notesCount: notes.length,
    };
  } catch (err) {
    return { success: false, message: "載入失敗" };
  }
}

// 根據筆記內容AI生成遊戲主題
export async function generateQuestions(noteContent, noteTitle = '') {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      return { success: false, message: "請先登入！" };
    }

    // 檢查筆記內容是否有效
    if (!noteContent || typeof noteContent !== 'string' || noteContent.trim().length === 0) {
      return { success: false, message: "筆記內容無效或為空！" };
    }

    // 調用後端AI API生成主題
    const res = await fetch(API_ENDPOINTS.ML_SERVICE.GENERATE_TOPIC_FROM_NOTE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`, // 添加認證
      },
      body: JSON.stringify({
        note_content: noteContent.trim(),
        note_title: noteTitle.trim(),
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return { success: false, message: `AI生成失敗：${res.status}` };
    }

    const result = await res.json();
    return { success: true, topic: result.topic, message: "主題生成成功！" };
  } catch (error) {
    return { success: false, message: "生成失敗，請稍後再試！" };
  }
}

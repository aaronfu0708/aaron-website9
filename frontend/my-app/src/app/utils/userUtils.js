import { API_ENDPOINTS } from "../utils/apiConfig";
// =========================
// 從 API 獲取用戶熟悉度（GET）
// =========================
export async function getUserFamiliarityFromAPI() {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            console.error("找不到 token");
            return [];
        }

        const res = await fetch(API_ENDPOINTS.BACKEND.FAMILIARITY, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!res.ok) {
            console.error("獲取熟悉度數據失敗：", res.status, await res.text());
            return [];
        }

        const data = await res.json();

        // 調整資料格式
        const familiarityData = Array.isArray(data)
            ? data.map((item) => ({
                name: item.quiz_topic?.quiz_topic || "未命名主題",
                familiarity: item.familiarity ?? 0, // 如果 API 沒有回傳熟悉度就設為 0
                quizId: item.quiz_topic?.id ?? null
            }))
            : [];

        return familiarityData;
        } catch (error) {
            console.error('獲取熟悉度數據失敗:', error);
            return [];
        }

}

// 新增：緩存機制
let familiarityCache = null;
let lastFamiliarityFetch = 0;
const FAMILIARITY_CACHE_DURATION = 30000; // 30秒緩存

// =========================
// 獲取用戶主題熟悉度（GET 包裝）- 優化版本
// =========================
export async function getUserTopics() {
    try {
        // 檢查緩存
        const now = Date.now();
        if (familiarityCache && (now - lastFamiliarityFetch) < FAMILIARITY_CACHE_DURATION) {
            return familiarityCache;
        }

        // 獲取新數據
        const apiData = await getUserFamiliarityFromAPI();
        
        // 更新緩存
        familiarityCache = apiData;
        lastFamiliarityFetch = now;
        
        return apiData;
    } catch (error) {
        console.error('獲取主題熟悉度失敗:', error);
        // 如果獲取失敗但有緩存，返回緩存數據
        if (familiarityCache) {
            return familiarityCache;
        }
        return [];
    }
}

// 新增：清除熟悉度緩存
export function clearFamiliarityCache() {
    familiarityCache = null;
    lastFamiliarityFetch = 0;
}

// 新增：強制刷新熟悉度數據
export async function refreshUserTopics() {
    clearFamiliarityCache();
    return await getUserTopics();
}

// =========================
// 提交用戶答案並獲取熟悉度（POST）
// =========================
export async function submitUserAnswers(updates) {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            console.error("找不到 token");
            return null;
        }

        const res = await fetch(API_ENDPOINTS.BACKEND.SUBMIT_ANSWER, { // 更新 API URL
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ updates })
        });

        if (!res.ok) {
            console.error("提交答案失敗：", res.status, await res.text());
            return null;
        }

        const data = await res.json();

        return {
            familiarity: data.familiarity ?? 0,
            quizTopicId: data.quiz_topic_id ?? null,
            difficultyLevel: data.difficulty_level ?? null,
            difficultyCap: data.difficulty_cap ?? null,
            alreadyReachedCap: data.already_reached_cap ?? false,
            updated: data.updated ?? false
        };

    } catch (error) {
        console.error("提交答案或獲取熟悉度失敗:", error);
        return null;
    }
}


// 更改密碼（模擬）
export function changePassword(oldPassword, newPassword) {
    // 這裡應該連接到後端 API 進行密碼驗證和更改
    if (!oldPassword || !newPassword) {
        return { success: false, message: '請輸入舊密碼和新密碼！' };
    }
    
    if (newPassword.length < 6) {
        return { success: false, message: '新密碼長度至少需要6位！' };
    }
    
    if (oldPassword === newPassword) {
        return { success: false, message: '新密碼不能與舊密碼相同！' };
    }
    
    // 模擬成功
    return { success: true, message: '密碼更改成功！' };
}
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { API_ENDPOINTS } from "../utils/apiConfig";
import Image from "next/image";
import Header from "../components/Header";
import Menu from "../components/Menu";
import PlusPlanModal from "../components/PlusPlanModal";
import styles from "../styles/UserPage.module.css";
import { getUserTopics } from "../utils/userUtils";
import {
  safeAlert,
  safeConfirm,
  showPasswordChangeDialog,
} from "../utils/dialogs";
import { safeLogout } from "../utils/auth";

export default function UserPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [userData, setUserData] = useState({});
  const [topics, setTopics] = useState([]);

  // 訂閱狀態管理
  const [isPlusSubscribed, setIsPlusSubscribed] = useState(false);
  const [showPlusModal, setShowPlusModal] = useState(false);

  // 新增：防抖狀態，防止漢堡選單重複點擊
  const [isMenuTransitioning, setIsMenuTransitioning] = useState(false);
  
  // 新增：額外的狀態保護
  const [lastMenuToggleTime, setLastMenuToggleTime] = useState(0);
  const MENU_TOGGLE_COOLDOWN = 500; // 500ms冷卻時間

  // 新增：API 優化相關狀態
  const [apiCache, setApiCache] = useState(new Map());
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const CACHE_DURATION = 300000; // 5分鐘緩存時間（與後端緩存一致）
  const abortControllerRef = useRef(null);
  
  // 新增：本地存儲緩存
  const LOCAL_STORAGE_CACHE_KEY = 'user_profile_cache';
  const LOCAL_STORAGE_TIMESTAMP_KEY = 'user_profile_timestamp';

  // 新增：智能緩存和請求去重
  const getCachedData = useCallback((key) => {
    const cached = apiCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }, [apiCache]);

  const setCachedData = useCallback((key, data) => {
    setApiCache(prev => new Map(prev).set(key, {
      data,
      timestamp: Date.now()
    }));
  }, []);

  // 新增：並行數據獲取
  const fetchAllDataInParallel = useCallback(async () => {
    // 取消之前的請求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // 創建新的 AbortController
    abortControllerRef.current = new AbortController();
    
    try {
      // 檢查緩存
      const cachedUserData = getCachedData('user-data');
      const cachedTopics = getCachedData('user-topics');
      
      // 如果緩存有效，直接使用
      if (cachedUserData && cachedTopics) {
        setUserData(cachedUserData);
        setTopics(cachedTopics);
        return;
      }

      // 並行請求所有數據
      const startTime = Date.now();
      const [userDataResult, topicsResult] = await Promise.allSettled([
        // 用戶數據請求
        fetchUserDataFromAPI(),
        // 熟悉度數據請求
        fetchUserTopicsFromAPI()
      ]);

      // 處理用戶數據結果
      if (userDataResult.status === 'fulfilled' && userDataResult.value) {
        setUserData(userDataResult.value);
        setCachedData('user-data', userDataResult.value);
      } else {
        console.warn("❌ 用戶數據獲取失敗:", userDataResult.reason);
      }

      // 處理熟悉度數據結果
      if (topicsResult.status === 'fulfilled' && topicsResult.value) {
        setTopics(topicsResult.value);
        setCachedData('user-topics', topicsResult.value);
      } else {
        console.warn("❌ 熟悉度數據獲取失敗:", topicsResult.reason);
      }

      setLastFetchTime(Date.now());
      
    } catch (error) {
      console.error("❌ 並行數據獲取失敗:", error);
    }
  }, []); // 移除依賴項以避免無限循環

  // 新增：智能重試機制
  const retryWithBackoff = useCallback(async (fn, maxRetries = 3, baseDelay = 100) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        
        // 指數退避重試
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }, []);

  // 切換選單
  const toggleMenu = useCallback(() => {
    const now = Date.now();
    
    // 檢查冷卻時間
    if (now - lastMenuToggleTime < MENU_TOGGLE_COOLDOWN) {
      return;
    }
    
    // 防止重複點擊和過渡期間的點擊
    if (isMenuTransitioning) {
      return;
    }
    
    // 設置冷卻時間
    setLastMenuToggleTime(now);
    setIsMenuTransitioning(true);
    
    // 防止重複點擊
    if (isMenuOpen) {
      // 如果選單已經打開，則關閉
      setIsMenuOpen(false);
      document.body.style.overflow = "auto";
    } else {
      // 如果選單關閉，則打開
      setIsMenuOpen(true);
      document.body.style.overflow = "hidden";
      
      // 關閉其他不相關的元素
      setShowPlusModal(false); // 關閉Plus方案模態框
      setActiveTab(activeTab); // 保持當前標籤頁，但重置狀態
    }
    
    // 300ms後重置防抖狀態（與CSS過渡時間一致）
    setTimeout(() => {
      setIsMenuTransitioning(false);
    }, 300);
  }, [isMenuOpen, activeTab, isMenuTransitioning, lastMenuToggleTime]);

  // 關閉選單
  const closeMenu = useCallback(() => {
    // 防止重複點擊和過渡期間的點擊
    if (isMenuTransitioning) {
      return;
    }
    
    setIsMenuTransitioning(true);
    
    setIsMenuOpen(false);
    document.body.style.overflow = "auto";
    
    // 關閉其他不相關的元素
    setShowPlusModal(false);
    
    // 300ms後重置防抖狀態（與CSS過渡時間一致）
    setTimeout(() => {
      setIsMenuTransitioning(false);
    }, 300);
  }, [isMenuTransitioning]);

  // 切換標籤頁
  const switchTab = (tabName) => {
    setActiveTab(tabName);
  };

  // 更改密碼
  const handleChangePassword = () => {
    showPasswordChangeDialog(async (oldPassword, newPassword) => {
      if (!oldPassword || !newPassword) return;

      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        safeAlert("尚未登入或找不到 token，請重新登入後再試一次。");
        return;
      }

      try {
        const res = await fetch(API_ENDPOINTS.BACKEND.RESET_PASSWORD, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            old_password: oldPassword,
            new_password: newPassword,
          }),
        });

        // 依照後端回傳格式彈窗提示
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          // 優先顯示後端錯誤訊息
          const msg =
            data?.message || data?.detail || "更改密碼失敗，請稍後重試。";
          safeAlert(msg);
          return;
        }

        safeAlert(data?.message || "密碼已更新成功！");
      } catch (err) {
        safeAlert("網路或伺服器異常，請稍後再試。");
      }
    });
  };

  // 升級到Plus方案（改版：接收 HTML 並渲染）
  const handleUpgradeToPlus = async () => {
    let loadingAlert = null;
    try {
      // 顯示載入提示並保存引用
      loadingAlert = safeAlert("正在前往付款頁面，請稍候...");
      
      // 1) 直接向後端索取 HTML（避免帶 Content-Type: application/json 造成預檢）
              const res = await fetch(API_ENDPOINTS.BACKEND.ECPAY, {
        method: "POST",
        headers: {
          // 接受 HTML；Authorization 視你的後端需求保留
          Accept: "text/html",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        credentials: "include",
      });

      if (!res.ok) {
        // 若後端有回 JSON 錯誤就解析，否則顯示通用錯誤
        let msg = "無法取得付款頁面，請稍後再試。";
        try {
          const maybeJson = await res.clone().json();
          msg = maybeJson?.message || maybeJson?.detail || msg;
        } catch {}
        // 關閉載入提示並顯示錯誤
        if (loadingAlert && typeof loadingAlert.close === 'function') {
          loadingAlert.close();
        }
        safeAlert(msg);
        return;
      }

      // 2) 取回 HTML 字串
      const html = await res.text();
      if (!html || !html.includes("<form") || !html.includes("</html>")) {
        // 關閉載入提示並顯示錯誤
        if (loadingAlert && typeof loadingAlert.close === 'function') {
          loadingAlert.close();
        }
        safeAlert("回傳內容不是有效的付款頁面。");
        return;
      }

      // 3) 以「新分頁」方式寫入 HTML（最穩、避免污染當前 React DOM）
      const win = window.open("", "_blank");
      if (!win) {
        // 關閉載入提示並顯示錯誤
        if (loadingAlert && typeof loadingAlert.close === 'function') {
          loadingAlert.close();
        }
        safeAlert("被瀏覽器封鎖彈窗，請允許此網站開新視窗後再試。");
        return;
      }
      
      // 4) 成功打開新分頁後，關閉載入提示
      if (loadingAlert && typeof loadingAlert.close === 'function') {
        loadingAlert.close();
      }
      
      win.document.open();
      win.document.write(html); // 這段 HTML 內有 <script> 會自動 submit form
      win.document.close();
    } catch (err) {
      console.error("ecpay error:", err);
      // 關閉載入提示並顯示錯誤
      if (loadingAlert && typeof loadingAlert.close === 'function') {
        loadingAlert.close();
      }
      safeAlert("發送付款請求失敗，請稍後再試。");
    }
  };

  // 取消Plus訂閱
  const handleCancelPlusSubscription = () => {
    safeConfirm("確定要取消Plus訂閱嗎？", () => {
      setIsPlusSubscribed(false);
      localStorage.setItem("is_paid", "false");
      setShowPlusModal(false);
      safeAlert("已取消Plus訂閱，回到免費方案");
    });
  };

  // 查看目前方案詳情
  const handleViewCurrentPlan = () => {
    setShowPlusModal(true);
  };

  // 後端請求使用者資料(帶上token) - 超級優化版本
  const fetchUserDataFromAPI = async () => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    if (!token) {
      return null;
    }

    // 檢查本地存儲緩存
    try {
      const cachedData = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
      const cachedTimestamp = localStorage.getItem(LOCAL_STORAGE_TIMESTAMP_KEY);
      
      if (cachedData && cachedTimestamp) {
        const age = Date.now() - parseInt(cachedTimestamp);
        if (age < CACHE_DURATION) {
          return JSON.parse(cachedData);
        }
      }
    } catch (error) {
      console.warn("本地緩存讀取失敗:", error);
    }

    try {
      const startTime = Date.now();
      
      const res = await fetch(`${API_ENDPOINTS.BACKEND.USERS}${userId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: abortControllerRef.current?.signal,
      });

      if (!res.ok) {
        throw new Error("API 請求失敗");
      }

      const data = await res.json();
      
      // 格式化數據
      const formattedData = {
        name: data.username || "未知",
        email: data.email || "未知",
        registerDate: data.created_at || new Date().toISOString(),
      };
      
      // 保存到本地緩存
      try {
        localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(formattedData));
        localStorage.setItem(LOCAL_STORAGE_TIMESTAMP_KEY, Date.now().toString());
      } catch (error) {
        console.warn("本地緩存保存失敗:", error);
      }
      
      return formattedData;
    } catch (error) {
      if (error.name === 'AbortError') {
        return null;
      }
      console.error("用戶數據獲取失敗:", error);
      return null;
    }
  };

  // 回到 /user 後，基於網址參數檢查綠界付款狀態（最小變更）
  const checkPaymentStatus = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token || typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
        let mt = params.get("merchant_trade_no") || params.get("MerchantTradeNo");
        if (!mt) return;
        // 修正格式：['O2025081903284257153'] -> O2025081903284257153
        if (/^\[.*\]$/.test(mt)) {
          try {
            mt = JSON.parse(mt.replace(/'/g, '"'));
            if (Array.isArray(mt)) mt = mt[0];
          } catch {
            mt = mt.replace(/\[|'|\]/g, "");
          }
        }
        if (!mt || mt.length < 20) return;
        const res = await fetch(
          `API_ENDPOINTS.BACKEND.PAYMENT_STATUS?merchant_trade_no=${encodeURIComponent(mt)}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data?.status === "completed") {
          localStorage.setItem("is_paid", "true");
          setIsPlusSubscribed(true);
        }
    } catch (e) {
      console.error("payment-status 檢查失敗:", e);
    }
  };

  // 初始化數據
  useEffect(() => {
    // 確保在客戶端渲染時才執行
    if (typeof window !== "undefined") {
      // 立即嘗試從本地緩存顯示數據
      try {
        const cachedData = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
        const cachedTimestamp = localStorage.getItem(LOCAL_STORAGE_TIMESTAMP_KEY);
        
        if (cachedData && cachedTimestamp) {
          const age = Date.now() - parseInt(cachedTimestamp);
          if (age < CACHE_DURATION) {
            const parsedData = JSON.parse(cachedData);
            setUserData(parsedData);
          }
        }
      } catch (error) {
        console.warn("本地緩存讀取失敗:", error);
      }
      
      // 並行獲取所有數據（在後台更新）
      fetchAllDataInParallel();
      
      // 設置訂閱狀態
      const subscriptionStatus = localStorage.getItem("is_paid");
      setIsPlusSubscribed(subscriptionStatus === "true");
      
      // 登回 USER 後立即以交易編號檢查一次付款狀態
      checkPaymentStatus();
      
      // 預加載其他頁面可能需要的數據
      const preloadAdditionalData = async () => {
        try {
          // 預加載用戶設置等數據
          const token = localStorage.getItem("token");
          if (token) {
            // 這裡可以預加載其他相關數據
            // 例如用戶偏好設置、學習統計等
          }
        } catch (error) {
          // 靜默處理錯誤，不影響主要功能
        }
      };
      
      preloadAdditionalData();
    }

    // 清理函數
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []); // 移除 fetchAllDataInParallel 依賴項以避免無限循環

  // 從API獲取用戶主題熟悉度
  const fetchUserTopicsFromAPI = async () => {
    try {
      const userTopics = await getUserTopics();
      return Array.isArray(userTopics) ? userTopics : [];
    } catch (error) {
      return [];
    }
  };

  // 新增：智能數據刷新
  const refreshData = useCallback(async (force = false) => {
    const now = Date.now();
    
    // 如果不是強制刷新且緩存仍然有效，直接返回
    if (!force && (now - lastFetchTime) < CACHE_DURATION) {
      return;
    }
    
    await fetchAllDataInParallel();
  }, [lastFetchTime]); // 移除 fetchAllDataInParallel 依賴項

  // 新增：定期刷新數據（可選）
  useEffect(() => {
    const interval = setInterval(() => {
      // 每5分鐘檢查一次是否有新數據
      refreshData(false);
    }, 300000); // 5分鐘

    return () => clearInterval(interval);
  }, [refreshData]);

  // 鍵盤事件處理
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const name = userData.name || "";
  const isChinese = /[^\x00-\x7F]/.test(name);
  const fontSize = isChinese
    ? name.length > 5
      ? "1rem"
      : "1.5rem"
    : name.length > 6
    ? "1.3rem"
    : "2.3rem";
  return (
    <>
      {/* 頭部 */}
      <Header
        showMenu={true}
        isMenuOpen={isMenuOpen}
        onToggleMenu={toggleMenu}
        enableNoteQLink={true}
      />

      {/* 主要內容 */}
      <section className={styles.userDashboard}>
        <div className={styles.dashboardContainer}>
          {/* 個人資料欄 */}
          <div className={styles.profileColumn}>
            <div className={styles.profileCard}>
              <Image
                src="/img/Vector-20.png"
                alt="Background"
                className={styles.profileBg}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 450px"
                style={{ objectFit: "cover" }}
              />

              <header className={styles.profileHeader}>
                <Image
                  src="/img/userrr.gif"
                  alt="Chart Icon"
                  className={styles.profileIcon}
                  width={100}
                  height={80}
                  style={{
                    objectFit: "contain",
                    filter: "sepia(1) invert(1) brightness(1.1) "
                  }}
                />
                <h1
                  className={styles.profileName}
                  title={name}
                  style={{ fontSize }}
                >
                  {name}
                </h1>
              </header>

              {/* 標籤頁容器 */}
              <div className={styles.tabContainer}>
                <button
                  className={`${styles.tabButton} ${
                    activeTab === "personal" ? styles.active : ""
                  }`}
                  onClick={() => switchTab("personal")}
                >
                  個人資料
                </button>
                <button
                  className={`${styles.tabButton} ${
                    activeTab === "familiarity" ? styles.active : ""
                  }`}
                  onClick={() => switchTab("familiarity")}
                >
                  熟悉度
                </button>
              </div>

              {/* 個人資料標籤頁 */}
              <div
                className={`${styles.tabPanel} ${
                  activeTab === "personal" ? styles.active : ""
                }`}
              >
                <div className={styles.personalInfo}>
                  <div className={styles.infoItem}>
                    <h3 className={styles.infoTitle}>電子郵件</h3>
                    <p className={styles.infoContent}>{userData.email}</p>
                  </div>
                  <div className={styles.infoItem}>
                    <h3 className={styles.infoTitle}>註冊時間</h3>
                    <p className={styles.infoContent}>
                      {userData.registerDate}
                    </p>
                  </div>
                  <div className={styles.infoItem}>
                    <h3 className={styles.infoTitle}>目前方案</h3>
                    <p className={styles.infoContent}>
                      {isPlusSubscribed ? "Plus方案" : "免費方案"}
                    </p>
                  </div>
                  <button
                    className={styles.changePasswordBtn}
                    onClick={handleChangePassword}
                  >
                    更改密碼
                  </button>
                </div>
              </div>

              {/* 熟悉度標籤頁 */}
              <div
                className={`${styles.tabPanel} ${
                  activeTab === "familiarity" ? styles.active : ""
                }`}
              >
                <div className={styles.topicsList}>
                  {topics && topics.length > 0 ? (
                    topics.map((topic, index) => (
                      <div key={index} className={styles.topicItem}>
                        <div className={styles.topicHeader}>
                          <h2 className={styles.topicTitle}>{topic.name}</h2>
                        </div>
                        <div className={styles.progressContainer}>
                          <span className={styles.progressLabel}>熟悉度：</span>
                          <div className={styles.progressBar}>
                            <div
                              className={styles.progress}
                              style={{ width: `${topic.familiarity}%` }}
                            ></div>
                          </div>
                          <span className={styles.progressPercentage}>
                            {topic.familiarity}%
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.noTopicsMessage}>
                      <p>目前您還沒有任何主題熟悉度</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 訂閱方案欄 */}
          <div className={styles.subscriptionColumn}>
            <article className={styles.planCard}>
              <div
                className={`${styles.planHeader} ${
                  isPlusSubscribed ? styles.free : styles.current
                }`}
              >
                {isPlusSubscribed ? "免費方案" : "目前方案"}
              </div>
              <ul className={styles.featureList}>
                <li className={styles.featureItem}>
                  <Image
                    src="/img/Vector-22.png"
                    alt="Feature icon"
                    width={20}
                    height={20}
                    loading="lazy"
                  />
                  <span>熟悉度功能</span>
                </li>
                <li className={styles.featureItem}>
                  <Image
                    src="/img/Vector-22.png"
                    alt="Feature icon"
                    width={20}
                    height={20}
                    loading="lazy"
                  />
                  <span>免費生成三次主題</span>
                </li>
                <li className={styles.featureItem}>
                  <Image
                    src="/img/Vector-22.png"
                    alt="Feature icon"
                    width={20}
                    height={20}
                    loading="lazy"
                  />
                  <span>單次生成五題題目</span>
                </li>
                <li className={styles.featureItem}>
                  <Image
                    src="/img/Vector-22.png"
                    alt="Feature icon"
                    width={20}
                    height={20}
                    loading="lazy"
                  />
                  <span>訂閱即享更多功能</span>
                </li>
              </ul>
            </article>

            <article className={styles.planCard}>
              <button
                className={`${styles.planHeader} ${
                  isPlusSubscribed ? styles.current : styles.upgrade
                }`}
                onClick={!isPlusSubscribed ? handleUpgradeToPlus : undefined}
                disabled={isPlusSubscribed}
              >
                {isPlusSubscribed ? "目前方案" : "升級PLUS"}
              </button>
              <ul className={styles.featureList}>
                <li className={styles.featureItem}>
                  <Image
                    src="/img/Vector-22.png"
                    alt="Feature icon"
                    width={20}
                    height={20}
                    loading="lazy"
                  />
                  <span>筆記功能</span>
                </li>
                <li className={styles.featureItem}>
                  <Image
                    src="/img/Vector-22.png"
                    alt="Feature icon"
                    width={20}
                    height={20}
                    loading="lazy"
                  />
                  <span>收藏與AI解析功能</span>
                </li>
                <li className={styles.featureItem}>
                  <Image
                    src="/img/Vector-22.png"
                    alt="Feature icon"
                    width={20}
                    height={20}
                    loading="lazy"
                  />
                  <span>主題不限/單次題目生成十五題</span>
                </li>
                <li className={styles.featureItem}>
                  {isPlusSubscribed ? (
                    <button
                      className={styles.viewCurrentPlanBtn}
                      onClick={handleViewCurrentPlan}
                    >
                      查看目前方案
                    </button>
                  ) : (
                    <div className={styles.priceDisplay}>
                      <Image
                        src="/img/Vector-22.png"
                        alt="Feature icon"
                        width={20}
                        height={20}
                        loading="lazy"
                      />
                      <span>99NTD/月</span>
                    </div>
                  )}
                </li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* Plus方案詳情模态框 */}
      <PlusPlanModal
        isOpen={showPlusModal}
        onClose={() => setShowPlusModal(false)}
        onCancelSubscription={handleCancelPlusSubscription}
      />

      {/* 選單 */}
      <Menu isOpen={isMenuOpen} onClose={closeMenu} onLogout={safeLogout} />
    </>
  );
}

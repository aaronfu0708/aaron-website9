"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Header from "../components/Header";
import styles from "../styles/LoginPage.module.css";
import { initSplineViewer, optimizeSplineLoading } from "../utils/spline";
import { safeAlert } from "../utils/dialogs";
import { usePageTransition } from "../components/PageTransition";
import { API_ENDPOINTS } from "../utils/apiConfig";


function LoginPageContent() {
  const searchParams = useSearchParams();
  const [isLoginForm, setIsLoginForm] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isSubmittingForgotPassword, setIsSubmittingForgotPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const splineViewerRef = useRef(null);
  const { navigateWithTransition } = usePageTransition();

  // 新增：API 優化相關狀態
  const [apiCache, setApiCache] = useState(new Map());
  const [pendingRequests, setPendingRequests] = useState(new Set());
  const [preloadedData, setPreloadedData] = useState(null);

  //註冊欄位綁定狀態
  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupMessage, setSignupMessage] = useState("");

  // 登入欄位綁定狀態
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  // 新增：API 請求去重和緩存機制
  const createRequestKey = useCallback((url, body) => {
    return `${url}-${JSON.stringify(body)}`;
  }, []);

  const isRequestPending = useCallback((key) => {
    return pendingRequests.has(key);
  }, [pendingRequests]);

  const addPendingRequest = useCallback((key) => {
    setPendingRequests(prev => new Set(prev).add(key));
  }, []);

  const removePendingRequest = useCallback((key) => {
    setPendingRequests(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
  }, []);

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

  // 新增：請求優先級管理
  const requestQueue = useRef([]);
  const isProcessing = useRef(false);

  const processQueue = useCallback(async () => {
    if (isProcessing.current || requestQueue.current.length === 0) return;
    
    isProcessing.current = true;
    
    while (requestQueue.current.length > 0) {
      const { priority, fn, resolve, reject } = requestQueue.current.shift();
      
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
    
    isProcessing.current = false;
  }, []);

  const addToQueue = useCallback((priority, fn) => {
    return new Promise((resolve, reject) => {
      requestQueue.current.push({ priority, fn, resolve, reject });
      
      // 按優先級排序
      requestQueue.current.sort((a, b) => b.priority - a.priority);
      
      processQueue();
    });
  }, [processQueue]);

  // 新增：性能監控
  const performanceMetrics = useRef({
    totalRequests: 0,
    cachedRequests: 0,
    averageResponseTime: 0,
    startTime: Date.now()
  });

  const updateMetrics = useCallback((responseTime, wasCached = false) => {
    const metrics = performanceMetrics.current;
    metrics.totalRequests++;
    if (wasCached) metrics.cachedRequests++;
    
    // 計算平均響應時間
    metrics.averageResponseTime = 
      (metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime) / metrics.totalRequests;
    
    // 開發環境下顯示性能指標
    if (process.env.NODE_ENV === 'development') {
    }
  }, []);

  // 新增：智能 API 調用函數（優化版本）
  const smartApiCall = useCallback(async (url, options, cacheKey = null, priority = 1) => {
    const startTime = Date.now();
    
    // 檢查緩存
    if (cacheKey && apiCache.has(cacheKey)) {
      const cached = apiCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 30000) { // 30秒緩存
        const responseTime = Date.now() - startTime;
        updateMetrics(responseTime, true);
        return cached.data;
      }
    }

    // 檢查是否有重複請求
    const requestKey = createRequestKey(url, options.body);
    if (isRequestPending(requestKey)) {
      // 等待現有請求完成
      return new Promise((resolve, reject) => {
        const checkPending = () => {
          if (!isRequestPending(requestKey)) {
            // 檢查緩存中是否有結果
            if (cacheKey && apiCache.has(cacheKey)) {
              const responseTime = Date.now() - startTime;
              updateMetrics(responseTime, true);
              resolve(apiCache.get(cacheKey).data);
            } else {
              reject(new Error("重複請求已取消"));
            }
          } else {
            setTimeout(checkPending, 100);
          }
        };
        checkPending();
      });
    }

    // 添加請求到待處理列表
    addPendingRequest(requestKey);

    // 使用請求隊列和重試機制
    const apiCall = async () => {
      try {
        // 添加超時控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超時
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();

        // 緩存結果
        if (cacheKey) {
          setApiCache(prev => new Map(prev).set(cacheKey, {
            data,
            timestamp: Date.now()
          }));
        }

        return data;
      } finally {
        removePendingRequest(requestKey);
        const responseTime = Date.now() - startTime;
        updateMetrics(responseTime, false);
      }
    };

    // 根據優先級決定是否使用隊列
    if (priority > 1) {
      return addToQueue(priority, apiCall);
    } else {
      return retryWithBackoff(apiCall);
    }
  }, [apiCache, pendingRequests, createRequestKey, isRequestPending, addPendingRequest, removePendingRequest, retryWithBackoff, addToQueue, updateMetrics]);

  // 新增：預加載用戶數據（如果用戶已登入）
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // 預加載用戶數據，提升登入後的響應速度
      const preloadUserData = async () => {
        try {
          const data = await smartApiCall(
            API_ENDPOINTS.BACKEND.USER_QUIZ_AND_NOTES,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            },
            "user-data"
          );
          setPreloadedData(data);
        } catch (error) {
          // 靜默處理錯誤，不影響用戶體驗
        }
      };
      preloadUserData();
    }
  }, [smartApiCall]);

  // 忘記密碼
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!forgotPasswordEmail.trim()) {
      safeAlert("請輸入電子郵件地址");
      return;
    }

    setIsSubmittingForgotPassword(true);
    
    try {
      const res = await smartApiCall(
        API_ENDPOINTS.BACKEND.FORGOT_PASSWORD,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: forgotPasswordEmail }),
        },
        `forgot-password-${forgotPasswordEmail}`
      );

      safeAlert("重設密碼連結已發送到您的電子郵件，請查看信箱");
      setShowForgotPasswordModal(false);
      setForgotPasswordEmail("");
    } catch (err) {
      safeAlert("發送失敗，請確認電子郵件地址是否正確");
    } finally {
      setIsSubmittingForgotPassword(false);
    }
  };

  // 關閉忘記密碼模態框
  const closeForgotPasswordModal = () => {
    setShowForgotPasswordModal(false);
    setForgotPasswordEmail("");
  };

  // 登入功能 - 優化版本
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (isLoggingIn) return; // 防止重複提交
    
    setIsLoggingIn(true);

    try {
      // 樂觀更新：立即開始頁面過渡動畫
      const loginPromise = smartApiCall(
        API_ENDPOINTS.BACKEND.LOGIN,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        },
        `login-${email}`,
        3 // 高優先級
      );

      // 並行處理：同時進行登入和預加載
      const [loginData] = await Promise.all([
        loginPromise,
        // 預加載用戶數據，提升登入後的響應速度
        (async () => {
          try {
            const userData = await smartApiCall(
              API_ENDPOINTS.BACKEND.USER_QUIZ_AND_NOTES,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${loginData?.token || ""}`,
                },
              },
              "user-data",
              2 // 中優先級
            );
            setPreloadedData(userData);
          } catch (error) {
            // 靜默處理錯誤，不影響用戶體驗
          }
        })()
      ]);

      // 保存登入信息
      localStorage.setItem("token", loginData.token);
      localStorage.setItem("userId", loginData.user_id);
      localStorage.setItem("is_paid", loginData.is_paid);
      
      // 登入成功後跳轉
      navigateWithTransition('/homegame', 'right');
      
    } catch (err) {
      // 如果登入失敗，顯示錯誤訊息
      safeAlert("登入失敗，請確認帳號密碼");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 註冊功能 - 優化版本
  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (isSigningUp) return; // 防止重複提交
    
    setIsSigningUp(true);

    try {
      // 樂觀更新：立即顯示註冊成功訊息
      const signupPromise = smartApiCall(
        API_ENDPOINTS.BACKEND.REGISTER,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: signupUsername,
            email: signupEmail,
            password: signupPassword,
          }),
        },
        `signup-${signupEmail}`,
        3 // 高優先級
      );

      // 並行處理：同時進行註冊和預加載登入頁面
      const [signupData] = await Promise.all([
        signupPromise,
        // 預加載登入頁面相關資源
        (async () => {
          try {
            // 預加載登入 API 的相關資源
            await smartApiCall(
              API_ENDPOINTS.BACKEND.LOGIN,
              {
                method: "HEAD",
                headers: { "Content-Type": "application/json" }
              },
              "login-preload",
              1 // 低優先級
            );
          } catch (error) {
            // 靜默處理錯誤，不影響用戶體驗
          }
        })()
      ]);

      safeAlert("註冊成功，請登入");
      setIsLoginForm(true);
      
      // 清除註冊表單
      setSignupUsername("");
      setSignupEmail("");
      setSignupPassword("");
      
    } catch (err) {
      safeAlert("註冊失敗，請確認資料是否正確或已被註冊");
    } finally {
      setIsSigningUp(false);
    }
  };

  // 根據 URL 參數決定顯示登入還是註冊表單
  useEffect(() => {
    const signupParam = searchParams.get("signup");
    if (signupParam === "1") {
      setIsLoginForm(false);
    } else {
      setIsLoginForm(true);
    }
  }, [searchParams]);

  // 初始化 Spline viewer
  useEffect(() => {
    initSplineViewer();
  }, []);

  // 優化 Spline 模型載入
  useEffect(() => {
    if (splineViewerRef.current) {
      optimizeSplineLoading(splineViewerRef.current);
    }
  }, []);

  const showLoginForm = () => {
    setIsLoginForm(true);
  };

  const showSignupForm = () => {
    setIsLoginForm(false);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleSignupPasswordVisibility = () => {
    setShowSignupPassword(!showSignupPassword);
  };

  return (
    <>
      <Header showAuthNav={true} />

      <main className={styles.authMain}>
        <div className={styles.authContainer}>
          {/* 登入表單區塊 */}
          <div
            className={`${styles.formSection} ${
              isLoginForm ? "" : styles.hidden
            }`}
            id="loginSection"
          >
            <h1 className={styles.authTitle}>LOGIN</h1>

            <form className={styles.authForm} onSubmit={handleLogin}>
              <div className={styles.inputGroup}>
                <div className={styles.inputHeader}>
                  <div className={styles.inputIcon}>
                    <Image
                      src="/img/Vector-6.png"
                      alt="Email icon"
                      className={styles.icon}
                      width={24}
                      height={24}
                    />
                  </div>
                  <label className={styles.inputLabel}>EMAIL</label>
                </div>
                <input
                  type="email"
                  className={styles.inputField}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div className={styles.inputUnderline}></div>
              </div>

              <div className={styles.inputGroup}>
                <div className={styles.inputHeader}>
                  <div className={styles.inputIcon}>
                    <Image
                      src="/img/Vector-7.png"
                      alt="Password icon"
                      className={styles.icon}
                      width={24}
                      height={24}
                    />
                  </div>
                  <label className={styles.inputLabel}>PASSWORD</label>
                </div>
                <div className={styles.passwordInputContainer}>
                  <input
                    type={showPassword ? "text" : "password"}
                    className={styles.inputField}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={togglePasswordVisibility}
                  >
                    <Image
                      src="/img/Vector-39.png"
                      alt="Show password"
                      className={`${styles.icon} ${
                        showPassword ? styles.hidden : ""
                      }`}
                      width={20}
                      height={20}
                    />
                    <Image
                      src="/img/Vector-38.png"
                      alt="Hide password"
                      className={`${styles.icon} ${
                        showPassword ? "" : styles.hidden
                      }`}
                      width={20}
                      height={20}
                    />
                  </button>
                </div>
                <div className={styles.inputUnderline}></div>
              </div>

              <div className={styles.forgotPassword}>
                <a href="#" className={styles.linkText} onClick={() => setShowForgotPasswordModal(true)}>
                  忘記密碼？
                </a>
              </div>

              <button 
                type="submit" 
                className={`${styles.authButton} ${isLoggingIn ? styles.loading : ''}`}
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <span className={styles.loadingSpinner}></span>
                    <span>登入中...</span>
                  </>
                ) : (
                  "LOGIN"
                )}
              </button>
              {message && (
                <p style={{ marginTop: "10px", color: "red" }}>{message}</p>
              )}
            </form>

            <div className={styles.switchLink}>
              <a href="#" className={styles.linkText} onClick={showSignupForm}>
                還沒有帳號？註冊
              </a>
            </div>
          </div>

          {/* 註冊表單區塊 */}
          <div
            className={`${styles.formSection} ${
              !isLoginForm ? "" : styles.hidden
            }`}
            id="signupSection"
          >
            <h1 className={styles.authTitle}>SIGN UP</h1>

            <form className={styles.authForm} onSubmit={handleSignup}>
              <div className={styles.inputGroup}>
                <div className={styles.inputHeader}>
                  <div className={styles.inputIcon}>
                    <Image
                      src="/img/Vector-36.png"
                      alt="Username icon"
                      className={styles.icon}
                      width={24}
                      height={24}
                    />
                  </div>
                  <label className={styles.inputLabel}>USERNAME</label>
                </div>
                <input
                  type="text"
                  className={styles.inputField}
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  required
                />
                <div className={styles.inputUnderline}></div>
              </div>

              <div className={styles.inputGroup}>
                <div className={styles.inputHeader}>
                  <div className={styles.inputIcon}>
                    <Image
                      src="/img/Vector-6.png"
                      alt="Email icon"
                      className={styles.icon}
                      width={24}
                      height={24}
                    />
                  </div>
                  <label className={styles.inputLabel}>EMAIL</label>
                </div>
                <input
                  type="email"
                  className={styles.inputField}
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                />
                <div className={styles.inputUnderline}></div>
              </div>

              <div className={styles.inputGroup}>
                <div className={styles.inputHeader}>
                  <div className={styles.inputIcon}>
                    <Image
                      src="/img/Vector-7.png"
                      alt="Password icon"
                      className={styles.icon}
                      width={24}
                      height={24}
                    />
                  </div>
                  <label className={styles.inputLabel}>PASSWORD</label>
                </div>
                <div className={styles.passwordInputContainer}>
                  <input
                    type={showSignupPassword ? "text" : "password"}
                    className={styles.inputField}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={toggleSignupPasswordVisibility}
                  >
                    <Image
                      src="/img/Vector-39.png"
                      alt="Show password"
                      className={`${styles.icon} ${
                        showSignupPassword ? styles.hidden : ""
                      }`}
                      width={20}
                      height={20}
                    />
                    <Image
                      src="/img/Vector-38.png"
                      alt="Hide password"
                      className={`${styles.icon} ${
                        showSignupPassword ? "" : styles.hidden
                      }`}
                      width={20}
                      height={20}
                    />
                  </button>
                </div>
                <div className={styles.inputUnderline}></div>
              </div>

              <button 
                type="submit" 
                className={`${styles.authButton} ${isSigningUp ? styles.loading : ''}`}
                disabled={isSigningUp}
              >
                {isSigningUp ? (
                  <>
                    <span className={styles.loadingSpinner}></span>
                    <span>註冊中...</span>
                  </>
                ) : (
                  "SIGN UP"
                )}
              </button>
              {signupMessage && (
                <p style={{ marginTop: "10px", color: "red" }}>
                  {signupMessage}
                </p>
              )}
            </form>

            <div className={styles.switchLink}>
              <a href="#" className={styles.linkText} onClick={showLoginForm}>
                已經有帳號了？登入
              </a>
            </div>
          </div>
        </div>

        <div className={styles.splineContainer}>
          <spline-viewer
            ref={splineViewerRef}
            loading-anim-type="none"
            loading-anim-duration="0"
            url="https://prod.spline.design/WZMDq8J83oGNSegR/scene.splinecode"
            style={{
              width: "100%",
              height: "100%",
              minWidth: "400px",
              minHeight: "600px",
            }}
          />
        </div>
      </main>

      {/* 忘記密碼模態框 */}
      {showForgotPasswordModal && (
        <div className={styles.modalOverlay} onClick={closeForgotPasswordModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>忘記密碼</h2>
              <button 
                className={styles.closeButton}
                onClick={closeForgotPasswordModal}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleForgotPassword} className={styles.modalForm}>
              <div className={styles.modalInputGroup}>
                <label className={styles.modalLabel}>
                  請輸入先前註冊的電子郵件
                </label>
                <input
                  type="email"
                  className={styles.modalInput}
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  placeholder="請輸入您的電子郵件"
                  required
                />
              </div>
              
              <div className={styles.modalButtons}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={closeForgotPasswordModal}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isSubmittingForgotPassword}
                >
                  {isSubmittingForgotPassword ? "發送中..." : "發送重設連結"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}

"use client";

import { useRouter } from "next/navigation";

// 頁面跳轉鉤子 - 手機端優化版本
export const usePageTransition = () => {
  const router = useRouter();

  const navigateWithTransition = (path, direction = "right") => {
    // 檢測是否為移動設備 - 更準確的檢測
    const isMobile = () => {
      // 檢查用戶代理
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      
      // 檢查螢幕尺寸
      const screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
      const screenHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
      
      // 檢查觸控支援
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      return mobileRegex.test(userAgent) || screenWidth <= 768 || hasTouch;
    };
    
    // 如果是移動設備，直接跳轉，不使用動畫
    if (isMobile()) {
      
      router.push(path);
      return;
    }
    
    
    
    // 創建遮罩容器 
    const maskContainer = document.createElement('div');
    maskContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(12, 11, 55, 0);
      z-index: 9999;
      pointer-events: none;
      will-change: opacity;
    `;
    
    // 創建圓形視窗 
    const circleWindow = document.createElement('div');
    circleWindow.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      width: 100vw;
      height: 100vw;
      background: transparent;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      z-index: 10000;
      pointer-events: none;
      box-shadow: 0 0 0 2300px rgba(12, 11, 55, 1);
      filter: blur(10px);
      will-change: width, height;
      backface-visibility: hidden;
    `;
    
    // 創建動畫內容（已移除文字和圖片）
    const contentElement = document.createElement('div');
    contentElement.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 10001;
      pointer-events: none;
    `;
    contentElement.innerHTML = ``;
    
    // 添加到頁面
    document.body.appendChild(maskContainer);
    document.body.appendChild(circleWindow);
    document.body.appendChild(contentElement);
    
    // 強制重繪
    circleWindow.offsetHeight;
    
    // 第一階段：圓形視窗收縮（從螢幕邊緣收縮到中心點）
    requestAnimationFrame(() => {
      circleWindow.style.transition = 'all 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      circleWindow.style.width = '0';
      circleWindow.style.height = '0';
    });
    
    // 等待收縮動畫完成後，執行頁面跳轉
    setTimeout(() => {
      // 執行頁面跳轉
      router.push(path);
      
      // 等待跳轉完成後，開始第二階段：圓形視窗展開
      setTimeout(() => {
        // 第二階段：圓形視窗展開（從中心點展開到覆蓋全屏）
        requestAnimationFrame(() => {
          circleWindow.style.transition = 'all 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          circleWindow.style.width = '100vw';
          circleWindow.style.height = '100vw';
        });
        
        // 展開完成後清理所有元素
        setTimeout(() => {
          if (document.body.contains(maskContainer)) {
            document.body.removeChild(maskContainer);
          }
          if (document.body.contains(circleWindow)) {
            document.body.removeChild(circleWindow);
          }
          if (document.body.contains(contentElement)) {
            document.body.removeChild(contentElement);
          }
        }, 600); // 展開動畫時間
        
      }, 200); // 跳轉後等待時間
      
    }, 1000); // 第一階段動畫時間
  };

  return { navigateWithTransition };
};

// 登錄跳轉組件
export const LoginTransition = ({ children, onLoginClick }) => {
  const { navigateWithTransition } = usePageTransition();

  const handleLoginClick = (e) => {
    e.preventDefault();
    if (onLoginClick) {
      onLoginClick();
    }
    navigateWithTransition("/login", "right");
  };

  return (
    <div onClick={handleLoginClick} style={{ cursor: "pointer" }}>
      {children}
    </div>
  );
};

// 基礎頁面過渡組件
const PageTransition = ({ children, isTransitioning = false, direction = "right" }) => {
  return (
    <div>
      {children}
    </div>
  );
};

export default PageTransition; 
// 警告對話框模塊
export const showCustomAlert = (message, callback) => {
    const alertModal = document.createElement('div');
    alertModal.className = 'custom-alert-modal';
    alertModal.innerHTML = `
        <div class="custom-alert-content">
            <div class="custom-alert-message">${message}</div>
            <button class="custom-alert-btn" onclick="closeCustomAlert()">確定</button>
        </div>
    `;
    
    document.body.appendChild(alertModal);
    
    // 存儲回調函數
    window.customAlertCallback = callback;
    
    // 禁用背景滾動
    document.body.style.overflow = 'hidden';
    
    // 添加動畫
    setTimeout(() => {
        alertModal.classList.add('active');
    }, 10);
};

export const closeCustomAlert = () => {
    const alertModal = document.querySelector('.custom-alert-modal');
    if (alertModal) {
        alertModal.classList.remove('active');
        
        setTimeout(() => {
            document.body.removeChild(alertModal);
            document.body.style.overflow = 'auto';
            
            // 執行回調函數
            if (window.customAlertCallback) {
                window.customAlertCallback();
                window.customAlertCallback = null;
            }
        }, 300);
    }
};

// 安全版本的 alert
export const safeAlert = (message, callback) => {
    if (typeof window !== 'undefined') {
        showCustomAlert(message, callback);
    }
}; 
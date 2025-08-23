// 確認對話框模塊
export const showCustomConfirm = (message, onConfirm, onCancel) => {
    const confirmModal = document.createElement('div');
    confirmModal.className = 'custom-confirm-modal';
    confirmModal.innerHTML = `
        <div class="custom-confirm-content">
            <div class="custom-confirm-message">${message}</div>
            <div class="custom-confirm-buttons">
                <button class="custom-confirm-btn custom-confirm-cancel" onclick="closeCustomConfirm(false)">取消</button>
                <button class="custom-confirm-btn custom-confirm-ok" onclick="closeCustomConfirm(true)">確定</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(confirmModal);
    
    // 存儲回調函數
    window.customConfirmCallbacks = { onConfirm, onCancel };
    
    // 禁用背景滾動
    document.body.style.overflow = 'hidden';
    
    // 添加動畫
    setTimeout(() => {
        confirmModal.classList.add('active');
    }, 10);
};

export const closeCustomConfirm = (result) => {
    const confirmModal = document.querySelector('.custom-confirm-modal');
    if (confirmModal) {
        confirmModal.classList.remove('active');
        
        setTimeout(() => {
            document.body.removeChild(confirmModal);
            document.body.style.overflow = 'auto';
            
            // 執行對應的回調函數
            if (window.customConfirmCallbacks) {
                if (result && window.customConfirmCallbacks.onConfirm) {
                    window.customConfirmCallbacks.onConfirm();
                } else if (!result && window.customConfirmCallbacks.onCancel) {
                    window.customConfirmCallbacks.onCancel();
                }
                window.customConfirmCallbacks = null;
            }
        }, 300);
    }
};

// 安全版本的 confirm
export const safeConfirm = (message, onConfirm, onCancel) => {
    if (typeof window !== 'undefined') {
        showCustomConfirm(message, onConfirm, onCancel);
    }
}; 
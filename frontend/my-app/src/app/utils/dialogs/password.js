// 密碼對話框模塊
export const showPasswordChangeDialog = (callback) => {
    const passwordModal = document.createElement('div');
    passwordModal.className = 'custom-prompt-modal';
    passwordModal.innerHTML = `
        <div class="custom-prompt-content">
            <div class="custom-prompt-title">更改密碼</div>
            <div class="password-input-group">
                <label for="oldPasswordInput">舊密碼：</label>
                <input type="password" class="custom-prompt-input" id="oldPasswordInput" placeholder="請輸入舊密碼">
            </div>
            <div class="password-input-group">
                <label for="newPasswordInput">新密碼：</label>
                <input type="password" class="custom-prompt-input" id="newPasswordInput" placeholder="請輸入新密碼">
            </div>
            <div class="custom-prompt-buttons">
                <button class="custom-prompt-btn custom-prompt-btn-secondary" onclick="closePasswordChangeDialog()">取消</button>
                <button class="custom-prompt-btn custom-prompt-btn-primary" onclick="confirmPasswordChange()">確定</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(passwordModal);
    
    // 存儲回調函數
    window.passwordChangeCallback = callback;
    
    // 禁用背景滾動
    document.body.style.overflow = 'hidden';
    
    // 添加動畫
    setTimeout(() => {
        passwordModal.classList.add('active');
        // 聚焦到第一個輸入框
        const input = document.getElementById('oldPasswordInput');
        if (input) {
            input.focus();
        }
    }, 10);
};

export const closePasswordChangeDialog = () => {
    const passwordModal = document.querySelector('.custom-prompt-modal');
    if (passwordModal) {
        passwordModal.classList.remove('active');
        
        setTimeout(() => {
            document.body.removeChild(passwordModal);
            document.body.style.overflow = 'auto';
            
            // 執行回調函數（傳入 null 表示取消）
            if (window.passwordChangeCallback) {
                window.passwordChangeCallback(null, null);
                window.passwordChangeCallback = null;
            }
        }, 300);
    }
};

export const confirmPasswordChange = () => {
    const oldPasswordInput = document.getElementById('oldPasswordInput');
    const newPasswordInput = document.getElementById('newPasswordInput');
    
    const oldPassword = oldPasswordInput ? oldPasswordInput.value.trim() : '';
    const newPassword = newPasswordInput ? newPasswordInput.value.trim() : '';
    
    const passwordModal = document.querySelector('.custom-prompt-modal');
    if (passwordModal) {
        passwordModal.classList.remove('active');
        
        setTimeout(() => {
            document.body.removeChild(passwordModal);
            document.body.style.overflow = 'auto';
            
            // 執行回調函數（傳入舊密碼和新密碼）
            if (window.passwordChangeCallback) {
                window.passwordChangeCallback(oldPassword, newPassword);
                window.passwordChangeCallback = null;
            }
        }, 300);
    }
}; 
// 輸入對話框模塊
export const showCustomPrompt = (title, callback) => {
    const promptModal = document.createElement('div');
    promptModal.className = 'custom-prompt-modal';
    promptModal.innerHTML = `
        <div class="custom-prompt-content">
            <div class="custom-prompt-title">${title}</div>
            <input type="text" class="custom-prompt-input" id="customPromptInput" placeholder="請輸入...">
            <div class="custom-prompt-buttons">
                <button class="custom-prompt-btn custom-prompt-btn-secondary" onclick="closeCustomPrompt()">取消</button>
                <button class="custom-prompt-btn custom-prompt-btn-primary" onclick="confirmCustomPrompt()">確定</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(promptModal);
    
    // 存儲回調函數
    window.customPromptCallback = callback;
    
    // 禁用背景滾動
    document.body.style.overflow = 'hidden';
    
    // 添加動畫
    setTimeout(() => {
        promptModal.classList.add('active');
        // 聚焦到輸入框
        const input = document.getElementById('customPromptInput');
        if (input) {
            input.focus();
        }
    }, 10);
};

export const closeCustomPrompt = () => {
    const promptModal = document.querySelector('.custom-prompt-modal');
    if (promptModal) {
        promptModal.classList.remove('active');
        
        setTimeout(() => {
            document.body.removeChild(promptModal);
            document.body.style.overflow = 'auto';
            
            // 執行回調函數（傳入 null 表示取消）
            if (window.customPromptCallback) {
                window.customPromptCallback(null);
                window.customPromptCallback = null;
            }
        }, 300);
    }
};

export const confirmCustomPrompt = () => {
    const input = document.getElementById('customPromptInput');
    const value = input ? input.value.trim() : '';
    
    const promptModal = document.querySelector('.custom-prompt-modal');
    if (promptModal) {
        promptModal.classList.remove('active');
        
        setTimeout(() => {
            document.body.removeChild(promptModal);
            document.body.style.overflow = 'auto';
            
            // 執行回調函數（傳入輸入值）
            if (window.customPromptCallback) {
                window.customPromptCallback(value);
                window.customPromptCallback = null;
            }
        }, 300);
    }
}; 
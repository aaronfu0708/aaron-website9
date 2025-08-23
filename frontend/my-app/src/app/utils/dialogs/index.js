// 對話框系統統一導出

// 從各個模塊導入函數
export { 
    showCustomAlert, 
    closeCustomAlert, 
    safeAlert 
} from './alert.js';

export { 
    showCustomConfirm, 
    closeCustomConfirm, 
    safeConfirm 
} from './confirm.js';

export { 
    showCustomPrompt, 
    closeCustomPrompt, 
    confirmCustomPrompt 
} from './prompt.js';

export { 
    showPasswordChangeDialog, 
    closePasswordChangeDialog, 
    confirmPasswordChange 
} from './password.js';

// 將所有函數暴露到全局 window 對象（保持向後兼容）
if (typeof window !== 'undefined') {
    // 從各個模塊導入並暴露到 window
    import('./alert.js').then(alertModule => {
        window.showCustomAlert = alertModule.showCustomAlert;
        window.closeCustomAlert = alertModule.closeCustomAlert;
        window.safeAlert = alertModule.safeAlert;
    });
    
    import('./confirm.js').then(confirmModule => {
        window.showCustomConfirm = confirmModule.showCustomConfirm;
        window.closeCustomConfirm = confirmModule.closeCustomConfirm;
        window.safeConfirm = confirmModule.safeConfirm;
    });
    
    import('./prompt.js').then(promptModule => {
        window.showCustomPrompt = promptModule.showCustomPrompt;
        window.closeCustomPrompt = promptModule.closeCustomPrompt;
        window.confirmCustomPrompt = promptModule.confirmCustomPrompt;
    });
    
    import('./password.js').then(passwordModule => {
        window.showPasswordChangeDialog = passwordModule.showPasswordChangeDialog;
        window.closePasswordChangeDialog = passwordModule.closePasswordChangeDialog;
        window.confirmPasswordChange = passwordModule.confirmPasswordChange;
    });
} 
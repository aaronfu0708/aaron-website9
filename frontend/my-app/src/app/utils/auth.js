// 登出功能
import { safeConfirm } from './dialogs';

export const safeLogout = () => {
  safeConfirm('確定要登出嗎？',
    () => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    },
    () => {
      // 使用者取消登出
    }
  );
};
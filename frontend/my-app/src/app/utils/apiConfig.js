// API配置工具 - 統一管理所有API端點
// 根據環境自動選擇正確的API端點

// 後端Django API端點
export const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'https://aaron-website9-backend.onrender.com';

// ML服務API端點
export const ML_SERVICE_BASE_URL = process.env.NEXT_PUBLIC_ML_SERVICE_URL || 'https://aaron-website9-ml.onrender.com';

// 前端網址
export const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://aaron-website9.vercel.app';

// 常用API端點
export const API_ENDPOINTS = {
  // 後端Django API端點
  BACKEND: {
    LOGIN: `${BACKEND_API_BASE_URL}/login/`,
    REGISTER: `${BACKEND_API_BASE_URL}/register/`,
    FORGOT_PASSWORD: `${BACKEND_API_BASE_URL}/forgot-password/`,
    RESET_PASSWORD: `${BACKEND_API_BASE_URL}/reset-password/`,
    RESET_PASSWORD_FROM_EMAIL: `${BACKEND_API_BASE_URL}/reset-password-from-email/`,
    USER_QUIZ_AND_NOTES: `${BACKEND_API_BASE_URL}/api/user_quiz_and_notes/`,
    SUBMIT_ANSWER: `${BACKEND_API_BASE_URL}/api/submit_answer/`,
    CREATE_QUIZ: `${BACKEND_API_BASE_URL}/api/create_quiz/`,
    ADD_FAVORITE: `${BACKEND_API_BASE_URL}/api/add-favorite/`,
    NOTES: `${BACKEND_API_BASE_URL}/api/notes/`,
    QUIZ: `${BACKEND_API_BASE_URL}/api/quiz/`,
    FAMILIARITY: `${BACKEND_API_BASE_URL}/api/familiarity/`,
    CHAT: `${BACKEND_API_BASE_URL}/api/chat/`,
    ECPAY: `${BACKEND_API_BASE_URL}/ecpay/`,
    PAYMENT_STATUS: `${BACKEND_API_BASE_URL}/payment-status/`,
    USERS: `${BACKEND_API_BASE_URL}/users/`,
  },
  
  // ML服務API端點
  ML_SERVICE: {
    GENERATE_TOPIC_FROM_NOTE: `${ML_SERVICE_BASE_URL}/api/generate_topic_from_note`,
  }
};

// 檢查是否為生產環境
export const isProduction = () => {
  return process.env.NODE_ENV === 'production';
};

// 檢查是否為開發環境
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development';
};

// 獲取當前環境的API端點
export const getCurrentApiEndpoints = () => {
  if (isProduction()) {
    return {
      backend: 'https://aaron-website9-backend.onrender.com',
      mlService: 'https://aaron-website9-ml.onrender.com',
      frontend: 'https://aaron-website9.vercel.app'
    };
  } else {
    return {
      backend: 'http://127.0.0.1:8000',
      mlService: 'http://127.0.0.1:5000',
      frontend: 'http://localhost:3000'
    };
  }
};
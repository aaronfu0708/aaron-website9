'use client';
// 自定義輸入模態框組件 - 提供用戶輸入介面，支援確認和取消操作

import { useState, useEffect } from 'react';

export default function CustomPromptModal({ isOpen, title, onClose, onConfirm, styles }) {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm(inputValue.trim());
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  return (
    <div className={`${styles['custom-prompt-modal']} ${isOpen ? styles.active : ''}`}>
      <div className={styles['custom-prompt-content']}>
        <div className={styles['custom-prompt-title']}>{title}</div>
        <input
          type="text"
          className={styles['custom-prompt-input']}
          placeholder="請輸入..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          autoFocus
        />
        <div className={styles['custom-prompt-buttons']}>
          <button className={`${styles['custom-prompt-btn']} ${styles['custom-prompt-btn-secondary']}`} onClick={onClose}>
            取消
          </button>
          <button className={`${styles['custom-prompt-btn']} ${styles['custom-prompt-btn-primary']}`} onClick={handleConfirm}>
            確定
          </button>
        </div>
      </div>
    </div>
  );
} 
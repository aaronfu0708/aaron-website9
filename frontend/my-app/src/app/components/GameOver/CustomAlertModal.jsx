'use client';
// 自定義警告模態框組件 - 顯示自定義警告訊息，提供統一的用戶提示介面

export default function CustomAlertModal({ isOpen, message, onClose, styles }) {
  return (
    <div className={`${styles['custom-alert-modal']} ${isOpen ? styles.active : ''}`}>
      <div className={styles['custom-alert-content']}>
        <div className={styles['custom-alert-message']}>{message}</div>
        <button className={styles['custom-alert-btn']} onClick={onClose}>確定</button>
      </div>
    </div>
  );
} 
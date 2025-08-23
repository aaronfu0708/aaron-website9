'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import styles from '../styles/UserPage.module.css';

export default function PlusPlanModal({ isOpen, onClose, onCancelSubscription }) {
    // 處理ESC鍵關閉模态框
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'auto';
        };
    }, [isOpen, onClose]);

    // 處理背景點擊關閉
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={handleBackdropClick}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Plus方案詳情</h2>
                    <button 
                        className={styles.modalCloseBtn}
                        onClick={onClose}
                        aria-label="關閉"
                    >
                        ✕
                    </button>
                </div>
                
                <div className={styles.modalBody}>
                    <div className={styles.planFeatures}>
                        <h3 className={styles.featuresTitle}>Plus方案包含功能：</h3>
                        <ul className={styles.featuresList}>
                            <li className={styles.featureItem}>
                                <Image src="/img/Vector-22.png" alt="功能圖標" width={20} height={20} />
                                <span>筆記功能</span>
                            </li>
                            <li className={styles.featureItem}>
                                <Image src="/img/Vector-22.png" alt="功能圖標" width={20} height={20} />
                                <span>收藏功能</span>
                            </li>
                            <li className={styles.featureItem}>
                                <Image src="/img/Vector-22.png" alt="功能圖標" width={20} height={20} />
                                <span>AI解析功能</span>
                            </li>
                            <li className={styles.featureItem}>
                                <Image src="/img/Vector-22.png" alt="功能圖標" width={20} height={20} />
                                <span>筆記生成題目功能</span>
                            </li>
                            <li className={styles.featureItem}>
                                <Image src="/img/Vector-22.png" alt="功能圖標" width={20} height={20} />
                                <span>主題不限</span>
                            </li>
                            <li className={styles.featureItem}>
                                <Image src="/img/Vector-22.png" alt="功能圖標" width={20} height={20} />
                                <span>單次題目生成三十題</span>
                            </li>
                        </ul>
                    </div>
                </div>
                
                <div className={styles.modalFooter}>
                    <button 
                        className={styles.cancelSubscriptionBtn}
                        onClick={onCancelSubscription}
                    >
                        取消訂閱
                    </button>
                </div>
            </div>
        </div>
    );
} 
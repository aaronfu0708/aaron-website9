'use client';
// 科目選擇器組件 - 提供下拉選單讓用戶選擇要收藏的科目分類

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { getSubjects, addSubject } from '../../utils/noteUtils';

// 全局下拉選單狀態管理
let globalDropdownState = {
  openType: null, // 'subject' 或 'note' 或 null
  closeCallbacks: new Set()
};

export default function SubjectSelector({ 
  subjects, 
  currentSubject, 
  onSubjectChange, 
  onShowCustomPrompt, 
  onShowCustomAlert,
  styles,
  type = 'favorite' // 可以是 'favorite', 'analysis-favorite', 'analysis-full-favorite'
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 使用 useCallback 穩定 getStyleClass 函數
  const getStyleClass = useCallback((baseClass) => {
    if (type === 'analysis-favorite') {
      return styles[`analysis-favorite-${baseClass}`];
    } else if (type === 'analysis-full-favorite') {
      return styles[`analysis-full-favorite-${baseClass}`];
    }
    return styles[`favorite-${baseClass}`];
  }, [type, styles]);

  // 註冊關閉回調
  useEffect(() => {
    const closeCallback = () => {
      if (isDropdownOpen) {
        setIsDropdownOpen(false);
      }
    };
    
    globalDropdownState.closeCallbacks.add(closeCallback);
    
    // 添加全局點擊事件監聽器
    const handleGlobalClick = (event) => {
      const target = event.target;
      const selectorContainer = target.closest(`.${getStyleClass('custom-select-container')}`);
      
      // 如果點擊的不是當前選擇器內部，則關閉下拉選單
      if (!selectorContainer && isDropdownOpen) {
        setIsDropdownOpen(false);
        globalDropdownState.openType = null;
      }
    };
    
    document.addEventListener('click', handleGlobalClick);
    
    return () => {
      globalDropdownState.closeCallbacks.delete(closeCallback);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [isDropdownOpen, getStyleClass]);

  // 關閉其他下拉選單
  const closeOtherDropdowns = () => {
    globalDropdownState.closeCallbacks.forEach(callback => {
      if (callback !== (() => setIsDropdownOpen(false))) {
        callback();
      }
    });
  };

  const handleSubjectSelect = (subject) => {
    onSubjectChange(subject);
    setIsDropdownOpen(false);
    globalDropdownState.openType = null;
  };

  const handleAddNewSubject = () => {
    onShowCustomPrompt('請輸入新主題名稱：', async (newSubject) => {
      if (newSubject && newSubject.trim()) {
        const trimmedSubject = newSubject.trim();
        
        if (subjects.includes(trimmedSubject)) {
          onShowCustomAlert('主題已存在！');
          return;
        }
        
        // 樂觀更新：立即更新UI和選擇新主題
        onSubjectChange(trimmedSubject);
        onShowCustomAlert(`主題「${trimmedSubject}」新增成功！`);
        
        // 後台靜默同步到服務器
        try {
          const result = await addSubject(trimmedSubject);
          if (!result.success) {
            console.warn('主題同步失敗:', result.message);
          }
        } catch (error) {
          // 靜默處理錯誤，不影響用戶體驗
          console.warn('主題同步失敗:', error);
        }
      }
    });
    setIsDropdownOpen(false);
    globalDropdownState.openType = null;
  };

  const handleToggleDropdown = () => {
    if (isDropdownOpen) {
      // 關閉當前下拉選單
      setIsDropdownOpen(false);
      globalDropdownState.openType = null;
    } else {
      // 關閉其他下拉選單，然後打開當前下拉選單
      closeOtherDropdowns();
      setIsDropdownOpen(true);
      globalDropdownState.openType = 'subject';
    }
  };

  return (
    <div className={getStyleClass('subject-selector')}>
      <label className={getStyleClass('filter-label')}>選擇主題</label>
      <div className={getStyleClass('select-wrapper')}>
        <div className={getStyleClass('custom-select-container')}>
          <div 
            className={getStyleClass('custom-select')} 
            onClick={handleToggleDropdown}
          >
            <span>{currentSubject}</span>
            <Image 
              src="/img/Vector-17.png" 
              className={getStyleClass('select-arrow')} 
              width={16} 
              height={16} 
              alt=""
            />
          </div>
          
          <div className={`${getStyleClass('custom-dropdown')} ${isDropdownOpen ? styles.active : ''}`}>
            {subjects.map(subject => (
              <button
                key={subject}
                className={`${getStyleClass('dropdown-option')} ${subject === currentSubject ? styles.selected : ''}`}
                onClick={() => handleSubjectSelect(subject)}
              >
                <span className={getStyleClass('option-text')}>{subject}</span>
              </button>
            ))}
            
            <div style={{ height: '1px', backgroundColor: '#eee', margin: '8px 16px' }} />
            
            <button
              className={getStyleClass('dropdown-option')}
              onClick={handleAddNewSubject}
            >
              <span className={getStyleClass('option-text')}>新增主題</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
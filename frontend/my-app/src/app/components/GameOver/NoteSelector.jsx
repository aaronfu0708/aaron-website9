'use client';
// 筆記本選擇器組件 - 提供下拉選單讓用戶選擇要收藏的筆記本

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { getNotesBySubject } from '../../utils/noteUtils';

// 全局下拉選單狀態管理（與 SubjectSelector 共享）
let globalDropdownState = {
  openType: null, // 'subject' 或 'note' 或 null
  closeCallbacks: new Set()
};

export default function NoteSelector({ 
  notes, 
  currentNoteId, 
  onNoteChange, 
  styles, 
  type = 'favorite',
  currentSubject = '' // 添加當前主題參數
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('新增筆記');
  const [filteredNotes, setFilteredNotes] = useState([]);

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
      const selectorContainer = target.closest(`.${getStyleClass('note-select-container')}`);
      
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

  // 根據當前主題過濾筆記
  useEffect(() => {
    const fetchNotesBySubject = async () => {
      if (currentSubject) {
        try {
          // 使用傳入的 notes 參數，避免重複API調用
          const subjectNotes = Array.isArray(notes) ? notes.filter(note => note.subject === currentSubject) : [];
          setFilteredNotes(subjectNotes);
        } catch (error) {
          // 靜默處理錯誤，不影響用戶體驗
          setFilteredNotes([]);
        }
      } else {
        setFilteredNotes([]);
      }
    };

    fetchNotesBySubject();
  }, [currentSubject, notes]);

  useEffect(() => {
    if (Array.isArray(filteredNotes) && filteredNotes.length > 0 && currentNoteId === null) {
      onNoteChange(filteredNotes[0].id);
    } else if (!Array.isArray(filteredNotes) || filteredNotes.length === 0) {
      onNoteChange('add_note');
    }
  }, [filteredNotes, currentNoteId, onNoteChange]);

  useEffect(() => {
    if (currentNoteId === 'add_note') {
      setSelectedText('新增筆記');
    } else {
      const selectedNote = Array.isArray(filteredNotes) ? filteredNotes.find(note => note.id === currentNoteId) : null;
      if (selectedNote) {
        const title = selectedNote.title.length > 20 
          ? selectedNote.title.substring(0, 20) + '...' 
          : selectedNote.title;
        setSelectedText(title);
      } else {
        setSelectedText('新增筆記');
      }
    }
  }, [currentNoteId, filteredNotes]);

  const handleNoteSelect = (noteId) => {
    onNoteChange(noteId);
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
      globalDropdownState.openType = 'note';
    }
  };

  return (
    <div className={getStyleClass('note-selector')}>
      <label className={getStyleClass('filter-label')}>選擇筆記</label>
      <div className={getStyleClass('note-select-wrapper')}>
        <div className={getStyleClass('note-select-container')}>
          <div 
            className={getStyleClass('note-select')} 
            onClick={handleToggleDropdown}
          >
            <span>{selectedText}</span>
            <Image 
              src="/img/Vector-17.png" 
              className={getStyleClass('note-select-arrow')} 
              width={16} 
              height={16} 
              alt=""
            />
          </div>
          
          <div className={`${getStyleClass('note-dropdown')} ${isDropdownOpen ? styles.active : ''}`}>
            {Array.isArray(filteredNotes) && filteredNotes.length > 0 ? (
              filteredNotes.map(note => (
                <button
                  key={note.id}
                  className={`${getStyleClass('note-dropdown-option')} ${note.id === currentNoteId ? styles.selected : ''}`}
                  onClick={() => handleNoteSelect(note.id)}
                >
                  <span className={getStyleClass('note-option-text')}>
                    {note.title.length > 20 ? note.title.substring(0, 20) + '...' : note.title}
                  </span>
                </button>
              ))
            ) : (
              <div style={{ padding: '14px 18px', color: '#999', textAlign: 'center' }}>
                該主題下暫無筆記
              </div>
            )}
            
            <div style={{ height: '1px', backgroundColor: '#eee', margin: '8px 16px' }} />
            
            <button
              className={`${getStyleClass('note-dropdown-option')} ${currentNoteId === 'add_note' ? styles.selected : ''}`}
              onClick={() => handleNoteSelect('add_note')}
            >
              <span className={getStyleClass('note-option-text')}>新增筆記</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
'use client';
// 內容編輯器組件 - 提供 Markdown 編輯和預覽功能，支援即時預覽切換

import { useEffect, useRef } from 'react';

export default function ContentEditor({ 
  content, 
  onChange, 
  isPreviewMode, 
  onTogglePreview,
  styles
}) {
  const previewRef = useRef(null);

  const parseMarkdown = (text) => {
    return text
      // 標題
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // 粗體
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // 斜體
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // 程式碼
      .replace(/`(.*?)`/g, '<code>$1</code>')
      // 列表
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      // 分隔線
      .replace(/^---$/gim, '<hr>')
      // 換行
      .replace(/\n/g, '<br>');
  };

  const updateContentPreview = () => {
    if (previewRef.current) {
      const parsedContent = parseMarkdown(content);
      previewRef.current.innerHTML = parsedContent;
    }
  };

  // 當內容或預覽模式改變時更新預覽
  useEffect(() => {
    if (isPreviewMode && content) {
      // 使用 setTimeout 確保 DOM 已經渲染
      setTimeout(() => {
        updateContentPreview();
      }, 0);
    }
  }, [content, isPreviewMode]);

  return (
    <div className={styles['content-editor']}>
      <button 
        className={styles['content-toggle']} 
        onClick={onTogglePreview}
      >
        {isPreviewMode ? '編輯' : '完成'}
      </button>
      
      <textarea
        className={styles['content-textarea']}
        placeholder="請輸入或編輯內容..."
        value={content}
        onChange={(e) => onChange(e.target.value)}
        style={{ display: isPreviewMode ? 'none' : 'block' }}
      />
      
      <div 
        ref={previewRef}
        className={`${styles['content-preview']} ${isPreviewMode ? styles.active : ''}`}
        style={{ display: isPreviewMode ? 'block' : 'none' }}
      />
    </div>
  );
} 
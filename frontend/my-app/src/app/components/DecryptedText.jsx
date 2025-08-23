"use client";

import { useEffect, useState, useRef } from "react";
import styles from "../styles/DecryptedText.module.css";

const DecryptedText = ({ 
  text, 
  onComplete, 
  speed = 100, 
  scrambleSpeed = 200,
  className = "" 
}) => {
  const [displayText, setDisplayText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [scrambleText, setScrambleText] = useState("");
  const intervalRef = useRef(null);
  const scrambleIntervalRef = useRef(null);

  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";

  const generateFullScrambleText = () => {
    let result = "";
    for (let i = 0; i < text.length; i++) {
      result += characters[Math.floor(Math.random() * characters.length)];
    }
    return result;
  };

  // 當文字改變時重置解密狀態
  useEffect(() => {
    if (text) {
      setDisplayText("");
      setIsComplete(false);
    }
  }, [text]);

  // 亂碼文字一直跑動效果 - 只在組件掛載時初始化一次
  useEffect(() => {
    // 立即生成一次亂碼
    setScrambleText(generateFullScrambleText());
    
    // 持續更新亂碼，不管動畫是否完成
    scrambleIntervalRef.current = setInterval(() => {
      setScrambleText(generateFullScrambleText());
    }, scrambleSpeed);

    return () => {
      if (scrambleIntervalRef.current) {
        clearInterval(scrambleIntervalRef.current);
      }
    };
  }, []); // 空依賴數組，只在組件掛載時執行一次

  useEffect(() => {
    if (!text) return;

    let currentLength = 0;
    const targetText = text;

    // 開始解密動畫
    intervalRef.current = setInterval(() => {
      if (currentLength <= targetText.length) {
        setDisplayText(targetText.substring(0, currentLength));
        currentLength++;
      } else {
        clearInterval(intervalRef.current);
        setIsComplete(true);
        onComplete?.();
      }
    }, speed);

    // 清理函數
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [text, speed, onComplete]);

  return (
    <div className={`${styles.decryptedText} ${className}`}>
      {/* 故障背景，保持不動 */}
      <div className={styles.glitchBackground}>
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} className={styles.glitchLine}>
            {Array.from({ length: 40 }, (_, j) => (
              <span 
                key={j} 
                className={styles.glitchChar}
                style={{ '--char-index': j }}
              >
                {characters[Math.floor(Math.random() * characters.length)]}
              </span>
            ))}
          </div>
        ))}
      </div>
      
      {/* 解密文字，亂碼與文字合併顯示 */}
      <div className={styles.textContainer}>
        {text.split("").map((char, i) => {
          const isDecoded = i < displayText.length;
          return (
            <span 
              key={i} 
              className={isDecoded ? styles.mainText : styles.scrambleText}
            >
              {isDecoded ? char : scrambleText[i] || " "}
            </span>
          );
        })}
      </div>
      {!isComplete}
    </div>
  );
};

export default DecryptedText;

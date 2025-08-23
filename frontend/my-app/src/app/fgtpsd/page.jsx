"use client";

import { useState } from "react";
import { API_ENDPOINTS } from "../utils/apiConfig";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Header from "../components/Header";
import styles from "../styles/fgtpsd.module.css";
import { safeAlert } from "../utils/dialogs";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 重置密碼欄位綁定狀態
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 處理重設密碼
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!newPassword.trim() || !confirmPassword.trim()) {
      safeAlert("請填寫所有欄位");
      return;
    }

    if (newPassword !== confirmPassword) {
      safeAlert("兩次輸入的密碼不一致");
      return;
    }

    if (newPassword.length < 6) {
      safeAlert("密碼長度至少需要6個字符");
      return;
    }

    setIsSubmitting(true);

    const urlParams = new URLSearchParams(window.location.search);
    const uid = urlParams.get("uid");
    try {
      const res = await fetch(
        API_ENDPOINTS.BACKEND.RESET_PASSWORD_FROM_EMAIL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uid: uid,
            new_password: confirmPassword,
          }),
        }
      );

      if (!res.ok) {
        throw new Error("重設失敗");
      }

      const data = await res.json();
      safeAlert("密碼重設成功，請使用新密碼登入");
      router.push("/login");
    } catch (err) {
      safeAlert("重設失敗，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 返回登入頁面
  const goBackToLogin = () => {
    router.push("/login");
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <>
      <Header showAuthNav={true} />

      <main className={styles.authMain}>
        <div className={styles.authContainer}>
          <div className={styles.formSection}>
            <h1 className={styles.authTitle}>重設密碼</h1>

            <form className={styles.authForm} onSubmit={handleResetPassword}>
              <div className={styles.inputGroup}>
                <div className={styles.inputHeader}>
                  <div className={styles.inputIcon}>
                    <Image
                      src="/img/Vector-7.png"
                      alt="Password icon"
                      className={styles.icon}
                      width={24}
                      height={24}
                    />
                  </div>
                  <label className={styles.inputLabel}>新密碼</label>
                </div>
                <div className={styles.passwordInputContainer}>
                  <input
                    type={showPassword ? "text" : "password"}
                    className={styles.inputField}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="請輸入新密碼"
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={togglePasswordVisibility}
                  >
                    <Image
                      src="/img/Vector-39.png"
                      alt="Show password"
                      className={`${styles.icon} ${
                        showPassword ? styles.hidden : ""
                      }`}
                      width={20}
                      height={20}
                    />
                    <Image
                      src="/img/Vector-38.png"
                      alt="Hide password"
                      className={`${styles.icon} ${
                        showPassword ? "" : styles.hidden
                      }`}
                      width={20}
                      height={20}
                    />
                  </button>
                </div>
                <div className={styles.inputUnderline}></div>
              </div>

              <div className={styles.inputGroup}>
                <div className={styles.inputHeader}>
                  <div className={styles.inputIcon}>
                    <Image
                      src="/img/Vector-7.png"
                      alt="Confirm password icon"
                      className={styles.icon}
                      width={24}
                      height={24}
                    />
                  </div>
                  <label className={styles.inputLabel}>確認密碼</label>
                </div>
                <div className={styles.passwordInputContainer}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className={styles.inputField}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="請再次輸入新密碼"
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={toggleConfirmPasswordVisibility}
                  >
                    <Image
                      src="/img/Vector-39.png"
                      alt="Show password"
                      className={`${styles.icon} ${
                        showConfirmPassword ? styles.hidden : ""
                      }`}
                      width={20}
                      height={20}
                    />
                    <Image
                      src="/img/Vector-38.png"
                      alt="Hide password"
                      className={`${styles.icon} ${
                        showConfirmPassword ? "" : styles.hidden
                      }`}
                      width={20}
                      height={20}
                    />
                  </button>
                </div>
                <div className={styles.inputUnderline}></div>
              </div>

              <button
                type="submit"
                className={styles.authButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? "重設中..." : "重設密碼"}
              </button>
            </form>

            <div className={styles.switchLink}>
              <a href="#" className={styles.linkText} onClick={goBackToLogin}>
                返回登入頁面
              </a>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

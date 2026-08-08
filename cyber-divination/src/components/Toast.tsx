"use client";

// 轻量 toast：固定底部提示，自动消失。被每日一签/问一事/应验簿/分享卡复用。
import { useCallback, useRef, useState } from "react";

export default function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}

// 同时支持命名导入（Toast, useToast）
export { Toast };

export function useToast(): { toast: string; showToast: (msg: string) => void } {
  const [toast, setToast] = useState("");
  const timerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setToast(""), 2400);
  }, []);

  return { toast, showToast };
}

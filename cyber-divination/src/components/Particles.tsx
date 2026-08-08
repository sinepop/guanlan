"use client";

import { useEffect, useRef } from "react";

interface Props {
  count?: number;
}

// 微光粒子：玄黑底上漂浮的金色光点
export default function Particles({ count = 30 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      p.style.left = Math.random() * 100 + "%";
      p.style.width = p.style.height = 1 + Math.random() * 2 + "px";
      p.style.animationDuration = 8 + Math.random() * 12 + "s";
      p.style.animationDelay = Math.random() * 10 + "s";
      p.style.animationName = "float";
      p.style.animationTimingFunction = "linear";
      p.style.animationIterationCount = "infinite";
      frag.appendChild(p);
    }
    el.appendChild(frag);
    return () => {
      el.innerHTML = "";
    };
  }, [count]);

  return <div ref={ref} className="particles" aria-hidden />;
}
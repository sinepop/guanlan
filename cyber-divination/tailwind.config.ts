import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 玄黑底
        ink: {
          DEFAULT: "#0a0a0f",
          card: "#12121c",
          deep: "#050508",
        },
        // 鎏金
        gold: {
          DEFAULT: "#c9a227",
          light: "#e8c96a",
          dark: "#8a6d1a",
        },
        // 朱砂
        vermilion: {
          DEFAULT: "#d4a574",
        },
        // 辰砂红（梅花动爻、印章、警示）
        cinnabar: {
          DEFAULT: "#b94a3d",
          light: "#e48a7e",
        },
        // 文字
        mist: {
          DEFAULT: "#e8e6e0",
          dim: "#8a8698",
        },
        border: "rgba(201,162,39,0.25)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        serif: ["var(--font-title)"],
        body: ["var(--font-body)"],
        sans: ["var(--font-ui)"],
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        "gold-glow": "0 0 30px rgba(201,162,39,0.4)",
        "gold-soft": "0 0 16px rgba(201,162,39,0.15)",
        card: "0 4px 24px rgba(0,0,0,0.3)",
      },
      keyframes: {
        float: {
          "0%": { transform: "translateY(100vh) scale(0)", opacity: "0" },
          "10%": { opacity: "0.8" },
          "90%": { opacity: "0.8" },
          "100%": { transform: "translateY(-10vh) scale(1)", opacity: "0" },
        },
        spin: {
          to: { transform: "rotate(360deg)" },
        },
        "spin-reverse": {
          to: { transform: "rotate(-360deg)" },
        },
        pulse: {
          "0%,100%": { boxShadow: "0 0 20px rgba(201,162,39,0.2)" },
          "50%": { boxShadow: "0 0 40px rgba(201,162,39,0.5)" },
        },
        needle: {
          "0%,100%": { transform: "translate(-50%,-100%) rotate(0deg)" },
          "50%": { transform: "translate(-50%,-100%) rotate(30deg)" },
        },
        shimmer: {
          "0%": { left: "-100%" },
          "100%": { left: "100%" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.8)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "shake-slow": {
          "0%,100%": { transform: "rotate(-2deg)" },
          "50%": { transform: "rotate(2deg)" },
        },
      },
      animation: {
        float: "float linear infinite",
        spin: "spin 8s linear infinite",
        "spin-reverse": "spin-reverse 5s linear infinite",
        pulse: "pulse 2s ease-in-out infinite",
        needle: "needle 3s ease-in-out infinite",
        "fade-up": "fade-up 0.6s cubic-bezier(0.22,0.9,0.35,1.2) forwards",
        "fade-in": "fade-in 0.6s ease forwards",
        "pop-in": "pop-in 0.4s ease forwards",
        "shake-slow": "shake-slow 0.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;

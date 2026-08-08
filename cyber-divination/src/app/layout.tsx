import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "观澜 · 玄机推演",
  description: "观星璇玑、观澜知变，融合传统术数推演与现代科技美学的玄学平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        {/* 主字体得意黑已自托管（@font-face）；Noto 兜底回退，运行时由浏览器加载 */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

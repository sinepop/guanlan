/** @type {import('next').NextConfig} */
const nextConfig = {
  // 静态导出：全站纯客户端渲染，配合 Cloudflare Pages Functions 提供 /api/divine
  output: "export",
};

export default nextConfig;

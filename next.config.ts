import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许使用 better-sqlite3 等 native 模块
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI行情判官 - 多模型共识预测引擎",
  description: "基于 DeepSeek、Gemini、Grok 三大 AI 模型的比特币价格预测平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-premium bg-noise min-h-screen">
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg-card)]/90 backdrop-blur-xl">
            <div className="px-6 h-14 flex items-center justify-between">
              <a href="/" className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-500/20 group-hover:ring-emerald-400/40 transition-all">
                  <img src="/logo.png" alt="AI行情判官" className="w-full h-full object-cover" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-semibold text-[var(--color-text-primary)] group-hover:text-emerald-400 transition-colors">AI行情判官</span>
                  <span className="text-xs text-[var(--color-text-muted)] font-mono">v1.0</span>
                </div>
              </a>

              <nav className="flex items-center gap-1">
                <a href="/" className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-hover)] rounded-lg transition-all">
                  实时监控
                </a>
                <a href="/history" className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] rounded-lg transition-all">
                  历史记录
                </a>
              </nav>
            </div>
          </header>

          {/* Main */}
          <main className="flex-1 px-6 py-5">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-[var(--color-border)] py-4 bg-[var(--color-bg-card)]/80 backdrop-blur-sm">
            <div className="px-6 flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm">
                <span className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-bullish)] animate-pulse"></span>
                  系统运行中
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-500/15 text-blue-400 rounded text-xs font-medium">DeepSeek</span>
                  <span className="px-2 py-0.5 bg-purple-500/15 text-purple-400 rounded text-xs font-medium">Gemini</span>
                  <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded text-xs font-medium">Grok</span>
                </div>
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">
                仅供参考，不构成投资建议
              </span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

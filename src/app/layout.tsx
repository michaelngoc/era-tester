import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eraweb Tester Hub - QA/QC & Git Impact Suite",
  description: "Hệ thống quản lý kịch bản kiểm thử, sơ đồ luồng người dùng và phân tích thay đổi Git",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-sky-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

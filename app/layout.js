import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext"; // <-- 1. IMPORT AUTHPROVIDER

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// (Tôi cũng cập nhật metadata cho bạn)
export const metadata = {
  title: "Project Management App",
  description: "Ứng dụng quản lý dự án",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* THÊM bg-gray-50 và text-gray-900 VÀO ĐÂY */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased custom-scrollbar bg-gray-50 text-gray-900`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
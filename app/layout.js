// app/layout.js
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from 'react-hot-toast'; // Thông báo

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Project Management App",
  description: "Ứng dụng quản lý dự án",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased custom-scrollbar bg-gray-50 text-gray-900`}>
        <AuthProvider>
            {/* Toaster để hiện thông báo */}
            <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
            
            {children}
        </AuthProvider>
      </body>
    </html>
  );
}
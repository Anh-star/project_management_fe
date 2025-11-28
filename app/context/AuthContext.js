"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// URL của API backend
const API_URL = "/api/v1";

// 1. Tạo Context
const AuthContext = createContext();

// 2. Tạo Provider (Component "Nhà cung cấp")
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // Trạng thái "đang tải"
  const router = useRouter();

  // 3. Tự động kiểm tra đăng nhập khi tải ứng dụng
  useEffect(() => {
    // Lấy token và user từ localStorage (nếu có)
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false); // Hoàn tất kiểm tra
  }, []);

  // 4. Hàm Đăng nhập
  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Lưu vào State
      setUser(data.user);
      setToken(data.token);

      // Lưu vào localStorage
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);

      // Chuyển hướng
      router.push("/dashboard");
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      throw error; // Ném lỗi ra để component Login có thể bắt
    }
  };

  // 5. Hàm Đăng xuất
  const logout = () => {
    // Xóa khỏi State
    setUser(null);
    setToken(null);

    // Xóa khỏi localStorage
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    // Chuyển về trang login
    router.push("/login");
  };

  // 6. Hàm Đăng ký (Tương tự login)
  const register = async (username, email, password) => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Tự động đăng nhập sau khi đăng ký thành công
      // (Bạn có thể bỏ qua bước này và bắt người dùng đăng nhập lại)
      await login(email, password);
      return true;
    } catch (error) {
      console.error("Register failed:", error);
      throw error;
    }
  };

  // 7. Cung cấp giá trị cho toàn bộ ứng dụng
  const value = {
    user,
    token,
    loading,
    login,
    logout,
    register,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Chỉ hiển thị nội dung ứng dụng khi đã kiểm tra xong 
              (tránh lỗi "nhấp nháy" khi load trang) 
            */}
      {!loading && children}
    </AuthContext.Provider>
  );
}

// 8. Tạo custom hook (để dễ dàng sử dụng)
export function useAuth() {
  return useContext(AuthContext);
}

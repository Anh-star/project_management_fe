"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Menu cơ bản
  const menuItems = [
    { name: "Tổng quan", href: "/dashboard", icon: "📊" },
    { name: "Dự án", href: "/projects", icon: "📁" },
  ];

  // Menu cho Admin/PM
  if (user?.role === "ADMIN" || user?.role === "PM") {
    menuItems.push({ name: "Phân bổ", href: "/resources", icon: "⚖️" });
  }

  // Menu cho Admin
  if (user?.role === "ADMIN") {
    menuItems.push({ name: "Thành viên", href: "/users", icon: "👥" });
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col sticky top-0 h-screen z-30">
      <div className="p-6 border-b border-gray-200">
        <a
          href="/dashboard"
          className="flex items-center gap-2 no-underline mb-6"
        >
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
            P
          </div>
          <span className="text-xl font-bold text-gray-800 tracking-tight">
            PM App
          </span>
        </a>

        <div className="px-3 py-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col">
          <span className="text-xs text-gray-400 uppercase font-semibold mb-1">
            Đang đăng nhập
          </span>
          <p
            className="text-sm font-bold text-gray-900 truncate"
            title={user?.email}
          >
            {user?.username || "User"}
          </p>
          <div className="flex mt-1">
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-bold border ${user?.role === "ADMIN" ? "bg-red-50 text-red-600 border-red-100" : user?.role === "PM" ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-green-50 text-green-600 border-green-100"}`}
            >
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          let isActive = false;
          if (item.href === "/dashboard") isActive = pathname === "/dashboard";
          else if (item.href === "/projects")
            isActive =
              pathname.startsWith("/projects") ||
              pathname.startsWith("/project-details");
          else isActive = pathname.startsWith(item.href);

          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 group mb-1 ${isActive ? "bg-indigo-50 text-indigo-700 font-bold shadow-sm border border-indigo-100" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent"}`}
            >
              <span
                className={`mr-3 text-xl transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-110"}`}
              >
                {item.icon}
              </span>
              {item.name}
            </a>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <button
          onClick={logout}
          className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
        >
          <span className="mr-2 text-lg">🚪</span> Đăng xuất
        </button>
      </div>
    </aside>
  );
}

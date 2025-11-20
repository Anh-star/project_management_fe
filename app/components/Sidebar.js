'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
    const pathname = usePathname(); // Lấy đường dẫn hiện tại để highlight menu
    const { user, logout } = useAuth();

    // Danh sách menu cơ bản
    const menuItems = [
        { 
            name: 'Tổng quan', 
            href: '/dashboard', 
            icon: '📊' 
        },
        { 
            name: 'Dự án', 
            href: '/projects', 
            icon: '📁' 
        },
    ];

    // CHỈ HIỂN THỊ MENU "THÀNH VIÊN" NẾU LÀ ADMIN
    if (user?.role === 'ADMIN') {
        menuItems.push({ 
            name: 'Thành viên', 
            href: '/users', 
            icon: '👥' 
        });
    }

    return (
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col sticky top-0 h-screen">
            <div className="p-6 border-b border-gray-200">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                        P
                    </div>
                    <span className="text-xl font-bold text-gray-800 tracking-tight">PM App</span>
                </Link>
                
                <div className="mt-4 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">
                        {user?.username || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 uppercase font-bold mt-0.5">
                        {user?.role}
                    </p>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                {menuItems.map((item) => {
                    // Kiểm tra active: 
                    // - Trang chủ dashboard phải khớp chính xác
                    // - Các trang con (VD: /projects/1) vẫn highlight menu cha (/projects)
                    const isActive = item.href === '/dashboard' 
                        ? pathname === '/dashboard'
                        : pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 group ${
                                isActive 
                                    ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm' 
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                            <span className={`mr-3 text-lg transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                                {item.icon}
                            </span>
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-200">
                <button
                    onClick={logout}
                    className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                    <span className="mr-2">🚪</span>
                    Đăng xuất
                </button>
            </div>
        </aside>
    );
}
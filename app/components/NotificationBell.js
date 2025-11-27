'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = '/api/v1';

export default function NotificationBell() {
    const { token } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);

    const fetchNotifications = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.is_read).length);
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 10000);
        return () => clearInterval(interval);
    }, [token]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkRead = async (id) => {
        try {
            await fetch(`${API_URL}/notifications/${id}/read`, {
                method: 'PATCH', headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (e) {}
    };

    const handleMarkAllRead = async () => {
        try {
            await fetch(`${API_URL}/notifications/read-all`, {
                method: 'PATCH', headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (e) {}
    };

    // --- HÀM MỚI: XÓA THÔNG BÁO ---
    const handleDelete = async (e, id) => {
        e.stopPropagation(); // Ngăn không cho click lan ra thẻ cha (gây mark read)
        try {
            const res = await fetch(`${API_URL}/notifications/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                // Xóa khỏi state ngay lập tức
                setNotifications(prev => {
                    const target = prev.find(n => n.id === id);
                    const newList = prev.filter(n => n.id !== id);
                    // Nếu xóa tin chưa đọc thì giảm count
                    if (target && !target.is_read) setUnreadCount(c => Math.max(0, c - 1));
                    return newList;
                });
            }
        } catch (error) {
            console.error('Lỗi xóa thông báo', error);
        }
    };

    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return `${date.getHours()}:${date.getMinutes()} - ${date.getDate()}/${date.getMonth()+1}`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border border-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-fade-in overflow-hidden origin-top-right">
                    <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-sm text-gray-700">Thông báo</h3>
                        {unreadCount > 0 && (
                            <button onClick={handleMarkAllRead} className="text-xs text-indigo-600 hover:underline font-medium">
                                Đọc tất cả
                            </button>
                        )}
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-xs">Không có thông báo mới</div>
                        ) : (
                            notifications.map(noti => (
                                <div 
                                    key={noti.id} 
                                    onClick={() => !noti.is_read && handleMarkRead(noti.id)}
                                    className={`p-3 border-b border-gray-50 cursor-pointer transition-colors relative group ${noti.is_read ? 'bg-white opacity-60 hover:bg-gray-50' : 'bg-blue-50/40 hover:bg-blue-50'}`}
                                >
                                    {/* Nút Xóa (Hiện khi hover) */}
                                    <button 
                                        onClick={(e) => handleDelete(e, noti.id)}
                                        className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all z-10"
                                        title="Xóa thông báo"
                                    >
                                        ×
                                    </button>

                                    <div className="flex justify-between items-start mb-1 pr-5">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                            noti.type === 'OVERDUE' ? 'bg-red-100 text-red-600' : 
                                            noti.type === 'ASSIGN' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {noti.type}
                                        </span>
                                        <span className="text-[10px] text-gray-400">{formatTime(noti.created_at)}</span>
                                    </div>
                                    <p className={`text-sm text-gray-800 mb-0.5 ${!noti.is_read ? 'font-semibold' : ''}`}>{noti.title}</p>
                                    <p className="text-xs text-gray-500 line-clamp-2 leading-snug">{noti.message}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
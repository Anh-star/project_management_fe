'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

const API_URL = '/api/v1';

export default function DashboardPage() {
    const { user, token, loading, logout } = useAuth();
    const router = useRouter();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [isLoadingData, setIsLoadingData] = useState(true);

    // State cho Admin View
    const [usersList, setUsersList] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    // 1. Fetch User List (Chỉ dành cho Admin để fill dropdown)
    useEffect(() => {
        if (user?.role === 'ADMIN' && token) {
            fetch(`${API_URL}/users?limit=100`, { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.json())
                .then(res => {
                    // Xử lý data trả về dù là dạng phân trang {data: []} hay mảng []
                    const list = res.data || res; 
                    if(Array.isArray(list)) setUsersList(list);
                })
                .catch(console.error);
        }
    }, [user, token]);

    // 2. Fetch Dashboard Data
    useEffect(() => {
        if (user && token) {
            const fetchData = async () => {
                setIsLoadingData(true);
                try {
                    let url = `${API_URL}/dashboard`;
                    // Nếu là Admin và đang chọn user khác -> thêm param userId
                    if (user.role === 'ADMIN' && selectedUserId) {
                        url += `?userId=${selectedUserId}`;
                    }

                    const res = await fetch(url, {
                        headers: { 'Authorization': `Bearer ${token}` },
                    });
                    const result = await res.json();
                    if (!res.ok) throw new Error(result.message);
                    setData(result);
                } catch (err) {
                    setError(err.message);
                } finally {
                    setIsLoadingData(false);
                }
            };
            fetchData();
        }
    }, [user, token, selectedUserId]);

    if (loading || isLoadingData || !user) {
        return <div className="flex items-center justify-center min-h-screen">Đang tải dữ liệu...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {selectedUserId ? 'Chi tiết nhân viên' : `Chào mừng, ${user.username}!`}
                    </h1>
                    <p className="text-gray-500 mt-2">Tổng quan hiệu suất công việc.</p>
                </div>

                {user.role === 'ADMIN' && (
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
                        <span className="text-sm text-gray-500 font-medium pl-2">Xem theo:</span>
                        <select 
                            className="outline-none text-sm font-bold text-indigo-700 bg-transparent cursor-pointer border-none focus:ring-0"
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                        >
                            <option value="">Toàn hệ thống</option>
                            {usersList.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.username} ({u.role})
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </header>

            {data && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fade-in">
                    <DashboardCard title="Tổng Dự Án" value={data.projects?.total_projects} />
                    <DashboardCard title="Dự Án Hoàn Thành" value={data.projects?.completed_projects} />
                    <DashboardCard title="Tổng Công Việc" value={data.tasks?.total_tasks} />
                    <DashboardCard title="Công Việc Trễ Hạn" value={data.tasks?.overdue_tasks} isWarning={true} />
                </div>
            )}
        </div>
    );
}

function DashboardCard({ title, value, isWarning = false }) {
    return (
        <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 group">
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 group-hover:scale-110 transition-transform duration-500 ${isWarning ? 'bg-red-500' : 'bg-indigo-500'}`} />
            <div className="relative z-10">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</p>
                <div className="flex items-baseline mt-2">
                    <span className={`text-4xl font-extrabold tracking-tight ${isWarning ? 'text-red-600' : 'text-gray-900'}`}>{value || 0}</span>
                </div>
            </div>
        </div>
    );
}
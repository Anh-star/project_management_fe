// app/(main)/dashboard/page.js
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

const API_URL = 'http://localhost:5000/api/v1';

export default function DashboardPage() {
    const { user, token, loading, logout } = useAuth();
    const router = useRouter();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    useEffect(() => {
        if (user && token) {
            const fetchData = async () => {
                setIsLoadingData(true);
                try {
                    const res = await fetch(`${API_URL}/dashboard`, {
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
    }, [user, token]);

    if (loading || isLoadingData || !user) {
        return <div className="flex items-center justify-center min-h-screen">Đang tải...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Chào mừng, {user.username}!</h1>
                <p className="text-gray-500 mt-2">Đây là tổng quan công việc của bạn.</p>
            </header>

            {data && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <DashboardCard title="Tổng Dự Án" value={data.projects.total_projects} />
                    <DashboardCard title="Dự Án Hoàn Thành" value={data.projects.completed_projects} />
                    <DashboardCard title="Tổng Công Việc" value={data.tasks.total_tasks} />
                    <DashboardCard title="Công Việc Trễ Hạn" value={data.tasks.overdue_tasks} isWarning={true} />
                </div>
            )}
        </div>
    );
}

// COMPONENT CARD ĐẸP
function DashboardCard({ title, value, isWarning = false }) {
    return (
        <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 group">
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 group-hover:scale-110 transition-transform duration-500 ${
                isWarning ? 'bg-red-500' : 'bg-indigo-500'
            }`} />
            
            <div className="relative z-10">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</p>
                <div className="flex items-baseline mt-2">
                    <span className={`text-4xl font-extrabold tracking-tight ${
                        isWarning ? 'text-red-600' : 'text-gray-900'
                    }`}>
                        {value || 0}
                    </span>
                </div>
            </div>
        </div>
    );
}
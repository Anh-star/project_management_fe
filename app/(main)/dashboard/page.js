'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import NotificationBell from '../../components/NotificationBell'; // <-- Import Chuông
import styles from './styles.module.css'; // Import CSS Module

const API_URL = '/api/v1';

export default function DashboardPage() {
    const { user, token, loading, logout } = useAuth();
    const router = useRouter();
    
    // State dữ liệu
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [isLoadingData, setIsLoadingData] = useState(true);

    // State cho Admin View (Xem hộ người khác)
    const [usersList, setUsersList] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');

    // 1. Check Auth
    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    // 2. Fetch User List (Chỉ Admin mới cần)
    useEffect(() => {
        if (user?.role === 'ADMIN' && token) {
            fetch(`${API_URL}/users?limit=100`, { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.json())
                .then(res => {
                    // Hỗ trợ cả 2 định dạng trả về của API (Mảng hoặc Object phân trang)
                    const list = Array.isArray(res) ? res : (res.data || []);
                    setUsersList(list);
                })
                .catch(console.error);
        }
    }, [user, token]);

    // 3. Fetch Dashboard Data
    useEffect(() => {
        if (user && token) {
            const fetchData = async () => {
                setIsLoadingData(true);
                try {
                    let url = `${API_URL}/dashboard`;
                    // Nếu Admin chọn user khác -> thêm param userId
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
        return <div className="p-8 text-center">Đang tải dữ liệu tổng quan...</div>;
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>
                        {selectedUserId ? 'Chi tiết nhân viên' : `Chào mừng, ${user.username}!`}
                    </h1>
                    <p className={styles.subtitle}>Tổng quan hiệu suất công việc.</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* --- 1. CHUÔNG THÔNG BÁO --- */}
                    <NotificationBell />

                    {/* --- 2. DROPDOWN CHỌN USER (Chỉ Admin thấy) --- */}
                    {user.role === 'ADMIN' && (
                        <div className={styles.adminFilter}>
                            <span className={styles.filterLabel}>Xem theo:</span>
                            <select 
                                className={styles.filterSelect}
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
                </div>
            </header>

            {error && <div className="text-red-500 mb-4 bg-red-50 p-3 rounded-lg border border-red-100">Lỗi: {error}</div>}

            {data && (
                <div className={styles.grid}>
                    {/* Card Thống kê */}
                    <DashboardCard 
                        title="Tổng Dự Án" 
                        value={data.projects?.total_projects} 
                    />
                    <DashboardCard 
                        title="Dự Án Hoàn Thành" 
                        value={data.projects?.completed_projects} 
                    />
                    <DashboardCard 
                        title="Tổng Công Việc" 
                        value={data.tasks?.total_tasks} 
                    />
                    <DashboardCard 
                        title="Công Việc Trễ Hạn" 
                        value={data.tasks?.overdue_tasks} 
                        isWarning={true} // Có màu đỏ cảnh báo
                    />
                </div>
            )}
        </div>
    );
}

// --- COMPONENT CON: Dashboard Card ---
function DashboardCard({ title, value, isWarning = false }) {
    return (
        // Thêm class 'group' thủ công ở đây để fix lỗi Tailwind @apply
        <div className={`${styles.card} group`}>
            {/* Background Icon mờ */}
            <div className={`${styles.cardIconBg} ${isWarning ? styles.iconBgWarning : styles.iconBgDefault}`} />
            
            <div className={styles.cardContent}>
                <p className={styles.cardLabel}>{title}</p>
                <div className={styles.cardValueContainer}>
                    <span className={`${styles.cardValue} ${isWarning ? styles.valueWarning : styles.valueDefault}`}>
                        {value || 0}
                    </span>
                </div>
            </div>
        </div>
    );
}
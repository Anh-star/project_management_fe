'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Avatar from '../../components/Avatar';
import styles from './styles.module.css';

const API_URL = '/api/v1';

export default function ResourcesPage() {
    const { user, token, loading } = useAuth();
    const router = useRouter();
    const [resources, setResources] = useState([]);

    useEffect(() => {
        if (!loading && (!user || (user.role !== 'ADMIN' && user.role !== 'PM'))) {
            router.push('/dashboard'); 
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (token) {
            fetch(`${API_URL}/resources`, { headers: { Authorization: `Bearer ${token}` } })
                .then(res => res.json())
                .then(data => setResources(data))
                .catch(err => console.error(err));
        }
    }, [token]);

    // --- SỬA HÀM NÀY: Thay text label thành số lượng, giữ nguyên màu ---
    const getLoadStatus = (count) => {
        if (count >= 5) {
            return { 
                label: `${count} Việc (Cao)`, // Text hiển thị số lượng
                style: styles.loadHeavy,      // Màu Đỏ
                color: 'bg-red-500' 
            };
        }
        if (count >= 3) {
            return { 
                label: `${count} Việc (Vừa)`, // Text hiển thị số lượng
                style: styles.loadOk,         // Màu Vàng
                color: 'bg-yellow-500' 
            };
        }
        return { 
            label: `${count} Việc (Thấp)`,    // Text hiển thị số lượng
            style: styles.loadFree,           // Màu Xanh
            color: 'bg-green-500' 
        };
    };

    if (loading) return <div className="p-8 text-center">Đang tải dữ liệu...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Phân bổ nguồn lực</h1>
                <p className={styles.subtitle}>Theo dõi khối lượng công việc thực tế của nhân sự.</p>
            </div>

            <div className={styles.grid}>
                {resources.map(staff => {
                    const count = parseInt(staff.workload_count);
                    const status = getLoadStatus(count);
                    
                    // Tính phần trăm thanh bar (Max là 10 task = 100%)
                    const percent = Math.min(count * 10, 100); 

                    return (
                        <div key={staff.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <Avatar name={staff.username} size="lg" />
                                <div className={styles.userInfo}>
                                    <div className={styles.userName}>{staff.username}</div>
                                    <div className={styles.userRole}>{staff.role}</div>
                                </div>
                                {/* Badge góc phải cũng hiển thị số */}
                                <span className={`${styles.workloadBadge} ${status.style}`}>
                                    {count}
                                </span>
                            </div>

                            {/* Thanh tải */}
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Khối lượng</span>
                                {/* Hiển thị Label mới ở đây */}
                                <span className={`font-bold ${status.style.split(' ')[1]}`}>
                                    {status.label}
                                </span>
                            </div>
                            <div className={styles.loadBarContainer}>
                                <div 
                                    className={`${styles.loadBar} ${status.color}`} 
                                    style={{ width: `${percent}%` }} 
                                />
                            </div>

                            <div className={`${styles.taskList} custom-scrollbar`}>
                                <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Đang thực hiện:</p>
                                {staff.active_tasks.length > 0 ? (
                                    staff.active_tasks.map(task => (
                                        <div key={task.id} className={styles.taskItem}>
                                            <a href={`/project-details?id=${task.project_id}`} className={`${styles.taskTitle} hover:text-indigo-600 hover:underline`}>
                                                {task.title}
                                            </a>
                                            <span className={`${styles.taskPriority} ${styles['priority' + task.priority]}`}>
                                                {task.priority}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-gray-400 italic">Hiện chưa có công việc nào.</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
// app/(main)/projects/page.js
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext'; // Đảm bảo đường dẫn import đúng
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Import Link để chuyển trang

const API_URL = 'http://localhost:5000/api/v1';

export default function ProjectsPage() {
    const { user, token, loading: authLoading, logout } = useAuth();
    const router = useRouter();

    // State danh sách dự án
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // State form tạo dự án
    const [showForm, setShowForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newCode, setNewCode] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [formError, setFormError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 1. Bảo vệ route (Chuyển về login nếu chưa đăng nhập)
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    // 2. Hàm lấy danh sách dự án
    const fetchProjects = async () => {
        if (!token) return;
        
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/projects`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.message || 'Lỗi khi tải dự án');
            
            // Kiểm tra xem data có phải là mảng không
            if (Array.isArray(data)) {
                setProjects(data);
            } else {
                setProjects([]); // Fallback nếu API trả về lạ
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Gọi fetch khi có token
    useEffect(() => {
        if (token) {
            fetchProjects();
        }
    }, [token]);

    // 3. Hàm tạo dự án mới
    const handleCreateProject = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFormError(null);

        try {
            const res = await fetch(`${API_URL}/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: newName,
                    project_code: newCode,
                    description: newDescription,
                }),
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            // Reset form và tải lại danh sách
            setShowForm(false);
            setNewName('');
            setNewCode('');
            setNewDescription('');
            fetchProjects();
        } catch (err) {
            setFormError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading || isLoading) {
        return <div className="p-8 text-center">Đang tải dữ liệu...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            {/* Header của trang */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Dự án của tôi</h1>
                
                {/* Chỉ Admin hoặc PM mới thấy nút Tạo */}
                {(user?.role === 'ADMIN' || user?.role === 'PM') && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        {showForm ? 'Hủy' : '+ Tạo dự án mới'}
                    </button>
                )}
            </div>

            {/* Form tạo dự án */}
            {showForm && (
                <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-gray-200 animate-in fade-in slide-in-from-top-4">
                    <h2 className="text-lg font-semibold mb-4">Nhập thông tin dự án</h2>
                    <form onSubmit={handleCreateProject} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="text"
                                placeholder="Tên dự án (VD: Website TMĐT)"
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                required
                            />
                            <input
                                type="text"
                                placeholder="Mã dự án (VD: WEB01) - Phải là duy nhất"
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={newCode}
                                onChange={(e) => setNewCode(e.target.value)}
                                required
                            />
                        </div>
                        <textarea
                            placeholder="Mô tả dự án..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                            rows="3"
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                        />
                        
                        {formError && <p className="text-red-600 text-sm">{formError}</p>}
                        
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:bg-gray-400"
                            >
                                {isSubmitting ? 'Đang lưu...' : 'Lưu dự án'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Hiển thị lỗi fetch */}
            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-md mb-6 border border-red-100">
                    Lỗi: {error}
                </div>
            )}

            {/* GRID DANH SÁCH DỰ ÁN */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.length > 0 ? (
                    projects.map((project) => (
                        // --- QUAN TRỌNG: Bọc toàn bộ thẻ trong Link ---
                        <Link 
                            key={project.id} 
                            href={`/projects/${project.id}`}
                            className="block group h-full" // block để link phủ kín, h-full để thẻ cao bằng nhau
                        >
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-300 transition-all h-full flex flex-col cursor-pointer">
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="text-xl font-bold text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                        {project.name}
                                    </h3>
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full shrink-0 ml-2 ${
                                        project.status === 'COMPLETED' 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-blue-50 text-blue-700'
                                    }`}>
                                        {project.status}
                                    </span>
                                </div>
                                
                                <div className="mb-4">
                                    <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                        #{project.project_code}
                                    </span>
                                </div>

                                <p className="text-gray-600 text-sm mb-6 line-clamp-2 flex-1">
                                    {project.description || 'Chưa có mô tả cho dự án này.'}
                                </p>

                                <div className="pt-4 border-t border-gray-100 mt-auto flex items-center text-indigo-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
                                    Xem công việc <span className="ml-1">&rarr;</span>
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="col-span-full text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                        <p className="text-gray-500 text-lg mb-2">Bạn chưa có dự án nào.</p>
                        {(user?.role === 'ADMIN' || user?.role === 'PM') && (
                            <p className="text-gray-400">Hãy bấm nút "+ Tạo dự án mới" ở trên để bắt đầu.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
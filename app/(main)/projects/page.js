'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Badge from '../../components/Badge';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

const API_URL = '/api/v1'; // Đường dẫn tương đối

export default function ProjectsPage() {
    const { user, token, loading: authLoading } = useAuth();
    const router = useRouter();

    const [projects, setProjects] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState(''); // Filter State
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    
    // Form state
    const [newName, setNewName] = useState('');
    const [newCode, setNewCode] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, projectId: null });
    const [isDeleting, setIsDeleting] = useState(false);

    // 1. Check Auth
    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
    }, [user, authLoading, router]);

    // 2. Fetch Projects (Có Search & Filter)
    const fetchProjects = async (keyword = '', status = '') => {
        if (!token) return;
        setIsLoading(true);
        try {
            const query = `?search=${keyword}&status=${status}`;
            const res = await fetch(`${API_URL}/projects${query}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await res.json();
            setProjects(Array.isArray(data) ? data : []);
        } catch (err) { 
            toast.error(err.message); 
        } finally { 
            setIsLoading(false); 
        }
    };

    // 3. Debounce Effect (Chờ 0.5s sau khi gõ mới tìm)
    useEffect(() => {
        if (token) {
            const timer = setTimeout(() => {
                fetchProjects(search, statusFilter);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [token, search, statusFilter]);

    // 4. Xử lý Xóa
    const openDeleteModal = (e, projectId) => {
        e.preventDefault(); // Ngăn thẻ Link chạy
        e.stopPropagation(); // Ngăn sự kiện nổi bọt
        setDeleteModal({ isOpen: true, projectId });
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            await fetch(`${API_URL}/projects/${deleteModal.projectId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            setProjects(prev => prev.filter(p => p.id !== deleteModal.projectId));
            toast.success('Đã xóa dự án');
            setDeleteModal({ isOpen: false, projectId: null });
        } catch (err) {
            toast.error('Lỗi kết nối server');
        } finally {
            setIsDeleting(false);
        }
    };

    // 5. Xử lý Tạo mới
    const handleCreateProject = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: newName, project_code: newCode, description: newDescription }),
            });
            if (!res.ok) throw new Error((await res.json()).message);
            
            setShowForm(false); 
            setNewName(''); setNewCode(''); setNewDescription('');
            fetchProjects(search, statusFilter);
            toast.success('Tạo dự án thành công!');
        } catch (err) { 
            toast.error(err.message); 
        } finally { 
            setIsSubmitting(false); 
        }
    };

    if (authLoading) return <div className="p-8 text-center">Đang tải...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {/* HEADER & FILTER TOOLBAR */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dự án của tôi</h1>
                    <p className="text-sm text-gray-500 mt-1">Theo dõi tiến độ và quản lý công việc.</p>
                </div>
                
                <div className="flex gap-3 w-full md:w-auto flex-wrap">
                    {/* Search Input */}
                    <div className="relative flex-1 md:w-48">
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm..." 
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
                    </div>

                    {/* Filter Dropdown */}
                    <select 
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm cursor-pointer"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="IN_PROGRESS">Đang thực hiện</option>
                        <option value="COMPLETED">Đã hoàn thành</option>
                    </select>

                    {/* Button Create */}
                    {(user?.role === 'ADMIN' || user?.role === 'PM') && (
                        <button 
                            onClick={() => setShowForm(!showForm)} 
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm whitespace-nowrap text-sm font-medium"
                        >
                            {showForm ? 'Hủy' : '+ Tạo mới'}
                        </button>
                    )}
                </div>
            </div>

            {/* CREATE FORM */}
            {showForm && (
                <div className="bg-white p-6 rounded-xl shadow-md mb-8 border border-gray-200 animate-fade-in">
                    <form onSubmit={handleCreateProject} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" placeholder="Tên dự án" className="w-full px-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={newName} onChange={(e) => setNewName(e.target.value)} required />
                            <input type="text" placeholder="Mã dự án" className="w-full px-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={newCode} onChange={(e) => setNewCode(e.target.value)} required />
                        </div>
                        <textarea placeholder="Mô tả..." className="w-full px-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" rows="3" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
                        <div className="flex justify-end">
                            <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors disabled:opacity-50">
                                {isSubmitting ? '...' : 'Lưu'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* PROJECT LIST GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.length > 0 ? (
                    projects.map((project) => (
                        <Link 
                            key={project.id} 
                            // Dùng Query Param để tương thích Static Export
                            href={`/project-details?id=${project.id}`} 
                            className="block group h-full"
                        >
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300 h-full flex flex-col overflow-hidden relative">
                                {/* Top Border Color */}
                                <div className={`h-1.5 w-full ${project.status === 'COMPLETED' ? 'bg-green-500' : 'bg-indigo-500'}`} />
                                
                                <div className="p-6 flex-1 flex flex-col">
                                    {/* Title & Badge */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 line-clamp-1 mb-1 transition-colors">
                                                {project.name}
                                            </h3>
                                            <p className="text-xs font-mono text-gray-400">#{project.project_code}</p>
                                        </div>
                                        <Badge value={project.status} />
                                    </div>
                                    
                                    {/* Progress Bar */}
                                    <div className="mt-auto mb-4">
                                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                                            <span>Tiến độ</span>
                                            <span className="font-bold text-gray-700">{project.progress || 0}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                            <div 
                                                className={`h-2 rounded-full transition-all duration-1000 ${project.status === 'COMPLETED' ? 'bg-green-500' : 'bg-indigo-500'}`} 
                                                style={{ width: `${project.progress || 0}%` }}
                                            />
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-1 flex justify-between">
                                            <span>{project.completed_tasks} hoàn thành</span>
                                            <span>{project.total_tasks} tổng việc</span>
                                        </div>
                                    </div>

                                    {/* Footer: Details & Delete */}
                                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                                        <span className="text-xs font-medium text-indigo-600 flex items-center group-hover:translate-x-1 transition-transform">
                                            Chi tiết →
                                        </span>
                                        {(user?.role === 'ADMIN' || user?.role === 'PM') && (
                                            <button 
                                                onClick={(e) => openDeleteModal(e, project.id)} 
                                                className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors z-10"
                                                title="Xóa dự án"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    !showForm && (
                        <div className="col-span-full text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                            <p className="text-gray-500">Không tìm thấy dự án nào.</p>
                        </div>
                    )
                )}
            </div>
            
            {/* Confirm Delete Modal */}
            <ConfirmModal 
                isOpen={deleteModal.isOpen} 
                title="Xóa dự án?" 
                message="Hành động này sẽ xóa toàn bộ công việc và dữ liệu liên quan. Không thể hoàn tác." 
                onConfirm={handleConfirmDelete} 
                onCancel={() => setDeleteModal({isOpen:false, projectId:null})} 
                isLoading={isDeleting} 
            />
        </div>
    );
}
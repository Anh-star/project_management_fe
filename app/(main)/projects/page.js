'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Badge from '../../components/Badge';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

const API_URL = 'http://localhost:5000/api/v1';

export default function ProjectsPage() {
    const { user, token, loading: authLoading } = useAuth();
    const router = useRouter();

    const [projects, setProjects] = useState([]);
    const [search, setSearch] = useState('');
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

    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
    }, [user, authLoading, router]);

    // Hàm lấy dự án (có tìm kiếm)
    const fetchProjects = async (keyword = '') => {
        if (!token) return;
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/projects?search=${keyword}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await res.json();
            setProjects(Array.isArray(data) ? data : []);
        } catch (err) { toast.error(err.message); } 
        finally { setIsLoading(false); }
    };

    // Debounce Search (Chờ 0.5s sau khi gõ xong mới tìm)
    useEffect(() => {
        if (token) {
            const timer = setTimeout(() => {
                fetchProjects(search);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [token, search]);

    const openDeleteModal = (e, projectId) => {
        e.preventDefault();
        e.stopPropagation();
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
            
            setShowForm(false); setNewName(''); setNewCode(''); setNewDescription('');
            fetchProjects();
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
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dự án của tôi</h1>
                    <p className="text-sm text-gray-500 mt-1">Theo dõi tiến độ và quản lý công việc.</p>
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm dự án..." 
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
                    </div>

                    {(user?.role === 'ADMIN' || user?.role === 'PM') && (
                        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm whitespace-nowrap">
                            {showForm ? 'Hủy' : '+ Tạo mới'}
                        </button>
                    )}
                </div>
            </div>

            {showForm && (
                <div className="bg-white p-6 rounded-xl shadow-md mb-8 border border-gray-200 animate-fade-in">
                    <form onSubmit={handleCreateProject} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" placeholder="Tên dự án" className="w-full px-4 py-2 border rounded-lg" value={newName} onChange={(e) => setNewName(e.target.value)} required />
                            <input type="text" placeholder="Mã dự án" className="w-full px-4 py-2 border rounded-lg" value={newCode} onChange={(e) => setNewCode(e.target.value)} required />
                        </div>
                        <textarea placeholder="Mô tả..." className="w-full px-4 py-2 border rounded-lg" rows="3" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
                        <div className="flex justify-end">
                            <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-lg">
                                {isSubmitting ? '...' : 'Lưu'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.length > 0 ? (
                    projects.map((project) => (
                        <Link key={project.id} href={`/projects/${project.id}`} className="block group h-full">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300 h-full flex flex-col overflow-hidden relative">
                                <div className={`h-1.5 w-full ${project.status === 'COMPLETED' ? 'bg-green-500' : 'bg-indigo-500'}`} />
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 line-clamp-1 mb-1">{project.name}</h3>
                                            <p className="text-xs font-mono text-gray-400">#{project.project_code}</p>
                                        </div>
                                        <Badge value={project.status} />
                                    </div>
                                    
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

                                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                                        <span className="text-xs font-medium text-indigo-600 flex items-center group-hover:translate-x-1 transition-transform">Chi tiết →</span>
                                        {(user?.role === 'ADMIN' || user?.role === 'PM') && (
                                            <button onClick={(e) => openDeleteModal(e, project.id)} className="text-gray-400 hover:text-red-600 p-1 rounded-md transition-colors z-10">🗑️</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    !showForm && <div className="col-span-full text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300"><p className="text-gray-500">Không tìm thấy dự án.</p></div>
                )}
            </div>
            
            <ConfirmModal 
                isOpen={deleteModal.isOpen} 
                title="Xóa dự án?" 
                message="Hành động này sẽ xóa toàn bộ công việc và dữ liệu liên quan." 
                onConfirm={handleConfirmDelete} 
                onCancel={() => setDeleteModal({isOpen:false, projectId:null})} 
                isLoading={isDeleting} 
            />
        </div>
    );
}
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';
import toast from 'react-hot-toast';

const API_URL = '/api/v1';

export default function UsersPage() {
    const { user, token } = useAuth();
    const router = useRouter();
    const [roleFilter, setRoleFilter] = useState('');

    // Data State
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total_records: 0 });
    const [loading, setLoading] = useState(true);
    
    // Filter State
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'MEMBER' });

    // --- FETCH DATA ---
    const fetchUsers = async (keyword = '', pageNum = 1, role = '') => {
        if (!token) return;
        setLoading(true);
        try {
            // Gọi API với query params chuẩn
            const res = await fetch(`${API_URL}/users?page=${pageNum}&limit=10&search=${keyword}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const data = await res.json();
            
            if (res.ok) {
                // API trả về { data: [...], pagination: {...} }
                // Nhưng nếu backend cũ trả về mảng trực tiếp, ta cần handle cả 2 trường hợp
                if (Array.isArray(data)) {
                    setUsers(data); // Fallback cho backend cũ
                } else {
                    setUsers(data.data || []);
                    setPagination(data.pagination || { page: 1, total_pages: 1, total_records: 0 });
                }
            } else {
                toast.error(data.message || 'Lỗi tải danh sách');
            }
        } catch (error) { 
            console.error(error);
            toast.error('Lỗi kết nối server');
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => {
        if (user && user.role !== 'ADMIN') router.push('/dashboard');
    }, [user, router]);

    // Debounce Search
    useEffect(() => {
        if (token) {
            const timer = setTimeout(() => {
                fetchUsers(search, page);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [token, search, page]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = editingUser ? `${API_URL}/users/${editingUser.id}` : `${API_URL}/users`;
        const method = editingUser ? 'PATCH' : 'POST';
        const payload = { ...formData };
        if (editingUser && !payload.password) delete payload.password;

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setIsModalOpen(false);
                setFormData({ username: '', email: '', password: '', role: 'MEMBER' });
                setEditingUser(null);
                fetchUsers(search, page);
                toast.success(editingUser ? 'Cập nhật thành công!' : 'Đã tạo người dùng mới!');
            } else {
                const err = await res.json();
                toast.error(err.message || 'Có lỗi xảy ra');
            }
        } catch (error) { toast.error('Lỗi kết nối server'); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc muốn xóa user này?')) return;
        try {
            const res = await fetch(`${API_URL}/users/${id}`, {
                method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success('Đã xóa người dùng');
                fetchUsers(search, page);
            } else {
                toast.error('Không thể xóa');
            }
        } catch (error) { toast.error('Lỗi khi xóa'); }
    };

    const openEdit = (u) => {
        setEditingUser(u);
        setFormData({ username: u.username, email: u.email, password: '', role: u.role });
        setIsModalOpen(true);
    };

    const openCreate = () => {
        setEditingUser(null);
        setFormData({ username: '', email: '', password: '', role: 'MEMBER' });
        setIsModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Thành viên hệ thống</h1>
                    <p className="text-sm text-gray-500 mt-1">Quản lý {pagination.total_records || users.length} tài khoản.</p>
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <input 
                            type="text" 
                            placeholder="Tìm tên hoặc email..." 
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                        <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
                    </div>

                    <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-all hover:shadow-lg whitespace-nowrap">
                        <span>+</span> Thêm mới
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                {loading && users.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Thành viên</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Vai trò</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ngày tham gia</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users.length > 0 ? users.map((u) => (
                                        <tr key={u.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <Avatar name={u.username} size="md" />
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{u.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-500">{u.email}</div></td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center"><Badge value={u.role} /></td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">{new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button onClick={() => openEdit(u)} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded-md mr-2 opacity-0 group-hover:opacity-100 transition-opacity">Sửa</button>
                                                <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">Xóa</button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="5" className="text-center py-12 text-gray-500">Không tìm thấy kết quả nào.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* PAGINATION CONTROL */}
                        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                                Trang <strong>{pagination.page}</strong> / {pagination.total_pages}
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1 text-sm border rounded bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Trước
                                </button>
                                <button 
                                    onClick={() => setPage(prev => Math.min(prev + 1, pagination.total_pages))}
                                    disabled={page >= pagination.total_pages}
                                    className="px-3 py-1 text-sm border rounded bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Sau
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white p-6 rounded-xl shadow-xl w-96 border border-gray-200">
                        <h2 className="text-lg font-bold mb-4 text-gray-800">{editingUser ? 'Sửa thông tin' : 'Thêm thành viên mới'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Username</label>
                                <input className="border border-gray-300 p-2 w-full rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required />
                            </div>
                            {!editingUser && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                                    <input type="email" className="border border-gray-300 p-2 w-full rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                                <select className="border border-gray-300 p-2 w-full rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                                    <option value="MEMBER">MEMBER</option>
                                    <option value="PM">PM</option>
                                    <option value="ADMIN">ADMIN</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">{editingUser ? 'Đổi mật khẩu (để trống nếu không đổi)' : 'Mật khẩu'}</label>
                                <input type="password" className="border border-gray-300 p-2 w-full rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!editingUser} />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-600 px-4 py-2 hover:bg-gray-100 rounded-lg">Hủy</button>
                                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-sm">Lưu</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
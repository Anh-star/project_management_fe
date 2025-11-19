// app/(main)/users/page.js
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

const API_URL = 'http://localhost:5000/api/v1';

export default function UsersPage() {
    const { user, token } = useAuth();
    const router = useRouter();
    
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null); // Nếu null là mode Tạo mới

    // Form state
    const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'MEMBER' });

    // 1. Fetch Users
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setUsers(await res.json());
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        if (user && user.role !== 'ADMIN') {
            router.push('/dashboard'); // Chặn nếu không phải Admin
        } else if (token) {
            fetchUsers();
        }
    }, [user, token]);

    // 2. Handle Submit (Create or Update)
    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = editingUser ? `${API_URL}/users/${editingUser.id}` : `${API_URL}/users`;
        const method = editingUser ? 'PATCH' : 'POST';

        // Nếu edit mà không nhập pass thì xóa field pass đi (để backend không hash chuỗi rỗng)
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
                fetchUsers();
            } else {
                const err = await res.json();
                alert(err.message);
            }
        } catch (error) { alert('Lỗi kết nối'); }
    };

    // 3. Handle Delete
    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc muốn xóa user này?')) return;
        try {
            await fetch(`${API_URL}/users/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchUsers();
        } catch (error) { alert('Lỗi khi xóa'); }
    };

    const openEdit = (u) => {
        setEditingUser(u);
        setFormData({ username: u.username, email: u.email, password: '', role: u.role }); // Password để trống
        setIsModalOpen(true);
    };

    const openCreate = () => {
        setEditingUser(null);
        setFormData({ username: '', email: '', password: '', role: 'MEMBER' });
        setIsModalOpen(true);
    };

    if (loading) return <div className="p-8">Đang tải...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Quản lý thành viên</h1>
                <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700">
                    + Thêm mới
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((u) => (
                            <tr key={u.id}>
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{u.username}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{u.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                                        u.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                                        u.role === 'PM' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => openEdit(u)} className="text-indigo-600 hover:text-indigo-900 mr-4">Sửa</button>
                                    <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:text-red-900">Xóa</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL FORM */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-96 animate-fade-in">
                        <h2 className="text-lg font-bold mb-4">{editingUser ? 'Sửa thông tin' : 'Thêm thành viên mới'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-500">Username</label>
                                <input className="border p-2 w-full rounded" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required />
                            </div>
                            {!editingUser && ( // Không cho sửa email khi edit
                                <div>
                                    <label className="block text-xs text-gray-500">Email</label>
                                    <input type="email" className="border p-2 w-full rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs text-gray-500">Role</label>
                                <select className="border p-2 w-full rounded" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                                    <option value="MEMBER">MEMBER</option>
                                    <option value="PM">PM</option>
                                    <option value="ADMIN">ADMIN</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500">{editingUser ? 'Đổi mật khẩu (để trống nếu không đổi)' : 'Mật khẩu'}</label>
                                <input type="password" className="border p-2 w-full rounded" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!editingUser} />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-500 px-3 py-1">Hủy</button>
                                <button type="submit" className="bg-indigo-600 text-white px-4 py-1 rounded hover:bg-indigo-700">Lưu</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
'use client';

import { useState, useEffect, use } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Avatar from '../../../components/Avatar';
import ConfirmModal from '../../../components/ConfirmModal';
import ProjectReport from '../../../components/ProjectReport'; // Import Component Báo cáo

const API_URL = 'http://localhost:5000/api/v1';

// --- HELPER: Format ngày ---
const formatDateForInput = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset() * 60000;
    return (new Date(date - offset)).toISOString().slice(0, 16);
};

// --- COMPONENT 1: TASK FORM (Tạo/Sửa) ---
const TaskForm = ({ onSubmit, onCancel, members, isSaving, autoFocus = false, initialData = null }) => {
    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        description: initialData?.description || '',
        start_date: formatDateForInput(initialData?.start_date),
        due_date: formatDateForInput(initialData?.due_date),
        priority: initialData?.priority || 'MEDIUM',
        assignee_id: initialData?.assignee_id || ''
    });

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    
    const handleSubmit = (e) => { 
        e.preventDefault(); 
        if (!formData.title.trim()) return; 
        onSubmit(formData); 
    };

    return (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg border border-indigo-100 shadow-sm space-y-3 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                    {initialData ? 'Chỉnh sửa công việc' : 'Tạo công việc mới'}
                </h4>
            </div>
            
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tên công việc <span className="text-red-500">*</span></label>
                <input name="title" autoFocus={autoFocus} required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={formData.title} onChange={handleChange} placeholder="Nhập tên công việc..." />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea name="description" rows="2" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={formData.description} onChange={handleChange} placeholder="Mô tả chi tiết..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Bắt đầu</label><input type="datetime-local" name="start_date" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={formData.start_date} onChange={handleChange} /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Hạn chót</label><input type="datetime-local" name="due_date" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={formData.due_date} onChange={handleChange} /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Ưu tiên</label>
                    <select name="priority" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={formData.priority} onChange={handleChange}>
                        <option value="LOW">Thấp</option>
                        <option value="MEDIUM">Trung bình</option>
                        <option value="HIGH">Cao</option>
                        <option value="URGENT">Khẩn cấp</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Giao cho ai?</label>
                    <select name="assignee_id" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={formData.assignee_id} onChange={handleChange}>
                        <option value="">-- Chưa phân công --</option>
                        {members.map(m => (<option key={m.id} value={m.id}>{m.username} ({m.email})</option>))}
                    </select>
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 mt-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">Hủy</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50">{isSaving ? 'Đang lưu...' : (initialData ? 'Cập nhật' : 'Lưu')}</button>
            </div>
        </form>
    );
};

// --- COMPONENT 2: TASK ITEM (Đệ quy) ---
const TaskItem = ({ task, level = 0, projectId, token, onRefresh, members, currentUser, onRequestDelete }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isAddingSub, setIsAddingSub] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const canUpdateStatus = currentUser?.role === 'ADMIN' || currentUser?.role === 'PM' || (task.assignee_id === currentUser?.id);
    const canFullEdit = currentUser?.role === 'ADMIN' || currentUser?.role === 'PM';

    const assigneeName = members.find(m => m.id === task.assignee_id)?.username || 'Chưa giao';
    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '';

    // Cập nhật trạng thái nhanh
    const handleStatusChange = async (val) => {
        if (!canUpdateStatus) return;
        setIsUpdatingStatus(true);
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status: val })
            });
            if (res.ok) { onRefresh(); toast.success('Đã cập nhật trạng thái'); }
        } catch(e) { toast.error('Lỗi kết nối'); } 
        finally { setIsUpdatingStatus(false); }
    };

    // Cập nhật thông tin chi tiết
    const handleUpdateInfo = async (data) => {
        setIsSaving(true);
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ ...data, assignee_id: data.assignee_id || null })
            });
            if (res.ok) { setIsEditing(false); onRefresh(); toast.success('Đã cập nhật công việc'); }
            else { toast.error('Lỗi cập nhật'); }
        } catch(e) { toast.error('Lỗi kết nối'); } 
        finally { setIsSaving(false); }
    };

    // Thêm Task Con
    const handleAddSub = async (data) => {
        setIsSaving(true);
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ ...data, parent_id: task.id, assignee_id: data.assignee_id || null })
            });
            if (res.ok) { setIsAddingSub(false); setIsExpanded(true); onRefresh(); toast.success('Đã thêm công việc con'); }
            else { toast.error('Lỗi tạo công việc'); }
        } catch(e) { toast.error('Lỗi kết nối'); } 
        finally { setIsSaving(false); }
    };

    if (isEditing) {
        return (
            <div className={`mt-4 ${level > 0 ? 'ml-8' : ''}`}>
                <TaskForm initialData={task} onSubmit={handleUpdateInfo} onCancel={() => setIsEditing(false)} members={members} isSaving={isSaving} />
            </div>
        );
    }

    return (
        <div className="relative">
            {level > 0 && <div className="absolute bg-gray-300" style={{ left: '-24px', top: '-10px', bottom: '0', width: '1px', height: 'calc(100% + 10px)' }} />}
            {level > 0 && <div className="absolute bg-gray-300" style={{ left: '-24px', top: '36px', width: '24px', height: '1px' }} />}

            <div className={`mt-4 ${level > 0 ? 'ml-8' : ''}`}>
                <div className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-xl border transition-all duration-200 relative z-10 border-gray-200 shadow-sm hover:border-indigo-300 hover:shadow">
                    
                    <div className="flex items-start gap-3 flex-1">
                        <button onClick={() => setIsExpanded(!isExpanded)} className={`mt-1 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 transition-colors ${(!task.subTasks?.length) ? 'invisible' : ''}`}>
                            <span className={`text-xs transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                        </button>
                        
                        <div className="flex flex-col w-full">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-semibold text-gray-800 ${task.status === 'DONE' ? 'line-through text-gray-400' : ''}`}>{task.title}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase border ${task.priority === 'URGENT' ? 'bg-red-100 text-red-700 border-red-200' : task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700 border-orange-200' : task.priority === 'LOW' ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>{task.priority}</span>
                                {canFullEdit && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setIsEditing(true)} className="px-1 text-gray-400 hover:text-indigo-600 transition-colors" title="Sửa">✏️</button>
                                        <button onClick={() => onRequestDelete('TASK', task.id, task.title)} className="px-1 text-gray-400 hover:text-red-600 transition-colors" title="Xóa">🗑️</button>
                                    </div>
                                )}
                            </div>
                            {task.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>}
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                <div className="flex items-center gap-1" title="Người thực hiện">👤 <span className="font-medium text-gray-700">{assigneeName}</span></div>
                                {task.due_date && (<div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-1.5 rounded" title="Hạn chót">📅 {formatDate(task.due_date)}</div>)}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-3 sm:mt-0 pl-8 sm:pl-0">
                        {canFullEdit && <button onClick={() => setIsAddingSub(!isAddingSub)} className="opacity-0 group-hover:opacity-100 text-xs font-medium text-indigo-600 hover:underline transition-opacity">+ Con</button>}
                        <select value={task.status} onChange={(e) => handleStatusChange(e.target.value)} disabled={!canUpdateStatus || isUpdatingStatus} className={`text-xs font-bold px-3 py-1.5 rounded-lg border outline-none cursor-pointer transition-colors ${task.status === 'DONE' ? 'bg-green-100 text-green-700 border-green-200' : task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-600 border-gray-200'} ${!canUpdateStatus ? 'opacity-60 cursor-not-allowed' : 'hover:bg-opacity-80'}`}>
                            <option value="TODO">TODO</option>
                            <option value="IN_PROGRESS">IN PROGRESS</option>
                            <option value="REVIEW">REVIEW</option>
                            <option value="DONE">DONE</option>
                        </select>
                    </div>
                </div>

                {isAddingSub && (
                    <div className="mt-3 ml-8"><div className="flex items-start gap-2"><span className="text-gray-300 text-2xl leading-none mt-[-5px]">↳</span><div className="flex-1"><TaskForm onSubmit={handleAddSub} onCancel={() => setIsAddingSub(false)} members={members} isSaving={isSaving} autoFocus /></div></div></div>
                )}

                {isExpanded && task.subTasks?.map(sub => (
                    <TaskItem key={sub.id} task={sub} level={level + 1} projectId={projectId} token={token} onRefresh={onRefresh} members={members} currentUser={currentUser} onRequestDelete={onRequestDelete} />
                ))}
            </div>
        </div>
    );
};

// --- TRANG CHÍNH (Page) ---
export default function ProjectTasksPage({ params }) {
    const unwrappedParams = use(params);
    const projectId = unwrappedParams.id;
    const { user, token } = useAuth();
    
    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdatingProject, setIsUpdatingProject] = useState(false);
    
    // Tabs & Modals
    const [activeTab, setActiveTab] = useState('TASKS');
    const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, id: null, title: '', message: '' });
    const [isProcessingDelete, setIsProcessingDelete] = useState(false);

    const fetchData = async () => {
        if (!token) return;
        try {
            const [resAll, resTasks, resMembers] = await Promise.all([
                fetch(`${API_URL}/projects`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/projects/${projectId}/tasks`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/projects/${projectId}/members`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (resAll.ok) {
                const all = await resAll.json();
                setProject(all.find(p => p.id === parseInt(projectId)));
            }
            if (resTasks.ok) setTasks(await resTasks.json());
            if (resMembers.ok) setMembers(await resMembers.json());
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    useEffect(() => { if (token && projectId) fetchData(); }, [token, projectId]);

    // Handlers
const handleUpdateProjectStatus = async (newStatus) => {
        if (!project) return;
        setIsUpdatingProject(true);
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            // 1. Đọc dữ liệu trả về từ Backend (kể cả khi lỗi)
            const data = await res.json();

            // 2. Kiểm tra: Nếu status không phải 200-299 (tức là có lỗi)
            if (!res.ok) {
                // Ném lỗi ra với message từ Backend (VD: "Còn 3 công việc chưa xong")
                throw new Error(data.message || 'Không thể cập nhật trạng thái');
            }

            // 3. Chỉ chạy đoạn này nếu thành công
            setProject(p => ({ ...p, status: newStatus }));
            toast.success(`Dự án đã chuyển sang: ${newStatus}`);

        } catch (e) {
            // 4. Hiển thị lỗi chính xác từ Backend
            toast.error(e.message);
            
            // (Tùy chọn) Reload lại để dropdown quay về trạng thái cũ
            // fetchData(); 
        } finally {
            setIsUpdatingProject(false);
        }
    };

    const handleCreateRootTask = async (data) => {
        setIsCreating(true); 
        try { 
            await fetch(`${API_URL}/projects/${projectId}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({...data, assignee_id: data.assignee_id || null}) }); 
            setIsCreating(false); fetchData(); toast.success('Đã tạo nhóm công việc'); 
        } catch(e){ toast.error('Lỗi tạo'); }
    };

    const handleInviteMember = async (e) => {
        e.preventDefault(); if (!inviteEmail.trim()) return; setIsInviting(true);
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ email: inviteEmail }) });
            const data = await res.json();
            if (res.ok) { toast.success('Đã thêm thành viên!'); setInviteEmail(''); fetchData(); } 
            else { toast.error(data.message || 'Lỗi mời'); }
        } catch (error) { toast.error('Lỗi kết nối'); } 
        finally { setIsInviting(false); }
    };

    const openConfirmDelete = (type, id, name) => {
        setConfirmModal({
            isOpen: true, type, id,
            title: `Xóa ${type === 'TASK' ? 'công việc' : 'thành viên'}?`,
            message: `Bạn có chắc muốn xóa ${name}?`
        });
    };

    const handleConfirmAction = async () => {
        setIsProcessingDelete(true);
        try {
            let url = confirmModal.type === 'TASK' ? `${API_URL}/projects/${projectId}/tasks/${confirmModal.id}` : `${API_URL}/projects/${projectId}/members/${confirmModal.id}`;
            const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) { toast.success('Đã xóa'); fetchData(); } else { toast.error('Không thể xóa'); }
        } catch (error) { toast.error('Lỗi kết nối'); } 
        finally { setIsProcessingDelete(false); setConfirmModal({ ...confirmModal, isOpen: false }); }
    };

    const canManageMembers = user?.role === 'ADMIN' || (user?.role === 'PM' && project?.created_by === user.id);

    if (loading) return <div className="p-8 text-center">Đang tải...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* HEADER */}
            <header className="bg-white shadow-sm p-6 mb-6 border-b border-gray-200 sticky top-0 z-20">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center max-w-5xl mx-auto gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900">{project?.name || `Dự án #${projectId}`}</h1>
                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${project?.status==='COMPLETED'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{project?.status}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                            <button onClick={() => setIsMemberModalOpen(true)} className="flex items-center gap-2 text-sm text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded-full transition-colors border border-indigo-100 font-medium">👥 {members.length} Thành viên</button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                         {(user?.role === 'ADMIN' || (user?.role === 'PM' && project?.created_by === user?.id)) ? (
                            <div className="flex items-center bg-gray-50 p-1 rounded-lg border border-gray-200">
                                <span className="text-xs text-gray-500 px-2">Trạng thái:</span>
                                <select value={project?.status || 'IN_PROGRESS'} onChange={(e) => handleUpdateProjectStatus(e.target.value)} disabled={isUpdatingProject} className="bg-white text-sm font-medium text-gray-700 px-2 py-1 rounded border-none focus:ring-0 cursor-pointer outline-none"><option value="IN_PROGRESS">Đang triển khai</option><option value="COMPLETED">Đã hoàn thành</option></select>
                            </div>
                        ) : null}
                        {(user?.role === 'ADMIN' || user?.role === 'PM') && !isCreating && activeTab === 'TASKS' && (
                            <button onClick={() => setIsCreating(true)} className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2 transition-all"><span>+</span> Việc mới</button>
                        )}
                    </div>
                </div>
            </header>

            {/* TABS */}
            <div className="max-w-5xl mx-auto px-6 border-b border-gray-200 mb-6 flex gap-6">
                <button onClick={() => setActiveTab('TASKS')} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab==='TASKS'?'border-indigo-600 text-indigo-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>Danh sách công việc</button>
                <button onClick={() => setActiveTab('REPORT')} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab==='REPORT'?'border-indigo-600 text-indigo-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>Báo cáo tiến độ</button>
            </div>

            {/* MAIN CONTENT */}
            <main className="px-6 max-w-5xl mx-auto">
                {activeTab === 'TASKS' ? (
                    <>
                        {isCreating && <div className="mb-8 bg-white p-6 rounded-xl shadow-md border border-indigo-100"><TaskForm onSubmit={handleCreateRootTask} onCancel={() => setIsCreating(false)} members={members} isSaving={false} /></div>}
                        <div className="space-y-4">
                            {tasks.length > 0 ? tasks.map((task) => (
                                <TaskItem key={task.id} task={task} projectId={projectId} token={token} onRefresh={fetchData} members={members} currentUser={user} onRequestDelete={openConfirmDelete} />
                            )) : !isCreating && <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-300"><p className="text-gray-500">Dự án chưa có công việc nào.</p></div>}
                        </div>
                    </>
                ) : (
                    <ProjectReport projectId={projectId} token={token} />
                )}
            </main>

            {/* MODAL QUẢN LÝ THÀNH VIÊN */}
            {isMemberModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white p-0 rounded-xl shadow-xl w-[500px] border border-gray-200 overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h3 className="text-lg font-bold text-gray-800">Thành viên dự án</h3><button onClick={() => setIsMemberModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button></div>
                        <div className="p-6 overflow-y-auto flex-1">
                            {canManageMembers && (
                                <form onSubmit={handleInviteMember} className="flex gap-2 mb-6">
                                    <input type="email" placeholder="Nhập email để mời..." className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                                    <button type="submit" disabled={isInviting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">{isInviting ? '...' : 'Mời'}</button>
                                </form>
                            )}
                            <div className="space-y-2">
                                {members.map(member => (
                                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={member.username} size="md" />
                                            <div><p className="font-medium text-sm text-gray-900">{member.username}</p><p className="text-xs text-gray-500">{member.email}</p></div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${member.role==='ADMIN'?'bg-red-50 text-red-600 border-red-100':member.role==='PM'?'bg-indigo-50 text-indigo-600 border-indigo-100':'bg-gray-200 text-gray-600 border-gray-300'}`}>{member.role}</span>
                                            {canManageMembers && member.id !== project?.created_by && member.id !== user.id && (
                                                <button onClick={() => openConfirmDelete('MEMBER', member.id, member.username)} className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors" title="Xóa khỏi dự án">🗑️</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 text-right"><button onClick={() => setIsMemberModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-white hover:shadow-sm rounded-lg border border-transparent hover:border-gray-200 transition-all font-medium">Đóng</button></div>
                    </div>
                </div>
            )}

            {/* MODAL XÁC NHẬN CHUNG */}
            <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={handleConfirmAction} onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })} isLoading={isProcessingDelete} />
        </div>
    );
}
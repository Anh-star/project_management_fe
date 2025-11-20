'use client';

import { useState, useEffect, use } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';

const API_URL = 'http://localhost:5000/api/v1';

// Helper format ngày
const formatDateForInput = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date - offset)).toISOString().slice(0, 16);
    return localISOTime;
};

// --- COMPONENT 1: TASK FORM (Giữ nguyên) ---
const TaskForm = ({ onSubmit, onCancel, members, isSaving, autoFocus = false, initialData = null }) => {
    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        description: initialData?.description || '',
        start_date: formatDateForInput(initialData?.start_date),
        due_date: formatDateForInput(initialData?.due_date),
        priority: initialData?.priority || 'MEDIUM',
        assignee_id: initialData?.assignee_id || ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

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
                <input type="text" name="title" autoFocus={autoFocus} required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.title} onChange={handleChange} />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mô tả chi tiết</label>
                <textarea name="description" rows="2" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.description} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Bắt đầu</label>
                    <input type="datetime-local" name="start_date" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.start_date} onChange={handleChange} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Hạn chót</label>
                    <input type="datetime-local" name="due_date" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.due_date} onChange={handleChange} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Mức độ ưu tiên</label>
                    <select name="priority" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.priority} onChange={handleChange}>
                        <option value="LOW">Thấp (Low)</option>
                        <option value="MEDIUM">Trung bình (Medium)</option>
                        <option value="HIGH">Cao (High)</option>
                        <option value="URGENT">Khẩn cấp (Urgent)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Giao cho ai?</label>
                    <select name="assignee_id" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.assignee_id} onChange={handleChange}>
                        <option value="">-- Chưa phân công --</option>
                        {members.map(m => (<option key={m.id} value={m.id}>{m.username} ({m.email})</option>))}
                    </select>
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 mt-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Hủy</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">{isSaving ? 'Đang xử lý...' : (initialData ? 'Cập nhật' : 'Tạo mới')}</button>
            </div>
        </form>
    );
};

// --- COMPONENT 2: TASK ITEM (Có thêm chức năng Xóa) ---
const TaskItem = ({ task, level = 0, projectId, token, onRefresh, members, currentUser }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isAddingSub, setIsAddingSub] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false); // <-- State xóa

    const canUpdateStatus = currentUser?.role === 'ADMIN' || currentUser?.role === 'PM' || (task.assignee_id === currentUser?.id);
    const canFullEdit = currentUser?.role === 'ADMIN' || currentUser?.role === 'PM';

    // --- XÓA TASK ---
    const handleDeleteTask = async () => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa công việc "${task.title}" và tất cả công việc con của nó không?`)) return;
        
        setIsDeleting(true);
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/tasks/${task.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                if (onRefresh) onRefresh();
            } else {
                alert('Không thể xóa công việc này.');
            }
        } catch (error) {
            console.error(error);
            alert('Lỗi kết nối.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        if (!canUpdateStatus) return;
        setIsUpdatingStatus(true);
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok && onRefresh) onRefresh();
        } catch (error) { console.error(error); } finally { setIsUpdatingStatus(false); }
    };

    const handleUpdateTaskInfo = async (formData) => {
        setIsSaving(true);
        try {
            const payload = { ...formData, assignee_id: formData.assignee_id || null };
            const res = await fetch(`${API_URL}/projects/${projectId}/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            if (res.ok) { setIsEditing(false); if (onRefresh) onRefresh(); } 
            else { alert('Lỗi khi cập nhật'); }
        } catch (error) { console.error(error); } finally { setIsSaving(false); }
    };

    const handleAddSubTask = async (formData) => {
        setIsSaving(true);
        try {
            const payload = { ...formData, parent_id: task.id, assignee_id: formData.assignee_id || null };
            const res = await fetch(`${API_URL}/projects/${projectId}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            if (res.ok) { setIsAddingSub(false); setIsExpanded(true); if (onRefresh) onRefresh(); } 
            else { alert('Lỗi khi tạo'); }
        } catch (error) { console.error(error); } finally { setIsSaving(false); }
    };

    const assigneeName = members.find(m => m.id === task.assignee_id)?.username || 'Chưa giao';
    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '';

    if (isEditing) return <div className={`mt-4 ${level > 0 ? 'ml-8' : ''}`}><TaskForm initialData={task} onSubmit={handleUpdateTaskInfo} onCancel={() => setIsEditing(false)} members={members} isSaving={isSaving} /></div>;

    return (
        <div className="relative">
            {level > 0 && <div className="absolute bg-gray-300" style={{ left: '-24px', top: '-10px', bottom: '0', width: '1px', height: 'calc(100% + 10px)' }} />}
            {level > 0 && <div className="absolute bg-gray-300" style={{ left: '-24px', top: '36px', width: '24px', height: '1px' }} />}

            <div className={`mt-4 ${level > 0 ? 'ml-8' : ''}`}>
                <div className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-xl border transition-all duration-200 relative z-10 ${isExpanded && task.subTasks?.length > 0 ? 'border-indigo-200 shadow-md' : 'border-gray-200 shadow-sm hover:border-indigo-300 hover:shadow'}`}>
                    <div className="flex items-start gap-3 flex-1">
                        <button onClick={() => setIsExpanded(!isExpanded)} className={`mt-1 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 ${(!task.subTasks || task.subTasks.length === 0) ? 'invisible' : ''}`}>
                            <span className={`text-xs transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                        </button>
                        
                        <div className="flex flex-col w-full">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-semibold text-gray-800 ${task.status === 'DONE' ? 'line-through text-gray-400' : ''}`}>{task.title}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase border ${task.priority === 'URGENT' ? 'bg-red-100 text-red-700 border-red-200' : task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700 border-orange-200' : task.priority === 'LOW' ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>{task.priority}</span>

                                {canFullEdit && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-indigo-600 px-1" title="Chỉnh sửa">✏️</button>
                                        <button onClick={handleDeleteTask} disabled={isDeleting} className="text-gray-400 hover:text-red-600 px-1" title="Xóa công việc">
                                            {isDeleting ? '...' : '🗑️'}
                                        </button>
                                    </div>
                                )}
                            </div>
                            {task.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>}
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                <div className="flex items-center gap-1" title="Người thực hiện">👤 <span className="font-medium text-gray-700">{assigneeName}</span></div>
                                {task.due_date && <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-1.5 rounded" title="Hạn chót">📅 {formatDate(task.due_date)}</div>}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-3 sm:mt-0 pl-8 sm:pl-0">
                        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'PM') && (
                            <button onClick={() => setIsAddingSub(!isAddingSub)} className="opacity-0 group-hover:opacity-100 text-xs font-medium text-indigo-600 hover:underline transition-opacity">+ Task con</button>
                        )}
                        <select value={task.status} onChange={(e) => handleStatusChange(e.target.value)} disabled={!canUpdateStatus || isUpdatingStatus} className={`text-xs font-bold px-3 py-1.5 rounded-lg border cursor-pointer outline-none transition-colors ${task.status === 'DONE' ? 'bg-green-100 text-green-700 border-green-200' : task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-600 border-gray-200'} ${!canUpdateStatus ? 'opacity-60 cursor-not-allowed' : 'hover:bg-opacity-80'}`}>
                            <option value="TODO">TODO</option>
                            <option value="IN_PROGRESS">IN PROGRESS</option>
                            <option value="REVIEW">REVIEW</option>
                            <option value="DONE">DONE</option>
                        </select>
                    </div>
                </div>

                {isAddingSub && <div className="mt-3 ml-8"><div className="flex items-start gap-2"><span className="text-gray-300 text-2xl leading-none mt-[-5px]">↳</span><div className="flex-1"><TaskForm onSubmit={handleAddSubTask} onCancel={() => setIsAddingSub(false)} members={members} isSaving={isSaving} autoFocus={true} /></div></div></div>}
                {isExpanded && task.subTasks && task.subTasks.length > 0 && (<div className="relative"><div className="absolute left-[0px] top-0 bottom-4 w-px -z-10" />{task.subTasks.map((sub) => (<TaskItem key={sub.id} task={sub} level={level + 1} projectId={projectId} token={token} onRefresh={onRefresh} members={members} currentUser={currentUser} />))}</div>)}
            </div>
        </div>
    );
};

// --- TRANG CHÍNH (PAGE) ---
export default function ProjectTasksPage({ params }) {
    const unwrappedParams = use(params);
    const projectId = unwrappedParams.id;
    const { user, token } = useAuth();
    const router = useRouter();
    
    // State
    const [project, setProject] = useState(null); // <-- State lưu thông tin dự án
    const [tasks, setTasks] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdatingProject, setIsUpdatingProject] = useState(false); // State update status dự án

    const fetchData = async () => {
        if (!token) return;
        try {
            // Fetch 3 API: Thông tin dự án, Task, Members
            // API /projects/:id chưa có trong hướng dẫn trước nhưng tôi sẽ dùng logic findById để giả lập hoặc bạn cần thêm API GET /projects/:id ở backend
            // TẠM THỜI: Dùng API /projects để lọc ra (để tránh sửa backend)
            const [resAllProjects, resTasks, resMembers] = await Promise.all([
                fetch(`${API_URL}/projects`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/projects/${projectId}/tasks`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/projects/${projectId}/members`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (resAllProjects.ok) {
                const allProjects = await resAllProjects.json();
                const currentProject = allProjects.find(p => p.id === parseInt(projectId));
                setProject(currentProject);
            }
            if (resTasks.ok) setTasks(await resTasks.json());
            if (resMembers.ok) setMembers(await resMembers.json());

        } catch (error) { console.error(error); } 
        finally { setLoading(false); }
    };

    useEffect(() => { if (token && projectId) fetchData(); }, [token, projectId]);

    const handleUpdateProjectStatus = async (newStatus) => {
        if (!project) return;
        setIsUpdatingProject(true);
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus }),
            });

            if (res.ok) {
                setProject(prev => ({ ...prev, status: newStatus }));
            } else {
                alert('Lỗi: Bạn không có quyền cập nhật dự án này.');
            }
        } catch (error) {
            alert('Lỗi kết nối.');
        } finally {
            setIsUpdatingProject(false);
        }
    };

    const handleCreateRootTask = async (formData) => {
        setIsCreating(true);
        try {
            const payload = { ...formData, assignee_id: formData.assignee_id || null };
            const res = await fetch(`${API_URL}/projects/${projectId}/tasks`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload),
            });
            if (res.ok) { setIsCreating(false); fetchData(); } else { alert('Lỗi khi tạo'); }
        } catch (error) { console.error(error); }
    };

    if (loading) return <div className="p-8 text-center">Đang tải dữ liệu...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-white shadow-sm p-6 mb-6 border-b border-gray-200 sticky top-0 z-20">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center max-w-5xl mx-auto gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900">{project?.name || `Dự án #${projectId}`}</h1>
                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${
                                project?.status === 'COMPLETED' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                            }`}>
                                {project?.status}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{project?.description}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {(user?.role === 'ADMIN' || (user?.role === 'PM' && project?.created_by === user?.id)) ? (
                            <div className="flex items-center bg-gray-50 p-1 rounded-lg border border-gray-200">
                                <span className="text-xs text-gray-500 px-2">Trạng thái:</span>
                                <select
                                    value={project?.status || 'IN_PROGRESS'}
                                    onChange={(e) => handleUpdateProjectStatus(e.target.value)}
                                    disabled={isUpdatingProject}
                                    className="bg-white text-sm font-medium text-gray-700 px-2 py-1 rounded border-none focus:ring-0 cursor-pointer outline-none"
                                >
                                    <option value="IN_PROGRESS">Đang triển khai</option>
                                    <option value="COMPLETED">Đã hoàn thành</option>
                                </select>
                            </div>
                        ) : null}

                        {(user?.role === 'ADMIN' || user?.role === 'PM') && !isCreating && (
                            <button onClick={() => setIsCreating(true)} className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2">
                                <span>+</span> Việc mới
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="px-6 max-w-5xl mx-auto">
                {isCreating && <div className="mb-8 bg-white p-6 rounded-xl shadow-md border border-indigo-100"><TaskForm onSubmit={handleCreateRootTask} onCancel={() => setIsCreating(false)} members={members} isSaving={false} /></div>}

                <div className="space-y-4">
                    {tasks.length > 0 ? (
                        tasks.map((task) => (
                            <TaskItem key={task.id} task={task} projectId={projectId} token={token} onRefresh={fetchData} members={members} currentUser={user} />
                        ))
                    ) : (
                        !isCreating && <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-300"><p className="text-gray-500">Dự án chưa có công việc nào.</p></div>
                    )}
                </div>
            </main>
        </div>
    );
}
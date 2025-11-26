'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import Avatar from '../../components/Avatar';
import ConfirmModal from '../../components/ConfirmModal';
import ProjectReport from '../../components/ProjectReport';
import styles from './styles.module.css'; // Import CSS Module

const API_URL = '/api/v1';

// Helper: Format ngày
const formatDateForInput = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset() * 60000;
    return (new Date(date - offset)).toISOString().slice(0, 16);
};

// --- COMPONENT 1: TASK FORM ---
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
        <form onSubmit={handleSubmit} className={styles.formContainer}>
            <div className={styles.formHeader}>
                <h4 className={styles.formTitle}>{initialData ? 'Chỉnh sửa công việc' : 'Tạo công việc mới'}</h4>
            </div>
            
            <div>
                <label className={styles.inputLabel}>Tên công việc <span className="text-red-500">*</span></label>
                <input name="title" autoFocus={autoFocus} required className={styles.inputField} value={formData.title} onChange={handleChange} placeholder="Nhập tên công việc..." />
            </div>

            <div>
                <label className={styles.inputLabel}>Mô tả</label>
                <textarea name="description" rows="2" className={styles.inputField} value={formData.description} onChange={handleChange} placeholder="Mô tả chi tiết..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div><label className={styles.inputLabel}>Bắt đầu</label><input type="datetime-local" name="start_date" className={styles.inputField} value={formData.start_date} onChange={handleChange} /></div>
                <div><label className={styles.inputLabel}>Hạn chót</label><input type="datetime-local" name="due_date" className={styles.inputField} value={formData.due_date} onChange={handleChange} /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={styles.inputLabel}>Ưu tiên</label>
                    <select name="priority" className={styles.inputField} value={formData.priority} onChange={handleChange}>
                        <option value="LOW">Thấp</option><option value="MEDIUM">Trung bình</option><option value="HIGH">Cao</option><option value="URGENT">Khẩn cấp</option>
                    </select>
                </div>
                <div>
                    <label className={styles.inputLabel}>Giao cho ai?</label>
                    <select name="assignee_id" className={styles.inputField} value={formData.assignee_id} onChange={handleChange}>
                        <option value="">-- Chưa phân công --</option>
                        {members.map(m => (<option key={m.id} value={m.id}>{m.username} ({m.email})</option>))}
                    </select>
                </div>
            </div>

            <div className={styles.btnGroup}>
                <button type="button" onClick={onCancel} className={styles.btnCancel}>Hủy</button>
                <button type="submit" disabled={isSaving} className={styles.btnSave}>{isSaving ? 'Đang lưu...' : (initialData ? 'Cập nhật' : 'Lưu')}</button>
            </div>
        </form>
    );
};

// --- COMPONENT 2: TASK ITEM ---
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

    const handleStatusChange = async (val) => {
        if (!canUpdateStatus) return; setIsUpdatingStatus(true);
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/tasks/${task.id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status: val })
            });
            const data = await res.json();
            if (res.ok) { onRefresh(); toast.success('Đã cập nhật trạng thái'); }
            else { toast.error(data.message || 'Lỗi cập nhật'); }
        } catch(e) { toast.error('Lỗi kết nối'); } finally { setIsUpdatingStatus(false); }
    };

    const handleUpdateInfo = async (data) => {
        setIsSaving(true);
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/tasks/${task.id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...data, assignee_id: data.assignee_id || null })
            });
            if (res.ok) { setIsEditing(false); onRefresh(); toast.success('Đã cập nhật công việc'); }
            else { toast.error('Lỗi cập nhật'); }
        } catch(e) { toast.error('Lỗi kết nối'); } finally { setIsSaving(false); }
    };

    const handleAddSub = async (data) => {
        setIsSaving(true);
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/tasks`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...data, parent_id: task.id, assignee_id: data.assignee_id || null })
            });
            if (res.ok) { setIsAddingSub(false); setIsExpanded(true); onRefresh(); toast.success('Đã thêm công việc con'); }
            else { toast.error('Lỗi tạo công việc'); }
        } catch(e) { toast.error('Lỗi kết nối'); } finally { setIsSaving(false); }
    };

    // Hàm lấy class màu cho status
    const getStatusClass = () => {
        let base = styles.statusSelectSmall;
        if (!canUpdateStatus) return `${base} opacity-50 cursor-not-allowed bg-gray-200`;
        base += ' hover:bg-opacity-80 ';
        if (task.status === 'DONE') return base + styles.statusDone;
        if (task.status === 'IN_PROGRESS') return base + styles.statusProgress;
        return base + styles.statusDefault;
    };

    if (isEditing) return <div className={`mt-4 ${level > 0 ? 'ml-8' : ''}`}><TaskForm initialData={task} onSubmit={handleUpdateInfo} onCancel={() => setIsEditing(false)} members={members} isSaving={isSaving} /></div>;

    return (
        <div className="relative">
            {level > 0 && <div className={styles.guideLineV} />}
            {level > 0 && <div className={styles.guideLineH} />}

            <div className={`mt-4 ${level > 0 ? 'ml-8' : ''}`}>
                <div className={`${styles.taskCard} group ${canUpdateStatus ? styles.taskCardActive : styles.taskCardDisabled}`}>
                    
                    <div className="flex items-start gap-3 flex-1">
                        <button onClick={() => setIsExpanded(!isExpanded)} className={`${styles.expandBtn} ${(!task.subTasks?.length) ? 'invisible' : ''}`}>
                            <span className={`text-xs transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                        </button>
                        
                        <div className="flex flex-col w-full">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`${styles.taskTitle} ${task.status === 'DONE' ? styles.taskTitleDone : ''}`}>{task.title}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase border ${
                                    task.priority === 'URGENT' ? 'bg-red-100 text-red-700 border-red-200' :
                                    task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                    'bg-blue-50 text-blue-600 border-blue-200'
                                }`}>{task.priority}</span>

                                {canFullEdit && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setIsEditing(true)} className="px-1 text-gray-400 hover:text-indigo-600 transition-colors">✏️</button>
                                        <button onClick={() => onRequestDelete('TASK', task.id, task.title)} className="px-1 text-gray-400 hover:text-red-600 transition-colors">🗑️</button>
                                    </div>
                                )}
                            </div>
                            
                            {task.description && <p className={styles.taskDesc}>{task.description}</p>}
                            <div className={styles.metaGroup}>
                                <div className={styles.assignee}>👤 <span className="font-medium text-gray-700">{assigneeName}</span></div>
                                {task.due_date && (<div className={styles.dueDate}>📅 {formatDate(task.due_date)}</div>)}
                            </div>
                        </div>
                    </div>

                    <div className={styles.actionGroup}>
                        {canFullEdit && <button onClick={() => setIsAddingSub(!isAddingSub)} className={styles.addSubBtn}>+ Con</button>}
                        <select value={task.status} onChange={(e) => handleStatusChange(e.target.value)} disabled={!canUpdateStatus || isUpdatingStatus} className={getStatusClass()}>
                            <option value="TODO">TODO</option><option value="IN_PROGRESS">IN PROGRESS</option><option value="REVIEW">REVIEW</option><option value="DONE">DONE</option>
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

// --- CONTENT CHÍNH ---
function ProjectDetailsContent() {
    const searchParams = useSearchParams();
    const projectId = searchParams.get('id');
    const { user, token } = useAuth();
    
    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdatingProject, setIsUpdatingProject] = useState(false);
    
    const [activeTab, setActiveTab] = useState('TASKS');
    const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const [candidates, setCandidates] = useState([]); 
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, id: null, title: '', message: '' });
    const [isProcessingDelete, setIsProcessingDelete] = useState(false);

    const fetchData = async () => {
        if (!token || !projectId) return;
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
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { if (token && projectId) fetchData(); }, [token, projectId]);

    const handleUpdateProjectStatus = async (newStatus) => {
        if(!project) return; setIsUpdatingProject(true);
        try { 
            const res = await fetch(`${API_URL}/projects/${projectId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status: newStatus }) }); 
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật');
            setProject(p => ({...p, status: newStatus})); toast.success(`Dự án: ${newStatus}`); 
        } catch(e){ toast.error(e.message); } finally{setIsUpdatingProject(false)}
    };

    const handleCreateRootTask = async (data) => {
        setIsCreating(true); try { await fetch(`${API_URL}/projects/${projectId}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({...data, assignee_id: data.assignee_id || null}) }); setIsCreating(false); fetchData(); toast.success('Đã tạo nhóm công việc'); } catch(e){ toast.error('Lỗi tạo'); }
    };

    const handleOpenInviteModal = async () => {
        setIsMemberModalOpen(true);
        try {
            const res = await fetch(`${API_URL}/users?limit=100`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                const allUsers = data.data || data; 
                const memberIds = new Set(members.map(m => m.id));
                const available = allUsers.filter(u => !memberIds.has(u.id) && u.role !== 'ADMIN');
                setCandidates(available);
            }
        } catch (e) { console.error(e); }
    };

    const handleInviteMember = async (e) => {
        e.preventDefault(); if (!inviteEmail) return toast.error("Vui lòng chọn thành viên"); setIsInviting(true);
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ email: inviteEmail }) });
            const data = await res.json();
            if (res.ok) { toast.success('Đã thêm thành viên!'); setInviteEmail(''); fetchData(); setCandidates(prev => prev.filter(c => c.email !== inviteEmail)); } 
            else { toast.error(data.message || 'Lỗi mời'); }
        } catch (error) { toast.error('Lỗi kết nối'); } finally { setIsInviting(false); }
    };

    const openConfirmDelete = (type, id, name) => { setConfirmModal({ isOpen: true, type, id, title: `Xóa ${type==='TASK'?'công việc':'thành viên'}?`, message: `Bạn có chắc muốn xóa ${name}?` }); };
    const handleConfirmAction = async () => {
        setIsProcessingDelete(true);
        try {
            let url = confirmModal.type === 'TASK' ? `${API_URL}/projects/${projectId}/tasks/${confirmModal.id}` : `${API_URL}/projects/${projectId}/members/${confirmModal.id}`;
            const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) { toast.success('Đã xóa'); fetchData(); } else { toast.error('Không thể xóa'); }
        } catch (error) { toast.error('Lỗi kết nối'); } finally { setIsProcessingDelete(false); setConfirmModal({ ...confirmModal, isOpen: false }); }
    };

    const canManageMembers = user?.role === 'ADMIN' || (user?.role === 'PM' && project?.created_by === user.id);

    if (!projectId) return <div className="p-8">Dự án không tồn tại</div>;
    if (loading) return <div className="p-8 text-center">Đang tải...</div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <div>
                        <div className={styles.projectTitleWrapper}>
                            <h1 className={styles.projectTitle}>{project?.name || `Dự án #${projectId}`}</h1>
                            <span className={`${styles.projectStatus} ${project?.status==='COMPLETED' ? styles.statusCompleted : styles.statusProgress}`}>{project?.status}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                            <button onClick={handleOpenInviteModal} className={styles.memberBtn}>👥 {members.length} Thành viên</button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                         {(user?.role === 'ADMIN' || (user?.role === 'PM' && project?.created_by === user?.id)) ? (<div className="flex items-center bg-gray-50 p-1 rounded-lg border border-gray-200"><span className="text-xs text-gray-500 px-2">Trạng thái:</span><select value={project?.status || 'IN_PROGRESS'} onChange={(e) => handleUpdateProjectStatus(e.target.value)} disabled={isUpdatingProject} className={styles.statusSelect}><option value="IN_PROGRESS">Đang triển khai</option><option value="COMPLETED">Đã hoàn thành</option></select></div>) : null}
                        {(user?.role === 'ADMIN' || user?.role === 'PM') && !isCreating && activeTab === 'TASKS' && (<button onClick={() => setIsCreating(true)} className={styles.createTaskBtn}><span>+</span> Việc mới</button>)}
                    </div>
                </div>
            </header>

            <div className={styles.tabContainer}>
                <button onClick={() => setActiveTab('TASKS')} className={`${styles.tabBtn} ${activeTab==='TASKS' ? styles.tabActive : styles.tabInactive}`}>Danh sách công việc</button>
                <button onClick={() => setActiveTab('REPORT')} className={`${styles.tabBtn} ${activeTab==='REPORT' ? styles.tabActive : styles.tabInactive}`}>Báo cáo tiến độ</button>
            </div>

            <main className="px-6 max-w-5xl mx-auto">
                {activeTab === 'TASKS' ? (
                    <>
                        {isCreating && <div className="mb-8 bg-white p-6 rounded-xl shadow-md border border-indigo-100"><TaskForm onSubmit={handleCreateRootTask} onCancel={() => setIsCreating(false)} members={members} isSaving={false} /></div>}
                        <div className="space-y-4">
                            {tasks.length > 0 ? tasks.map((task) => (<TaskItem key={task.id} task={task} projectId={projectId} token={token} onRefresh={fetchData} members={members} currentUser={user} onRequestDelete={openConfirmDelete} />)) 
                            : !isCreating && <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-300"><p className="text-gray-500">Dự án chưa có công việc nào.</p></div>}
                        </div>
                    </>
                ) : (
                    <ProjectReport projectId={projectId} token={token} />
                )}
            </main>

            {isMemberModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}><h3 className={styles.modalTitle}>Thành viên dự án</h3><button onClick={() => setIsMemberModalOpen(false)} className={styles.closeBtn}>×</button></div>
                        <div className={styles.modalBody}>
                            {canManageMembers && (
                                <form onSubmit={handleInviteMember} className={styles.inviteForm}>
                                    <select className={styles.inputField} value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}>
                                        <option value="">-- Chọn nhân viên để mời --</option>
                                        {candidates.map(u => (<option key={u.id} value={u.email}>{u.username} ({u.email})</option>))}
                                        {candidates.length === 0 && <option disabled>Không còn nhân viên nào khả dụng</option>}
                                    </select>
                                    <button type="submit" disabled={isInviting || !inviteEmail} className={styles.btnSave}>{isInviting ? '...' : 'Thêm'}</button>
                                </form>
                            )}
                            <div className="space-y-2">{members.map(member => (
                                <div key={member.id} className={styles.memberRow}>
                                    <div className="flex items-center gap-3">
                                        <Avatar name={member.username} size="md" />
                                        <div>
                                            <div className="flex items-center gap-2"><p className="font-medium text-sm text-gray-900">{member.username}</p></div>
                                            <p className="text-xs text-gray-500">{member.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`${styles.roleBadge} ${member.role==='ADMIN'?'bg-red-50 text-red-600 border-red-100':member.role==='PM'?'bg-indigo-50 text-indigo-600 border-indigo-100':'bg-gray-200 text-gray-600 border-gray-300'}`}>{member.role}</span>
                                        {canManageMembers && member.id !== project?.created_by && member.id !== user.id && (<button onClick={() => openConfirmDelete('MEMBER', member.id, member.username)} className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors">🗑️</button>)}
                                    </div>
                                </div>
                            ))}</div>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 text-right"><button onClick={() => setIsMemberModalOpen(false)} className={styles.btnCancel}>Đóng</button></div>
                    </div>
                </div>
            )}
            <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={handleConfirmAction} onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })} isLoading={isProcessingDelete} />
        </div>
    );
}

// --- EXPORT MẶC ĐỊNH (BỌC SUSPENSE) ---
export default function Page() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Đang tải dự án...</div>}>
            <ProjectDetailsContent />
        </Suspense>
    );
}
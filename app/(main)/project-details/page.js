'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import Avatar from '../../components/Avatar';
import ConfirmModal from '../../components/ConfirmModal';
import ProjectReport from '../../components/ProjectReport';
import styles from './styles.module.css';

const API_URL = '/api/v1';

// ... (Giữ nguyên các Helper và Component TaskForm, TaskItem như cũ) ...
const formatDateForInput = (isoString) => { if (!isoString) return ''; const date = new Date(isoString); const offset = date.getTimezoneOffset() * 60000; return (new Date(date - offset)).toISOString().slice(0, 16); };
const formatDateDisplay = (isoString) => { if (!isoString) return ''; return new Date(isoString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };

const TaskForm = ({ onSubmit, onCancel, members, isSaving, autoFocus = false, initialData = null, isSubForm = false }) => {
    const [formData, setFormData] = useState({ title: initialData?.title || '', description: initialData?.description || '', start_date: formatDateForInput(initialData?.start_date), due_date: formatDateForInput(initialData?.due_date), priority: initialData?.priority || 'MEDIUM', assignee_id: initialData?.assignee_id || '' });
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSubmit = (e) => { e.preventDefault(); if (!formData.title.trim()) return; const payload = { ...formData }; if (!initialData) payload.start_date = new Date().toISOString(); onSubmit(payload); };
    return (
        <form onSubmit={handleSubmit} className={isSubForm ? styles.subTaskFormContainer : styles.formContainer}><div className={styles.formHeader}><h4 className={styles.formTitle}>{initialData ? 'Chỉnh sửa công việc' : 'Tạo công việc mới'}</h4>{initialData && <span className="text-[10px] text-gray-400">Ngày tạo: {formatDateDisplay(initialData.created_at)}</span>}</div><div className={styles.inputGroup}><label className={styles.inputLabel}>Tên công việc <span className="text-red-500">*</span></label><input name="title" autoFocus={autoFocus} required className={styles.inputField} value={formData.title} onChange={handleChange} placeholder="Nhập tên công việc..." /></div><div className={styles.inputGroup}><label className={styles.inputLabel}>Mô tả</label><textarea name="description" rows="2" className={styles.inputField} value={formData.description} onChange={handleChange} placeholder="Mô tả chi tiết..." /></div><div className={styles.formRow2}><div><label className={styles.inputLabel}>Hạn chót</label><input type="datetime-local" name="due_date" className={styles.inputField} value={formData.due_date} onChange={handleChange} /></div><div><label className={styles.inputLabel}>Ưu tiên</label><select name="priority" className={styles.inputField} value={formData.priority} onChange={handleChange}><option value="LOW">Thấp</option><option value="MEDIUM">Trung bình</option><option value="HIGH">Cao</option><option value="URGENT">Khẩn cấp</option></select></div></div><div className={styles.inputGroup}><label className={styles.inputLabel}>Giao cho ai?</label><select name="assignee_id" className={styles.inputField} value={formData.assignee_id} onChange={handleChange}><option value="">-- Chưa phân công --</option>{members.map(m => (<option key={m.id} value={m.id}>{m.username} ({m.email})</option>))}</select></div><div className={styles.formActions}><button type="button" onClick={onCancel} className={styles.btnCancel}>Hủy</button><button type="submit" disabled={isSaving} className={styles.btnSave}>{isSaving ? 'Lưu...' : 'Lưu'}</button></div></form>
    );
};

const TaskItem = ({ task, level = 0, projectId, token, onRefresh, members, currentUser, onRequestDelete }) => {
    const [isExpanded, setIsExpanded] = useState(true); const [isAddingSub, setIsAddingSub] = useState(false); const [isEditing, setIsEditing] = useState(false); const [isSaving, setIsSaving] = useState(false); const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const canUpdateStatus = currentUser?.role === 'ADMIN' || currentUser?.role === 'PM' || (task.assignee_id === currentUser?.id); const canFullEdit = currentUser?.role === 'ADMIN' || currentUser?.role === 'PM'; const assigneeName = members.find(m => m.id === task.assignee_id)?.username || 'Chưa giao';
    const getPriorityClass = (p) => { if (p === 'URGENT') return styles.badgeUrgent; if (p === 'HIGH') return styles.badgeHigh; if (p === 'LOW') return styles.badgeLow; return styles.badgeMedium; };
    const getStatusClass = () => { let base = styles.statusSelectSmall; if (!canUpdateStatus) return `${base} ${styles.statusSelectDisabled}`; base += ' hover:bg-opacity-80 '; if (task.status === 'DONE') return base + ' ' + styles.statusDone; if (task.status === 'IN_PROGRESS') return base + ' ' + styles.statusProgress; return base + ' ' + styles.statusDefault; };
    const handleStatusChange = async (val) => { if (!canUpdateStatus) return; setIsUpdatingStatus(true); try { const res = await fetch(`${API_URL}/projects/${projectId}/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status: val }) }); const data = await res.json(); if (res.ok) { onRefresh(); toast.success('Đã cập nhật trạng thái'); } else { toast.error(data.message || 'Không thể cập nhật'); } } catch(e) { toast.error('Lỗi kết nối'); } finally { setIsUpdatingStatus(false); } };
    const handleUpdateInfo = async (data) => { setIsSaving(true); try { const res = await fetch(`${API_URL}/projects/${projectId}/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...data, assignee_id: data.assignee_id || null }) }); const d = await res.json(); if (res.ok) { setIsEditing(false); onRefresh(); toast.success('Đã cập nhật'); } else { toast.error(d.message); } } catch(e) { toast.error('Lỗi kết nối'); } finally { setIsSaving(false); } };
    const handleAddSub = async (data) => { setIsSaving(true); try { const res = await fetch(`${API_URL}/projects/${projectId}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...data, parent_id: task.id, assignee_id: data.assignee_id || null }) }); const d = await res.json(); if (res.ok) { setIsAddingSub(false); setIsExpanded(true); onRefresh(); toast.success('Đã thêm con'); } else { toast.error(d.message); } } catch(e) { toast.error('Lỗi kết nối'); } finally { setIsSaving(false); } };

    if (isEditing) return <div className={`${styles.taskWrapper} ${level > 0 ? styles.taskWrapperChild : ''}`}><TaskForm initialData={task} onSubmit={handleUpdateInfo} onCancel={() => setIsEditing(false)} members={members} isSaving={isSaving} isSubForm={true} /></div>;
    return (
        <div className={styles.treeNode}>
            {level > 0 && <div className={styles.guideLineV} />} {level > 0 && <div className={styles.guideLineH} />}
            <div className={`${styles.taskWrapper} ${level > 0 ? styles.taskWrapperChild : ''}`}>
                <div className={`${styles.taskCard} group ${canUpdateStatus ? styles.taskCardActive : styles.taskCardDisabled}`}>
                    <div className={styles.taskLeft}>
                        <button onClick={() => setIsExpanded(!isExpanded)} className={`${styles.expandBtn} ${(!task.subTasks?.length) ? 'invisible' : ''}`}><span className={`text-xs transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>▶</span></button>
                        <div className={styles.taskInfo}>
                            <div className={styles.taskHeader}><span className={`${styles.taskTitle} ${task.status === 'DONE' ? styles.taskTitleDone : ''}`}>{task.title}</span><span className={`${styles.badgePriority} ${getPriorityClass(task.priority)}`}>{task.priority}</span>{canFullEdit && (<div className={styles.editActions}><button onClick={() => setIsEditing(true)} className={styles.iconBtn} title="Sửa">✏️</button><button onClick={() => onRequestDelete('TASK', task.id, task.title)} className={styles.iconBtnDelete} title="Xóa">🗑️</button></div>)}</div>
                            {task.description && <p className={styles.taskDesc}>{task.description}</p>}
                            <div className={styles.taskMeta}><div className={styles.metaItem} title="Ngày tạo">🕒 {formatDateDisplay(task.created_at)}</div><div className={styles.metaItem} title="Người thực hiện">👤 <span className="font-medium text-gray-700">{assigneeName}</span></div>{task.due_date && (<div className={styles.dueDate}>📅 {formatDateDisplay(task.due_date)}</div>)}</div>
                        </div>
                    </div>
                    <div className={styles.taskRight}>{canFullEdit && <button onClick={() => setIsAddingSub(!isAddingSub)} className={styles.addSubBtn}>+ Con</button>}<select value={task.status} onChange={(e) => handleStatusChange(e.target.value)} disabled={!canUpdateStatus || isUpdatingStatus} className={getStatusClass()}><option value="TODO">TODO</option><option value="IN_PROGRESS">IN PROGRESS</option><option value="REVIEW">REVIEW</option><option value="DONE">DONE</option></select></div>
                </div>
                {isAddingSub && <div className={styles.taskWrapperChild}><div className="flex items-start gap-2"><span className="text-gray-300 text-2xl leading-none mt-[-5px]">↳</span><div className="flex-1"><TaskForm onSubmit={handleAddSub} onCancel={() => setIsAddingSub(false)} members={members} isSaving={isSaving} isSubForm={true} /></div></div></div>}
                {isExpanded && task.subTasks?.map(sub => <TaskItem key={sub.id} task={sub} level={level + 1} projectId={projectId} token={token} onRefresh={onRefresh} members={members} currentUser={currentUser} onRequestDelete={onRequestDelete} />)}
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
    
    // UI States
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdatingProject, setIsUpdatingProject] = useState(false);
    const [activeTab, setActiveTab] = useState('TASKS');
    
    // --- STATE LỌC (Mới thêm statusFilter) ---
    const [priorityFilter, setPriorityFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState(''); 

    // Modals
    const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const [candidates, setCandidates] = useState([]); 
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, id: null, title: '', message: '' });
    const [isProcessingDelete, setIsProcessingDelete] = useState(false);

    const fetchData = async () => {
        if (!token || !projectId) return;
        try {
            // Xây dựng Query String
            const params = new URLSearchParams();
            if (priorityFilter) params.append('priority', priorityFilter);
            if (statusFilter) params.append('status', statusFilter);
            const taskQuery = params.toString() ? `?${params.toString()}` : '';

            const [resAll, resTasks, resMembers] = await Promise.all([
                fetch(`${API_URL}/projects`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/projects/${projectId}/tasks${taskQuery}`, { headers: { Authorization: `Bearer ${token}` } }),
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

    // Thêm statusFilter vào dependency để reload khi chọn
    useEffect(() => { if (token && projectId) fetchData(); }, [token, projectId, priorityFilter, statusFilter]);

    // ... (Các handlers giữ nguyên: handleUpdateProjectStatus, handleCreateRootTask, invite, delete...)
    const handleUpdateProjectStatus = async (newStatus) => { if(!project) return; setIsUpdatingProject(true); try { const res = await fetch(`${API_URL}/projects/${projectId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status: newStatus }) }); const d=await res.json(); if(!res.ok)throw new Error(d.message); setProject(p => ({...p, status: newStatus})); toast.success(`Dự án: ${newStatus}`); } catch(e){ toast.error(e.message); } finally{setIsUpdatingProject(false)} };
    const handleCreateRootTask = async (data) => { setIsCreating(true); try { await fetch(`${API_URL}/projects/${projectId}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({...data, assignee_id: data.assignee_id || null}) }); setIsCreating(false); fetchData(); toast.success('Đã tạo nhóm công việc'); } catch(e){ toast.error('Lỗi tạo'); } };
    const handleOpenInviteModal = async () => { setIsMemberModalOpen(true); try { const res = await fetch(`${API_URL}/users?limit=100`, { headers: { Authorization: `Bearer ${token}` } }); if (res.ok) { const d = await res.json(); const all = d.data || d; const mIds = new Set(members.map(m => m.id)); setCandidates(all.filter(u => !mIds.has(u.id) && u.role !== 'ADMIN')); } } catch (e) {} };
    const handleInviteMember = async (e) => { e.preventDefault(); if (!inviteEmail) return toast.error("Vui lòng chọn thành viên"); setIsInviting(true); try { const res = await fetch(`${API_URL}/projects/${projectId}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ email: inviteEmail }) }); const d = await res.json(); if (res.ok) { toast.success('Đã thêm thành viên!'); setInviteEmail(''); fetchData(); setCandidates(prev => prev.filter(c => c.email !== inviteEmail)); } else { toast.error(d.message || 'Lỗi mời'); } } catch (error) { toast.error('Lỗi kết nối'); } finally { setIsInviting(false); } };
    const openConfirmDelete = (type, id, name) => { setConfirmModal({ isOpen: true, type, id, title: `Xóa ${type==='TASK'?'công việc':'thành viên'}?`, message: `Bạn có chắc muốn xóa ${name}?` }); };
    const handleConfirmAction = async () => { setIsProcessingDelete(true); try { let url = confirmModal.type === 'TASK' ? `${API_URL}/projects/${projectId}/tasks/${confirmModal.id}` : `${API_URL}/projects/${projectId}/members/${confirmModal.id}`; const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); if (res.ok) { toast.success('Đã xóa'); fetchData(); } else { toast.error('Không thể xóa'); } } catch (error) { toast.error('Lỗi kết nối'); } finally { setIsProcessingDelete(false); setConfirmModal({ ...confirmModal, isOpen: false }); } };
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
                    <div className={styles.headerActions}>
                         {(user?.role === 'ADMIN' || (user?.role === 'PM' && project?.created_by === user?.id)) ? (<div className={styles.projectStatusSelectWrapper}><span className={styles.projectStatusLabel}>Trạng thái:</span><select value={project?.status || 'IN_PROGRESS'} onChange={(e) => handleUpdateProjectStatus(e.target.value)} disabled={isUpdatingProject} className={styles.projectStatusSelect}><option value="IN_PROGRESS">Đang triển khai</option><option value="COMPLETED">Đã hoàn thành</option></select></div>) : null}
                        {(user?.role === 'ADMIN' || user?.role === 'PM') && !isCreating && activeTab === 'TASKS' && (<button onClick={() => setIsCreating(true)} className={styles.createTaskBtn}><span>+</span> Việc mới</button>)}
                    </div>
                </div>
            </header>

            <div className={styles.tabContainer}>
                <button onClick={() => setActiveTab('TASKS')} className={`${styles.tabBtn} ${activeTab==='TASKS' ? styles.tabActive : styles.tabInactive}`}>Danh sách công việc</button>
                <button onClick={() => setActiveTab('REPORT')} className={`${styles.tabBtn} ${activeTab==='REPORT' ? styles.tabActive : styles.tabInactive}`}>Báo cáo tiến độ</button>
            </div>

            <main className={styles.mainContent}>
                {activeTab === 'TASKS' ? (
                    <>
                        {/* --- TOOLBAR LỌC: ƯU TIÊN & TRẠNG THÁI --- */}
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-gray-700">Công việc ({tasks.length})</h3>
                            <div className="flex items-center gap-3">
                                {/* Lọc Ưu tiên */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">Ưu tiên:</span>
                                    <select 
                                        className="text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-indigo-500 cursor-pointer"
                                        value={priorityFilter}
                                        onChange={(e) => setPriorityFilter(e.target.value)}
                                    >
                                        <option value="">Tất cả</option>
                                        <option value="URGENT">Khẩn cấp</option>
                                        <option value="HIGH">Cao</option>
                                        <option value="MEDIUM">Trung bình</option>
                                        <option value="LOW">Thấp</option>
                                    </select>
                                </div>
                                
                                {/* Lọc Trạng thái */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">Trạng thái:</span>
                                    <select 
                                        className="text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-indigo-500 cursor-pointer"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        <option value="">Tất cả</option>
                                        <option value="TODO">Cần làm</option>
                                        <option value="IN_PROGRESS">Đang làm</option>
                                        <option value="REVIEW">Review</option>
                                        <option value="DONE">Hoàn thành</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {isCreating && <div className={styles.formContainer}><TaskForm onSubmit={handleCreateRootTask} onCancel={() => setIsCreating(false)} members={members} isSaving={false} /></div>}
                        
                        <div className="space-y-4">
                            {tasks.length > 0 ? tasks.map((task) => (
                                <TaskItem key={task.id} task={task} projectId={projectId} token={token} onRefresh={fetchData} members={members} currentUser={user} onRequestDelete={openConfirmDelete} />
                            )) : !isCreating && <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-300"><p className="text-gray-500">Không tìm thấy công việc nào.</p></div>}
                        </div>
                    </>
                ) : (
                    <ProjectReport projectId={projectId} token={token} />
                )}
            </main>

            {isMemberModalOpen && (<div className={styles.modalOverlay}><div className={styles.modalContainer}><div className={styles.modalHeader}><h3 className={styles.modalTitle}>Thành viên dự án</h3><button onClick={()=>setIsMemberModalOpen(false)} className={styles.closeBtn}>×</button></div><div className={styles.modalBody}>{canManageMembers && (<form onSubmit={handleInviteMember} className={styles.inviteForm}><select className={styles.inputField} value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}><option value="">-- Chọn nhân viên --</option>{candidates.map(u => (<option key={u.id} value={u.email}>{u.username} ({u.email})</option>))}{candidates.length===0&&<option disabled>Hết nhân viên</option>}</select><button type="submit" disabled={isInviting||!inviteEmail} className={styles.btnSave}>{isInviting?'...':'Thêm'}</button></form>)}<div className={styles.memberList}>{members.map(member => (<div key={member.id} className={styles.memberRow}><div className={styles.memberInfo}><Avatar name={member.username} size="md" /><div><div className="flex items-center gap-2"><p className="font-medium text-sm text-gray-900">{member.username}</p>{member.is_manager && <span className="text-xs text-yellow-500">⭐</span>}</div><p className="text-xs text-gray-500">{member.email}</p></div></div><div className="flex items-center gap-3"><span className={`${styles.memberRoleBadge} ${member.role==='ADMIN'?styles.roleAdmin:member.role==='PM'?styles.rolePM:styles.roleMember}`}>{member.role}</span>{canManageMembers && member.id !== project?.created_by && member.id !== user.id && (<button onClick={() => openConfirmDelete('MEMBER', member.id, member.username)} className={styles.iconBtnDelete}>🗑️</button>)}</div></div>))}</div></div><div className={styles.modalFooter}><button onClick={() => setIsMemberModalOpen(false)} className={styles.btnCancel}>Đóng</button></div></div></div>)}
            <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={handleConfirmAction} onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })} isLoading={isProcessingDelete} />
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Đang tải dự án...</div>}>
            <ProjectDetailsContent />
        </Suspense>
    );
}
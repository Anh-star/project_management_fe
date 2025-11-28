"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Badge from "../../components/Badge";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/ConfirmModal";
import NotificationBell from "../../components/NotificationBell"; // <-- Import Chuông

const API_URL = "/api/v1";

export default function ProjectsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [projects, setProjects] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedManagers, setSelectedManagers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    projectId: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const fetchProjects = async (keyword = "", status = "") => {
    if (!token) return;
    setIsLoading(true);
    try {
      const query = `?search=${keyword}&status=${status}`;
      const res = await fetch(`${API_URL}/projects${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPMList = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/users?limit=100&role=PM`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list = Array.isArray(data.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];
      const filteredList = list.filter(
        (u) => u.role === "PM" && u.id !== user.id
      );
      setUsersList(filteredList);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (token) {
      const timer = setTimeout(() => {
        fetchProjects(search, statusFilter);
      }, 500);
      if ((user?.role === "ADMIN" || user?.role === "PM") && !editingProject) {
        fetchPMList();
      }
      return () => clearTimeout(timer);
    }
  }, [token, search, statusFilter, editingProject]);

  const toggleManager = (userId) => {
    setSelectedManagers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };
  const openCreateForm = () => {
    setEditingProject(null);
    setNewName("");
    setNewCode("");
    setNewDescription("");
    setSelectedManagers([]);
    setShowForm(true);
    fetchPMList();
  };
  const openEditForm = (e, project) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingProject(project);
    setNewName(project.name);
    setNewCode(project.project_code);
    setNewDescription(project.description || "");
    setShowForm(true);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingProject && selectedManagers.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 Project Manager khác!");
      return;
    }
    setIsSubmitting(true);
    const payload = {
      name: newName,
      project_code: newCode,
      description: newDescription,
    };
    if (!editingProject) payload.manager_ids = selectedManagers;
    try {
      let url = `${API_URL}/projects`;
      let method = "POST";
      if (editingProject) {
        url = `${API_URL}/projects/${editingProject.id}`;
        method = "PATCH";
      }
      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      setShowForm(false);
      fetchProjects(search, statusFilter);
      toast.success(
        editingProject ? "Cập nhật thành công!" : "Tạo dự án thành công!"
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  const openDeleteModal = (e, projectId) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteModal({ isOpen: true, projectId });
  };
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await fetch(`${API_URL}/projects/${deleteModal.projectId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects((prev) => prev.filter((p) => p.id !== deleteModal.projectId));
      toast.success("Đã xóa dự án");
      setDeleteModal({ isOpen: false, projectId: null });
    } catch (err) {
      toast.error("Lỗi kết nối server");
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading) return <div className="p-8 text-center">Đang tải...</div>;
  const inputClass =
    "w-full px-4 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors";

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dự án của tôi</h1>
          <p className="text-sm text-gray-500 mt-1">
            Theo dõi tiến độ và quản lý công việc.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto flex-wrap items-center">
          {/* --- CHUÔNG THÔNG BÁO --- */}
          <div className="mr-2">
            <NotificationBell />
          </div>

          <div className="relative flex-1 md:w-48">
            <input
              type="text"
              placeholder="Tìm kiếm..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="absolute left-3 top-2.5 text-gray-400 text-xs">
              🔍
            </span>
          </div>
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="IN_PROGRESS">Đang thực hiện</option>
            <option value="COMPLETED">Đã hoàn thành</option>
          </select>
          {(user?.role === "ADMIN" || user?.role === "PM") && (
            <button
              onClick={showForm ? () => setShowForm(false) : openCreateForm}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm whitespace-nowrap text-sm font-medium"
            >
              {showForm ? "Hủy" : "+ Tạo mới"}
            </button>
          )}
        </div>
      </div>
      {/* ... (Phần Form và Grid giữ nguyên như code trước) ... */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-md mb-8 border border-gray-200 animate-fade-in">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            {editingProject
              ? `Chỉnh sửa dự án: ${editingProject.name}`
              : "Tạo dự án mới"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Tên dự án *
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Mã dự án *
                </label>
                <input
                  type="text"
                  placeholder="VD: PRJ-001"
                  className={`${inputClass} disabled:bg-gray-200 disabled:text-gray-500`}
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  required
                  disabled={!!editingProject}
                />
              </div>
            </div>
            {!editingProject && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Chọn thêm Project Managers{" "}
                  <span className="text-red-500">*</span>
                </label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto bg-gray-50 custom-scrollbar">
                  {usersList.length > 0 ? (
                    usersList.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center mb-2 last:mb-0 hover:bg-gray-100 p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedManagers.includes(u.id)}
                          onChange={() => toggleManager(u.id)}
                          disabled={u.id === user.id}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                        />
                        <label className="ml-2 text-sm text-gray-700 cursor-pointer select-none flex items-center gap-2 flex-1">
                          <span className="font-medium">{u.username}</span>
                          <span className="text-xs text-gray-400">
                            ({u.email})
                          </span>
                          <span className="text-[10px] border px-1 rounded bg-indigo-50 text-indigo-600 font-bold">
                            {u.role}
                          </span>
                        </label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 text-center">
                      Không tìm thấy PM nào khác.
                    </p>
                  )}
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Mô tả
              </label>
              <textarea
                className={inputClass}
                rows="3"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                {isSubmitting
                  ? "Đang xử lý..."
                  : editingProject
                    ? "Cập nhật"
                    : "Tạo dự án"}
              </button>
            </div>
          </form>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length > 0
          ? projects.map((project) => (
              <Link
                key={project.id}
                href={`/project-details?id=${project.id}`}
                className="block group h-full"
              >
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300 h-full flex flex-col overflow-hidden relative">
                  <div
                    className={`h-1.5 w-full ${project.status === "COMPLETED" ? "bg-green-500" : "bg-indigo-500"}`}
                  />
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 line-clamp-1 mb-1 transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-xs font-mono text-gray-400">
                          #{project.project_code}
                        </p>
                      </div>
                      <Badge value={project.status} />
                    </div>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[40px]">
                      {project.description || "Không có mô tả."}
                    </p>
                    <div className="mt-auto mb-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Tiến độ</span>
                        <span className="font-bold text-gray-700">
                          {project.progress || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-1000 ${project.status === "COMPLETED" ? "bg-green-500" : "bg-indigo-500"}`}
                          style={{ width: `${project.progress || 0}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1 flex justify-between">
                        <span>{project.completed_tasks} hoàn thành</span>
                        <span>{project.total_tasks} tổng việc</span>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-xs font-medium text-indigo-600 flex items-center group-hover:translate-x-1 transition-transform">
                        Chi tiết →
                      </span>
                      {(user?.role === "ADMIN" || user?.role === "PM") && (
                        <div className="flex gap-2 z-10">
                          <button
                            onClick={(e) => openEditForm(e, project)}
                            className="text-gray-400 hover:text-indigo-600 p-1 rounded-md transition-colors"
                            title="Sửa thông tin"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => openDeleteModal(e, project.id)}
                            className="text-gray-400 hover:text-red-600 p-1 rounded-md transition-colors"
                            title="Xóa dự án"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          : !showForm && (
              <div className="col-span-full text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                <p className="text-gray-500">Không tìm thấy dự án nào.</p>
              </div>
            )}
      </div>
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Xóa dự án?"
        message="Hành động này sẽ xóa toàn bộ công việc và dữ liệu liên quan. Không thể hoàn tác."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, projectId: null })}
        isLoading={isDeleting}
      />
    </div>
  );
}

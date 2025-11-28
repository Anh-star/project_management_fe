"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import Avatar from "../../components/Avatar";
import Badge from "../../components/Badge";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/ConfirmModal";
import NotificationBell from "../../components/NotificationBell";
import styles from "./styles.module.css";

const API_URL = "/api/v1";

export default function UsersPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total_pages: 1,
    total_records: 0,
  });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "MEMBER",
  });

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    userId: null,
    username: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = async (keyword = "", pageNum = 1, role = "") => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/users?page=${pageNum}&limit=10&search=${keyword}&role=${role}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (res.ok) {
        setUsers(data.data || []);
        setPagination(
          data.pagination || { page: 1, total_pages: 1, total_records: 0 }
        );
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role !== "ADMIN") router.push("/dashboard");
  }, [user, router]);

  useEffect(() => {
    if (token) {
      const timer = setTimeout(() => fetchUsers(search, page, roleFilter), 500);
      return () => clearTimeout(timer);
    }
  }, [token, search, page, roleFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editingUser
      ? `${API_URL}/users/${editingUser.id}`
      : `${API_URL}/users`;
    const method = editingUser ? "PATCH" : "POST";
    const payload = { ...formData };
    if (editingUser && !payload.password) delete payload.password;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setEditingUser(null);
        setFormData({ username: "", email: "", password: "", role: "MEMBER" });
        fetchUsers(search, page, roleFilter);
        toast.success(editingUser ? "Cập nhật thành công!" : "Tạo thành công!");
      } else {
        toast.error((await res.json()).message);
      }
    } catch (error) {
      toast.error("Lỗi kết nối");
    }
  };

  const openDeleteModal = (u) => {
    setDeleteModal({ isOpen: true, userId: u.id, username: u.username });
  };
  const handleConfirmDelete = async () => {
    if (!deleteModal.userId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/users/${deleteModal.userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Đã xóa");
        fetchUsers(search, page, roleFilter);
        setDeleteModal({ isOpen: false, userId: null, username: "" });
      } else {
        toast.error("Không thể xóa");
      }
    } catch (error) {
      toast.error("Lỗi xóa");
    } finally {
      setIsDeleting(false);
    }
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      email: u.email,
      password: "",
      role: u.role,
    });
    setIsModalOpen(true);
  };
  const openCreate = () => {
    setEditingUser(null);
    setFormData({ username: "", email: "", password: "", role: "MEMBER" });
    setIsModalOpen(true);
  };

  if (loading)
    return <div className="p-8 text-center">Đang tải dữ liệu...</div>;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerWrapper}>
        <div>
          <h1 className={styles.title}>Thành viên hệ thống</h1>
          <p className={styles.subtitle}>
            Quản lý {pagination.total_records} tài khoản nhân viên.
          </p>
        </div>

        <div className={styles.toolbar}>
          <div className="mr-2 flex items-center">
            <NotificationBell />
          </div>

          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Tìm tên..."
              className={styles.searchInput}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <span className={styles.searchIcon}>🔍</span>
          </div>
          <select
            className={styles.filterSelect}
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả vai trò</option>
            <option value="ADMIN">Admin</option>
            <option value="PM">PM</option>
            <option value="MEMBER">Member</option>
          </select>
          <button onClick={openCreate} className={styles.createBtn}>
            + Thêm mới
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.th}>Thành viên</th>
                <th className={styles.th}>Email</th>
                <th className={styles.thCenter}>Vai trò</th>
                <th className={styles.thRight}>Tham gia</th>
                <th className={styles.thRight}>Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id} className={`${styles.tr} group`}>
                    <td className={styles.td}>
                      <div className={styles.userInfo}>
                        <Avatar name={u.username} size="md" />
                        <div className="ml-4">
                          <div className={styles.userName}>{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.userEmail}>{u.email}</div>
                    </td>
                    <td className={styles.tdCenter}>
                      <Badge value={u.role} />
                    </td>
                    <td className={styles.tdRight}>
                      {new Date(u.created_at).toLocaleDateString("vi-VN")}
                    </td>
                    <td className={styles.tdRight}>
                      <button
                        onClick={() => openEdit(u)}
                        className={styles.editBtn}
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => openDeleteModal(u)}
                        className={styles.deleteBtn}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">
                    Không tìm thấy kết quả.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className={styles.paginationBar}>
          <div className="text-xs text-gray-500">
            Trang <strong>{pagination.page}</strong> / {pagination.total_pages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className={styles.pageBtn}
            >
              Trước
            </button>
            <button
              onClick={() =>
                setPage((p) => Math.min(p + 1, pagination.total_pages))
              }
              disabled={page >= pagination.total_pages}
              className={styles.pageBtn}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96 border border-gray-200">
            <h2 className="text-lg font-bold mb-4 text-gray-800">
              {editingUser ? "Sửa thông tin" : "Thêm thành viên mới"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={styles.inputLabel}>Username</label>
                <input
                  className={styles.searchInput}
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  required
                />
              </div>
              {!editingUser && (
                <div>
                  <label className={styles.inputLabel}>Email</label>
                  <input
                    type="email"
                    className={styles.searchInput}
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>
              )}
              <div>
                <label className={styles.inputLabel}>Role</label>
                <select
                  className={styles.searchInput}
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                >
                  <option value="MEMBER">MEMBER</option>
                  <option value="PM">PM</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div>
                <label className={styles.inputLabel}>
                  {editingUser ? "Đổi mật khẩu (tùy chọn)" : "Mật khẩu"}
                </label>
                <input
                  type="password"
                  className={styles.searchInput}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required={!editingUser}
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={styles.pageBtn}
                >
                  Hủy
                </button>
                <button type="submit" className={styles.createBtn}>
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Xóa tài khoản?"
        message={`Xóa tài khoản "${deleteModal.username}"? Không thể hoàn tác.`}
        onConfirm={handleConfirmDelete}
        onCancel={() =>
          setDeleteModal({ isOpen: false, userId: null, username: "" })
        }
        isLoading={isDeleting}
      />
    </div>
  );
}

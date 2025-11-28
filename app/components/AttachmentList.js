"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import ConfirmModal from "./ConfirmModal"; // 1. Import Modal

const API_URL = "/api/v1";

export default function AttachmentList({ taskId, projectId, token, canEdit }) {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // 2. State cho Modal Xóa
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    fileId: null,
    fileName: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFiles = async () => {
    try {
      const query = taskId ? `taskId=${taskId}` : `projectId=${projectId}`;
      const res = await fetch(`${API_URL}/attachments?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setFiles(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [taskId, projectId]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    if (taskId) formData.append("taskId", taskId);
    if (projectId) formData.append("projectId", projectId);

    setIsUploading(true);
    try {
      const res = await fetch(`${API_URL}/attachments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        toast.success("Upload thành công");
        fetchFiles();
      } else {
        toast.error("Lỗi upload");
      }
    } catch (e) {
      toast.error("Lỗi kết nối");
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  // --- 3. HÀM MỞ MODAL ---
  const openDeleteModal = (file) => {
    setDeleteModal({
      isOpen: true,
      fileId: file.id,
      fileName: file.file_name,
    });
  };

  // --- 4. HÀM XÓA THẬT SỰ (Gọi khi bấm nút Xóa ở Modal) ---
  const handleConfirmDelete = async () => {
    if (!deleteModal.fileId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/attachments/${deleteModal.fileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== deleteModal.fileId));
        toast.success("Đã xóa file");
        setDeleteModal({ isOpen: false, fileId: null, fileName: "" }); // Đóng modal
      } else {
        toast.error("Lỗi khi xóa file");
      }
    } catch (e) {
      toast.error("Lỗi kết nối");
    } finally {
      setIsDeleting(false);
    }
  };

  const getIcon = (type) => {
    if (type.includes("image")) return "🖼️";
    if (type.includes("pdf")) return "📄";
    return "📎";
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          Tệp đính kèm ({files.length})
        </h5>
        {canEdit && (
          <label className="cursor-pointer text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded flex items-center gap-1 transition-colors">
            <span>{isUploading ? "..." : "📎 Upload"}</span>
            <input
              type="file"
              className="hidden"
              onChange={handleUpload}
              disabled={isUploading}
            />
          </label>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {files.map((file) => (
          <div
            key={file.id}
            className="relative group bg-gray-50 p-2 rounded border border-gray-200 flex items-center gap-2 hover:bg-white hover:shadow-sm transition-all"
          >
            <span className="text-lg">{getIcon(file.file_type)}</span>
            <div className="overflow-hidden flex-1">
              <a
                href={file.file_path}
                target="_blank"
                rel="noopener noreferrer"
                download={file.file_name}
                className="text-xs text-indigo-600 font-medium hover:underline truncate block"
                title={file.file_name}
              >
                {file.file_name}
              </a>

              {file.file_type.includes("image") && (
                <div className="mt-1 h-12 w-full relative rounded overflow-hidden bg-gray-200 border border-gray-100">
                  <img
                    src={file.file_path}
                    alt="preview"
                    className="object-cover w-full h-full"
                  />
                </div>
              )}
            </div>

            {canEdit && (
              <button
                onClick={() => openDeleteModal(file)} // 5. Gọi hàm mở Modal
                className="absolute top-1 right-1 bg-white rounded-full w-5 h-5 flex items-center justify-center text-red-500 shadow-sm border border-gray-200 opacity-0 group-hover:opacity-100 transition-all text-xs hover:bg-red-50 cursor-pointer"
                title="Xóa file"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 6. RENDER MODAL CONFIRM */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Xóa tệp đính kèm?"
        message={`Bạn có chắc muốn xóa file "${deleteModal.fileName}" không? Hành động này không thể hoàn tác.`}
        onConfirm={handleConfirmDelete}
        onCancel={() =>
          setDeleteModal({ isOpen: false, fileId: null, fileName: "" })
        }
        isLoading={isDeleting}
      />
    </div>
  );
}

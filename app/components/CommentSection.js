"use client";

import { useState, useEffect, useRef } from "react";
import Avatar from "./Avatar";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import ConfirmModal from "./ConfirmModal";

const API_URL = "/api/v1";

// --- COMPONENT CON: HIỂN THỊ 1 BÌNH LUẬN (Xử lý xem thêm) ---
const CommentItem = ({ cmt, isMe, onDelete, userRole }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Logic kiểm tra xem có cần hiện nút "Xem thêm" không
  // Điều kiện: Dài hơn 150 ký tự HOẶC có nhiều hơn 3 dòng
  const isLongContent =
    cmt.content.length > 150 || cmt.content.split("\n").length > 3;

  const formatTime = (iso) =>
    new Date(iso).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });

  return (
    <div className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
      <Avatar name={cmt.username} size="sm" />

      <div
        className={`max-w-[85%] p-3 rounded-lg text-sm relative group shadow-sm ${isMe ? "bg-indigo-50 text-indigo-900" : "bg-gray-100 text-gray-800"}`}
      >
        {/* Header: Tên + Giờ */}
        <div
          className={`flex items-baseline justify-between gap-2 mb-1 ${isMe ? "flex-row-reverse" : ""}`}
        >
          <span className="font-bold text-xs">{cmt.username}</span>
          <span className="text-[10px] text-gray-500">
            {formatTime(cmt.created_at)}
          </span>
        </div>

        {/* Nội dung comment */}
        <div
          className={`whitespace-pre-wrap break-words leading-relaxed ${!isExpanded && isLongContent ? "line-clamp-3" : ""}`}
        >
          {cmt.content}
        </div>

        {/* Nút Xem thêm / Thu gọn */}
        {isLongContent && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[10px] font-bold text-indigo-600 hover:underline mt-1 block"
          >
            {isExpanded ? "Thu gọn" : "Xem thêm"}
          </button>
        )}

        {/* Nút Xóa */}
        {(isMe || userRole === "ADMIN") && (
          <button
            onClick={() => onDelete(cmt.id)}
            className={`absolute top-1 ${isMe ? "left-[-20px]" : "right-[-20px]"} text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold px-1`}
            title="Xóa"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

// --- COMPONENT CHÍNH ---
export default function CommentSection({ taskId, token }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  // State cho Modal Xóa
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    commentId: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchComments = async () => {
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setComments(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [taskId]);

  // Auto scroll xuống cuối khi có comment mới
  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [comments]);

  // Xử lý phím Enter
  const handleKeyDown = (e) => {
    // Nếu bấm Enter (không giữ Shift) -> Gửi
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Chặn xuống dòng
      handleSubmit(e);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!content.trim()) return;

    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [...prev, newComment]);
        setContent("");
      } else {
        toast.error("Lỗi gửi bình luận");
      }
    } catch (e) {
      toast.error("Lỗi kết nối");
    }
  };

  const openDeleteModal = (commentId) => {
    setDeleteModal({ isOpen: true, commentId });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.commentId) return;
    setIsDeleting(true);
    try {
      await fetch(`${API_URL}/tasks/0/comments/${deleteModal.commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments((prev) => prev.filter((c) => c.id !== deleteModal.commentId));
      toast.success("Đã xóa bình luận");
      setDeleteModal({ isOpen: false, commentId: null });
    } catch (e) {
      toast.error("Lỗi xóa");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading)
    return (
      <div className="text-xs text-gray-400 p-2">Đang tải bình luận...</div>
    );

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">
        Thảo luận ({comments.length})
      </h4>

      <div
        className="max-h-80 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar"
        ref={scrollRef}
      >
        {comments.length === 0 && (
          <p className="text-xs text-gray-400 italic text-center py-4">
            Chưa có bình luận nào.
          </p>
        )}

        {comments.map((cmt) => (
          <CommentItem
            key={cmt.id}
            cmt={cmt}
            isMe={cmt.user_id === user?.id}
            onDelete={openDeleteModal}
            userRole={user?.role}
          />
        ))}
      </div>

      {/* Khung nhập liệu mới: Dùng Textarea */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 items-end bg-white border border-gray-300 rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-shadow"
      >
        <textarea
          rows={1}
          className="flex-1 text-sm outline-none resize-none bg-transparent custom-scrollbar max-h-24 py-1"
          placeholder="Viết bình luận... (Shift+Enter để xuống dòng)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ minHeight: "24px" }} // Chiều cao tối thiểu
        />
        <button
          type="submit"
          disabled={!content.trim()}
          className="bg-indigo-600 text-white p-1.5 rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors mb-0.5"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </form>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Xóa bình luận?"
        message="Bạn có chắc muốn xóa bình luận này không?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, commentId: null })}
        isLoading={isDeleting}
      />
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import Avatar from "./Avatar";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import ConfirmModal from "./ConfirmModal";

const API_URL = "/api/v1";

// --- ITEM COMMENT ---
const CommentItem = ({ cmt, isMe, onDelete, onReply, userRole }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const formatTime = (iso) =>
    new Date(iso).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });

  // 1. NẾU BẢN THÂN ĐÃ XÓA
  if (cmt.is_deleted) {
    return (
      <div
        className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""} animate-fade-in`}
      >
        <div className="opacity-50 grayscale">
          <Avatar name={cmt.username} size="sm" />
        </div>
        <div
          className={`max-w-[85%] p-3 rounded-lg text-sm border border-gray-200 bg-gray-50 text-gray-400 italic select-none`}
        >
          🚫 Tin nhắn đã bị xóa
        </div>
      </div>
    );
  }

  // 2. HIỂN THỊ BÌNH THƯỜNG
  const hasContent = cmt.content && cmt.content.trim().length > 0;
  const isLong =
    hasContent &&
    (cmt.content.length > 150 || cmt.content.split("\n").length > 3);

  return (
    <div
      className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""} animate-fade-in`}
    >
      <Avatar name={cmt.username} size="sm" />
      <div
        className={`max-w-[85%] flex flex-col ${isMe ? "items-end" : "items-start"}`}
      >
        <div
          className={`p-3 rounded-lg text-sm relative group shadow-sm ${isMe ? "bg-indigo-50 text-indigo-900" : "bg-gray-100 text-gray-800"}`}
        >
          {/* --- PHẦN TRÍCH DẪN (REPLY) --- */}
          {cmt.parent_id && (
            <div className="mb-2 pl-2 border-l-2 border-gray-300 text-xs text-gray-500 bg-white/50 p-1 rounded">
              <span className="font-bold mr-1">@{cmt.parent_username}:</span>
              {/* Kiểm tra parent_is_deleted để hiển thị đúng ngay lập tức */}
              <span className="italic line-clamp-1">
                {cmt.parent_is_deleted
                  ? "🚫 Tin nhắn đã bị xóa"
                  : cmt.parent_content || "[Hình ảnh]"}
              </span>
            </div>
          )}

          <div
            className={`flex items-baseline justify-between gap-2 mb-1 ${isMe ? "flex-row-reverse" : ""}`}
          >
            <span className="font-bold text-xs">{cmt.username}</span>
            <span className="text-[10px] text-gray-400">
              {formatTime(cmt.created_at)}
            </span>
          </div>

          {hasContent && (
            <div
              className={`whitespace-pre-wrap break-words leading-relaxed ${!isExpanded && isLong ? "line-clamp-3" : ""}`}
            >
              {cmt.content.split(" ").map((word, i) =>
                word.startsWith("@") ? (
                  <span key={i} className="text-blue-600 font-bold">
                    {word}{" "}
                  </span>
                ) : (
                  word + " "
                )
              )}
            </div>
          )}

          {isLong && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[10px] font-bold text-indigo-600 hover:underline mt-1 block"
            >
              {isExpanded ? "Thu gọn" : "Xem thêm"}
            </button>
          )}

          {cmt.image_url && (
            <div className="mt-2">
              <a href={cmt.image_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={cmt.image_url}
                  alt="attachment"
                  className="max-w-full h-auto max-h-60 rounded-md border border-gray-200 hover:opacity-90 transition-opacity cursor-zoom-in"
                />
              </a>
            </div>
          )}

          <div
            className={`absolute top-1 ${isMe ? "left-[-50px]" : "right-[-50px]"} opacity-0 group-hover:opacity-100 transition-opacity flex gap-1`}
          >
            <button
              onClick={() => onReply(cmt)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-600 w-6 h-6 rounded-full flex items-center justify-center text-[10px]"
              title="Trả lời"
            >
              ↩
            </button>
            {(isMe || userRole === "ADMIN") && (
              <button
                onClick={() => onDelete(cmt.id)}
                className="bg-red-100 hover:bg-red-200 text-red-600 w-6 h-6 rounded-full flex items-center justify-center text-[10px]"
                title="Xóa"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT CHÍNH ---
export default function CommentSection({ taskId, token, members = [] }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showMentions, setShowMentions] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    commentId: null,
  });

  const scrollRef = useRef(null);

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
  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [comments]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/"))
        return toast.error("Chỉ được gửi file ảnh");
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setContent(val);
    if (val.endsWith("@")) setShowMentions(true);
    else if (val.endsWith(" ")) setShowMentions(false);
  };

  const handleSelectMention = (username) => {
    setContent((prev) => prev + username + " ");
    setShowMentions(false);
  };

  const handleReply = (cmt) => {
    setReplyTo(cmt);
    setContent(`@${cmt.username} `);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    if (!content.trim() && !selectedFile) return;

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("content", content.trim());
      if (replyTo) formData.append("parentId", replyTo.id);
      if (selectedFile) formData.append("file", selectedFile);

      const res = await fetch(`${API_URL}/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const newComment = await res.json();
        if (replyTo) {
          newComment.parent_username = replyTo.username;
          newComment.parent_content = replyTo.content;
        }
        setComments((prev) => [...prev, newComment]);
        setContent("");
        setReplyTo(null);
        removeFile();
      } else {
        toast.error("Lỗi gửi bình luận");
      }
    } catch (e) {
      toast.error("Lỗi kết nối");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- SỬA HÀM NÀY: LOGIC CẬP NHẬT 2 CHIỀU ---
  const handleConfirmDelete = async () => {
    if (!deleteModal.commentId) return;
    try {
      await fetch(`${API_URL}/tasks/0/comments/${deleteModal.commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      // Cập nhật State:
      setComments((prev) =>
        prev.map((c) => {
          // 1. Cập nhật chính dòng bị xóa
          if (c.id === deleteModal.commentId) {
            return {
              ...c,
              is_deleted: true,
              content: "Tin nhắn đã bị xóa",
              image_url: null,
            };
          }

          // 2. Cập nhật các dòng con (Reply) đang trích dẫn dòng này
          if (c.parent_id === deleteModal.commentId) {
            return {
              ...c,
              parent_is_deleted: true, // Đánh dấu để UI hiển thị "Tin nhắn đã xóa"
              parent_content: "Tin nhắn đã bị xóa", // Cập nhật nội dung trích dẫn
            };
          }

          return c;
        })
      );

      toast.success("Đã xóa");
      setDeleteModal({ isOpen: false, commentId: null });
    } catch (e) {
      toast.error("Lỗi xóa");
    }
  };
  // ---------------------------------------------

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !showMentions) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (loading)
    return (
      <div className="text-xs text-gray-400 p-2">Đang tải bình luận...</div>
    );

  return (
    <div className="mt-4 border-t border-gray-100 pt-4 relative">
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
            onDelete={(id) => setDeleteModal({ isOpen: true, commentId: id })}
            onReply={handleReply}
            userRole={user?.role}
          />
        ))}
      </div>

      {(replyTo || previewUrl) && (
        <div className="bg-gray-50 px-3 py-2 rounded-t-lg border border-gray-200 text-xs flex items-center justify-between gap-2 mb-[-1px] relative z-10 mx-1">
          <div className="flex items-center gap-2 overflow-hidden">
            {replyTo && (
              <span className="text-blue-600 truncate">
                Trả lời <b>{replyTo.username}</b>
              </span>
            )}
            {previewUrl && (
              <div className="flex items-center gap-1 text-green-600 border-l pl-2 border-gray-300">
                <span>📷 Ảnh đang chọn...</span>
                <img
                  src={previewUrl}
                  alt="preview"
                  className="h-6 w-6 object-cover rounded border"
                />
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setReplyTo(null);
              removeFile();
              setContent("");
            }}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-red-500 font-bold text-lg"
          >
            ×
          </button>
        </div>
      )}

      {showMentions && members && (
        <div className="absolute bottom-14 left-0 bg-white border border-gray-200 shadow-lg rounded-lg w-48 max-h-40 overflow-y-auto z-50">
          {members.map((m) => (
            <div
              key={m.id}
              onClick={() => handleSelectMention(m.username)}
              className="px-3 py-2 hover:bg-indigo-50 cursor-pointer flex items-center gap-2 text-xs"
            >
              <Avatar name={m.username} size="sm" />
              <span>{m.username}</span>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={`flex gap-2 items-end bg-white border border-gray-300 rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 ${replyTo || previewUrl ? "rounded-t-none border-t-0" : ""}`}
      >
        <label
          className={`text-gray-400 p-1.5 mb-0.5 transition-colors ${isSubmitting ? "cursor-not-allowed opacity-50" : "hover:text-indigo-600 cursor-pointer"}`}
          title="Gửi ảnh"
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isSubmitting}
          />
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
          </svg>
        </label>

        <textarea
          rows={1}
          className="flex-1 text-sm outline-none resize-none bg-transparent custom-scrollbar max-h-24 py-1.5 disabled:bg-gray-50 disabled:text-gray-400"
          placeholder={
            isSubmitting ? "Đang gửi..." : "Viết bình luận... (@ để tag)"
          }
          value={content}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          style={{ minHeight: "24px" }}
        />

        <button
          type="submit"
          disabled={(!content.trim() && !selectedFile) || isSubmitting}
          className={`p-1.5 rounded-full mb-0.5 text-white shadow-sm transition-colors ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"}`}
        >
          {isSubmitting ? (
            <svg
              className="animate-spin w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          )}
        </button>
      </form>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Xóa bình luận?"
        message="Bạn có chắc muốn xóa bình luận này không?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, commentId: null })}
      />
    </div>
  );
}

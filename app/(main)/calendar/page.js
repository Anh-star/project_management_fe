"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import Link from "next/link";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar-custom.css";

const API_URL = "/api/v1";
const localizer = momentLocalizer(moment);

// --- COMPONENT MODAL CHI TIẾT (Giữ nguyên) ---
const TaskDetailModal = ({ event, onClose }) => {
  if (!event) return null;
  const getPriorityColor = (p) => {
    if (p === "URGENT") return "bg-red-100 text-red-700 border-red-200";
    if (p === "HIGH") return "bg-orange-100 text-orange-700 border-orange-200";
    if (p === "MEDIUM") return "bg-blue-50 text-blue-600 border-blue-200";
    return "bg-gray-100 text-gray-600 border-gray-200";
  };
  const getStatusColor = (s) => {
    if (s === "DONE") return "bg-green-100 text-green-700 border-green-200";
    if (s === "IN_PROGRESS") return "bg-blue-100 text-blue-700 border-blue-200";
    return "bg-gray-100 text-gray-600 border-gray-200";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-start bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-900 leading-snug">
              {event.title_only}
            </h3>
            <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">
              Dự án: {event.project_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-3">
            <span
              className={`px-2.5 py-1 text-xs font-bold rounded-full border ${getStatusColor(event.status)}`}
            >
              {event.status}
            </span>
            <span
              className={`px-2.5 py-1 text-xs font-bold rounded-full border ${getPriorityColor(event.priority)}`}
            >
              {event.priority}
            </span>
          </div>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-center gap-3">
              <span className="text-xl">👤</span>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase">
                  Người thực hiện
                </p>
                <p className="font-medium">{event.assignee || "Chưa giao"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">🕒</span>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase">
                  Thời gian
                </p>
                <p>
                  {moment(event.start).format("DD/MM HH:mm")}{" "}
                  <span className="mx-1">➝</span>{" "}
                  {moment(event.end).format("DD/MM HH:mm")}
                </p>
              </div>
            </div>
            {event.desc && (
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mt-2">
                <p className="text-xs text-gray-400 font-bold uppercase mb-1">
                  Mô tả
                </p>
                <p className="text-gray-600 italic line-clamp-4">
                  {event.desc}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-white hover:shadow-sm rounded-lg border border-transparent hover:border-gray-200 transition-all"
          >
            Đóng
          </button>
          <Link
            href={`/project-details?id=${event.project_id}`}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all flex items-center gap-2"
          >
            Xem dự án <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

// --- TRANG LỊCH CHÍNH ---
export default function CalendarPage() {
  const { user, token } = useAuth();
  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [usersList, setUsersList] = useState([]);

  const [filterProject, setFilterProject] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);

  // 1. Load danh sách dự án & user (Chỉ Admin/PM mới load list user)
  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setProjects(Array.isArray(data) ? data : []));

      if (user?.role === "ADMIN" || user?.role === "PM") {
        fetch(`${API_URL}/users?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((data) => setUsersList(data.data || []));
      }
    }
  }, [token, user]);

  // 2. Load Task -> Events (SỬA LOGIC LỌC TẠI ĐÂY)
  useEffect(() => {
    if (token && user) {
      // Logic tạo query string:
      let query = `?projectId=${filterProject}`;

      if (user.role === "MEMBER") {
        // Nếu là Member: Bắt buộc lọc theo ID của chính mình
        query += `&assigneeId=${user.id}`;
      } else {
        // Nếu là Admin/PM: Lấy theo dropdown filter (nếu có chọn)
        query += `&assigneeId=${filterUser}`;
      }

      fetch(`${API_URL}/calendar${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((tasks) => {
          if (!Array.isArray(tasks)) return;

          const calendarEvents = tasks.map((task) => ({
            id: task.id,
            // Format Title
            title: `[${task.project_name}] ${task.title} — 👤 ${task.assignee_name || "Chưa giao"}`,

            // Dữ liệu cho Modal
            title_only: task.title,
            project_name: task.project_name,
            project_id: task.project_id,
            desc: task.description,
            assignee: task.assignee_name,

            start: new Date(task.start_date || task.created_at),
            end: new Date(
              task.due_date ||
                new Date(task.start_date || task.created_at).getTime() +
                  2 * 60 * 60 * 1000
            ),
            status: task.status,
            priority: task.priority,
          }));
          setEvents(calendarEvents);
        })
        .catch((err) => console.error(err));
    }
  }, [token, filterProject, filterUser, user]); // Thêm user vào dependency

  const eventStyleGetter = (event) => {
    let backgroundColor = "#6b7280";
    if (event.status === "DONE") {
      backgroundColor = "#10b981";
    } else {
      switch (event.priority) {
        case "URGENT":
          backgroundColor = "#ef4444";
          break;
        case "HIGH":
          backgroundColor = "#f97316";
          break;
        case "MEDIUM":
          backgroundColor = "#3b82f6";
          break;
        default:
          backgroundColor = "#6b7280";
          break;
      }
    }
    const isOverdue = event.status !== "DONE" && new Date() > event.end;
    const border = isOverdue ? "2px solid #991b1b" : "0px";
    return {
      style: {
        backgroundColor,
        border,
        borderRadius: "4px",
        opacity: 0.9,
        color: "white",
        display: "block",
        fontSize: "12px",
      },
    };
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lịch làm việc</h1>
          <p className="text-sm text-gray-500 mt-1">
            {user?.role === "MEMBER"
              ? "Theo dõi công việc của bạn."
              : "Theo dõi tiến độ toàn hệ thống."}
          </p>
          <div className="flex gap-3 mt-2 text-[10px] font-bold uppercase text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> Hoàn
              thành
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span> Khẩn cấp
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span> Cao
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Trung
              bình
            </span>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
          >
            <option value="">-- Tất cả Dự án --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* CHỈ HIỂN THỊ DROPDOWN CHỌN NHÂN VIÊN NẾU LÀ ADMIN HOẶC PM */}
          {(user?.role === "ADMIN" || user?.role === "PM") && (
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
            >
              <option value="">-- Tất cả Nhân viên --</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div
        className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        style={{ height: "700px" }}
      >
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          eventPropGetter={eventStyleGetter}
          views={["month"]}
          defaultView="month"
          onSelectEvent={handleSelectEvent}
        />
      </div>

      {selectedEvent && (
        <TaskDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}

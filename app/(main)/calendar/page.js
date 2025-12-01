"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css"; // Import CSS Gốc
import "./calendar-custom.css"; // CSS tùy chỉnh (tạo ở bước 4)
import toast from "react-hot-toast";

const API_URL = "/api/v1";
const localizer = momentLocalizer(moment);

export default function CalendarPage() {
  const { user, token } = useAuth();
  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [usersList, setUsersList] = useState([]);

  // Filters
  const [filterProject, setFilterProject] = useState("");
  const [filterUser, setFilterUser] = useState("");

  // 1. Load danh sách dự án & user để lọc
  useEffect(() => {
    if (token) {
      // Lấy Projects
      fetch(`${API_URL}/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setProjects(Array.isArray(data) ? data : []));

      // Lấy Users (Nếu là Admin/PM)
      if (user?.role === "ADMIN" || user?.role === "PM") {
        fetch(`${API_URL}/users?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((data) => setUsersList(data.data || []));
      }
    }
  }, [token, user]);

  // 2. Load Task và chuyển đổi thành Event cho lịch
  useEffect(() => {
    if (token) {
      const query = `?projectId=${filterProject}&assigneeId=${filterUser}`;

      fetch(`${API_URL}/calendar${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((tasks) => {
          if (!Array.isArray(tasks)) return;

          // Convert Task -> Calendar Event
          const calendarEvents = tasks.map((task) => ({
            id: task.id,
            title: `${task.title} (${task.project_name})`,
            // Nếu không có start_date, lấy created_at
            start: new Date(task.start_date || task.created_at),
            // Nếu không có due_date, mặc định +2 tiếng từ start
            end: new Date(
              task.due_date ||
                new Date(task.start_date || task.created_at).getTime() +
                  2 * 60 * 60 * 1000
            ),
            status: task.status,
            priority: task.priority,
            assignee: task.assignee_name,
          }));
          setEvents(calendarEvents);
        })
        .catch((err) => console.error(err));
    }
  }, [token, filterProject, filterUser]);

  // Tô màu sự kiện theo trạng thái
  const eventStyleGetter = (event) => {
    let backgroundColor = "#3174ad"; // Default Blue
    if (event.status === "DONE") backgroundColor = "#10b981"; // Green
    if (event.status === "TODO") backgroundColor = "#6b7280"; // Gray
    if (event.status === "OVERDUE") backgroundColor = "#ef4444"; // Red

    // Nếu ưu tiên Urgent -> viền đỏ
    const border = event.priority === "URGENT" ? "2px solid red" : "none";

    return {
      style: {
        backgroundColor,
        border,
        borderRadius: "4px",
        opacity: 0.8,
        color: "white",
        border: "0px",
        display: "block",
      },
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lịch làm việc</h1>
          <p className="text-sm text-gray-500 mt-1">
            Theo dõi deadline và tiến độ trực quan.
          </p>
        </div>

        {/* BỘ LỌC */}
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
          views={["month", "week", "day", "agenda"]}
          defaultView="month"
          tooltipAccessor={(e) =>
            `Ưu tiên: ${e.priority} - Người làm: ${e.assignee || "Chưa giao"}`
          }
          onSelectEvent={(e) =>
            alert(
              `${e.title}\nTrạng thái: ${e.status}\nNgười làm: ${e.assignee}`
            )
          } // Hoặc mở Modal chi tiết
        />
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import Avatar from "./Avatar";

export default function ProjectReport({ projectId, token }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setReport(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [projectId]);

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500">Đang tải báo cáo...</div>
    );

  return (
    <div className="mt-6 animate-fade-in">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">📊</span>
          <h3 className="font-bold text-gray-900 text-lg">
            Hiệu suất thành viên
          </h3>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4">Thành viên</th>
                <th className="px-6 py-4 text-center">Tổng việc</th>
                <th className="px-6 py-4 text-center text-green-700">
                  Hoàn thành
                </th>
                <th className="px-6 py-4 text-center text-red-600">Trễ hạn</th>
                <th className="px-6 py-4 text-right w-1/3">Tiến độ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {report?.members.map((m) => {
                const total = parseInt(m.assigned_tasks);
                const done = parseInt(m.done_tasks);
                const percent =
                  total > 0 ? Math.round((done / total) * 100) : 0;

                return (
                  <tr
                    key={m.user_id}
                    className="hover:bg-indigo-50/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={m.username} size="sm" />
                        <div>
                          <span className="font-medium text-gray-900 block">
                            {m.username}
                          </span>
                          <span className="text-xs text-gray-400">
                            {m.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600 font-medium bg-gray-50/50">
                      {total}
                    </td>
                    <td className="px-6 py-4 text-center text-green-600 font-bold">
                      {done}
                    </td>
                    <td className="px-6 py-4 text-center text-red-500 font-medium">
                      {m.overdue_tasks}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-xs font-bold text-gray-600 w-8">
                          {percent}%
                        </span>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden shadow-inner">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 shadow-sm ${
                              percent === 100
                                ? "bg-green-500"
                                : percent > 75
                                  ? "bg-indigo-500"
                                  : percent > 25
                                    ? "bg-blue-400"
                                    : "bg-orange-400"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {report?.members.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-gray-400">
                    Chưa có thành viên nào trong dự án.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

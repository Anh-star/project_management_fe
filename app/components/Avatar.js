export default function Avatar({ name, size = "md" }) {
  // Lấy chữ cái đầu: "Admin User" -> "A"
  const initial = name ? name.charAt(0).toUpperCase() : "?";

  // Kích thước
  const sizes = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base",
    xl: "w-12 h-12 text-lg",
  };

  // Màu ngẫu nhiên dựa trên tên (để mỗi user 1 màu)
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
    "bg-rose-500",
  ];

  // Hàm băm đơn giản để chọn màu cố định cho 1 tên
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorClass = colors[Math.abs(hash) % colors.length];

  return (
    <div
      className={`${sizes[size]} ${colorClass} rounded-full flex items-center justify-center text-white font-bold shadow-sm border-2 border-white`}
    >
      {initial}
    </div>
  );
}

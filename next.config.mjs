/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Xuất ra file tĩnh (HTML/CSS/JS)
  images: { unoptimized: true }, // Tắt tối ưu ảnh server-side
  eslint: { ignoreDuringBuilds: true }, // Bỏ qua lỗi lint khi build
};
export default nextConfig;
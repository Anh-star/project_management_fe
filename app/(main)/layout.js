// app/(main)/layout.js
import Sidebar from '../components/Sidebar'; // Đường dẫn đúng để import Sidebar

export default function MainLayout({ children }) {
    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Sidebar cố định bên trái */}
            <Sidebar />
            
            {/* Nội dung chính thay đổi theo trang */}
            <main className="flex-1 overflow-y-auto h-screen">
                {children}
            </main>
        </div>
    );
}
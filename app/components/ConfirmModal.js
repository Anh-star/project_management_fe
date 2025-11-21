// app/components/ConfirmModal.js
'use client';

// QUAN TRỌNG: Phải là 'export default function'
export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, isLoading }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4 transform transition-all scale-100">
                <div className="flex items-center gap-3 text-red-600 mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                </div>
                <p className="text-gray-500 mb-6 text-sm leading-relaxed">
                    {message}
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Hủy bỏ
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2"
                    >
                        {isLoading ? 'Đang xử lý...' : 'Xóa ngay'}
                    </button>
                </div>
            </div>
        </div>
    );
}
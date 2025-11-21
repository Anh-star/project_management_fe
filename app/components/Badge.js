export default function Badge({ type, value }) {
    // Cấu hình màu sắc
    const colors = {
        // Trạng thái TASK / PROJECT
        TODO: 'bg-gray-100 text-gray-600 border-gray-200',
        IN_PROGRESS: 'bg-blue-50 text-blue-600 border-blue-200',
        REVIEW: 'bg-purple-50 text-purple-600 border-purple-200',
        DONE: 'bg-green-50 text-green-600 border-green-200',
        COMPLETED: 'bg-green-50 text-green-600 border-green-200',
        OVERDUE: 'bg-red-50 text-red-600 border-red-200',
        
        // Độ ưu tiên (PRIORITY)
        LOW: 'bg-slate-100 text-slate-600',
        MEDIUM: 'bg-yellow-50 text-yellow-600',
        HIGH: 'bg-orange-50 text-orange-600',
        URGENT: 'bg-red-50 text-red-600',

        // Vai trò (ROLE)
        ADMIN: 'bg-red-100 text-red-700 border-red-200',
        PM: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        MEMBER: 'bg-gray-100 text-gray-700 border-gray-200',
    };

    // Fallback màu mặc định
    const colorClass = colors[value] || 'bg-gray-100 text-gray-600 border-gray-200';

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wide ${colorClass}`}>
            {value?.replace('_', ' ')}
        </span>
    );
}

import React, { useState, useEffect } from 'react';
import * as auth from '../services/authService';
import { Crown, Users, CircleDot, FileText, BarChart3, ClipboardList, RefreshCw, Pencil, Lock, Unlock, ChartBar, ChevronRight, X, KeyRound, LogOut, Bot, Palette, FolderPlus } from 'lucide-react';

interface AdminDashboardProps {
    onBack: () => void;
    currentUser: auth.UserProfile;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, currentUser }) => {
    const [editors, setEditors] = useState<(auth.UserProfile & { stats?: auth.EditorStats })[]>([]);
    const [activities, setActivities] = useState<auth.ActivityLog[]>([]);
    const [selectedEditor, setSelectedEditor] = useState<string | null>(null);
    const [editorSessions, setEditorSessions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<'editors' | 'activities'>('editors');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const [editorsData, activitiesData] = await Promise.all([
            auth.getAllEditors(),
            auth.getEditorActivities()
        ]);
        setEditors(editorsData);
        setActivities(activitiesData);
        setIsLoading(false);
    };

    const loadEditorSessions = async (userId: string) => {
        setSelectedEditor(userId);
        const sessions = await auth.getEditorSessions(userId);
        setEditorSessions(sessions);
    };

    const handleToggleActive = async (userId: string, isActive: boolean) => {
        await auth.toggleUserActive(userId, !isActive);
        loadData();
    };

    const handleChangeRole = async (userId: string, currentRole: string) => {
        const newRole = currentRole === 'editor' ? 'superadmin' : 'editor';
        if (window.confirm(`هل تريد تغيير الدور إلى ${newRole === 'superadmin' ? 'مدير' : 'محرر'}؟`)) {
            await auth.changeUserRole(userId, newRole as 'editor' | 'superadmin');
            loadData();
        }
    };

    const formatDate = (date: string | null) => {
        if (!date) return 'لم يسجل دخول بعد';
        return new Date(date).toLocaleString('ar-EG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getActionLabel = (action: string) => {
        const labels: Record<string, { icon: React.ReactNode; text: string }> = {
            'login': { icon: <KeyRound className="w-3.5 h-3.5" />, text: 'تسجيل دخول' },
            'logout': { icon: <LogOut className="w-3.5 h-3.5" />, text: 'تسجيل خروج' },
            'article_created': { icon: <FileText className="w-3.5 h-3.5" />, text: 'إنشاء مقال' },
            'article_updated': { icon: <Pencil className="w-3.5 h-3.5" />, text: 'تحديث مقال' },
            'article_published': { icon: <ChevronRight className="w-3.5 h-3.5" />, text: 'نشر مقال' },
            'section_generated': { icon: <Bot className="w-3.5 h-3.5" />, text: 'توليد قسم' },
            'metadata_generated': { icon: <BarChart3 className="w-3.5 h-3.5" />, text: 'توليد بيانات' },
            'method_created': { icon: <Palette className="w-3.5 h-3.5" />, text: 'إنشاء أسلوب' },
            'category_added': { icon: <FolderPlus className="w-3.5 h-3.5" />, text: 'إضافة تصنيف' }
        };
        const labelData = labels[action];
        if (!labelData) return <span>{action}</span>;
        return <span className="flex items-center gap-1.5">{labelData.icon} {labelData.text}</span>;
    };

    if (currentUser.role !== 'superadmin') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
                <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">غير مصرح</h2>
                    <p className="text-slate-500 mb-4">ليس لديك صلاحية الوصول لهذه الصفحة</p>
                    <button onClick={onBack} className="text-emerald-600 font-medium hover:underline">
                        العودة للصفحة الرئيسية
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-purple-900" dir="rtl">
            {/* Header */}
            <header className="bg-white/10 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                                    <Crown className="w-4 h-4 text-white" />
                                </span>
                                لوحة تحكم المدير
                            </h1>
                            <p className="text-slate-400 text-sm">إدارة المحررين وتتبع الإنتاجية</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-left">
                            <p className="text-white font-medium">{currentUser.full_name}</p>
                            <p className="text-slate-400 text-xs">{currentUser.email}</p>
                        </div>
                        <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                            {currentUser.full_name?.charAt(0) || 'A'}
                        </div>
                    </div>
                </div>
            </header>

            {/* Stats Overview */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-emerald-100">إجمالي المحررين</span>
                            <span className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Users className="w-5 h-5" /></span>
                        </div>
                        <p className="text-4xl font-bold">{editors.length}</p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-blue-100">النشطون الآن</span>
                            <span className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><CircleDot className="w-5 h-5" /></span>
                        </div>
                        <p className="text-4xl font-bold">
                            {editors.filter(e => e.is_active && e.last_login_at &&
                                new Date(e.last_login_at).getTime() > Date.now() - 3600000
                            ).length}
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-purple-100">مقالات اليوم</span>
                            <span className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><FileText className="w-5 h-5" /></span>
                        </div>
                        <p className="text-4xl font-bold">
                            {editors.reduce((sum, e) => sum + (e.stats?.articles_today || 0), 0)}
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-amber-100">مقالات الشهر</span>
                            <span className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><BarChart3 className="w-5 h-5" /></span>
                        </div>
                        <p className="text-4xl font-bold">
                            {editors.reduce((sum, e) => sum + (e.stats?.articles_this_month || 0), 0)}
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setView('editors')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all ${view === 'editors'
                            ? 'bg-white text-slate-900 shadow-lg'
                            : 'bg-white/10 text-white hover:bg-white/20'
                            }`}
                    >
                        <Users className="w-4 h-4" /> المحررون ({editors.length})
                    </button>
                    <button
                        onClick={() => setView('activities')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all ${view === 'activities'
                            ? 'bg-white text-slate-900 shadow-lg'
                            : 'bg-white/10 text-white hover:bg-white/20'
                            }`}
                    >
                        <ClipboardList className="w-4 h-4" /> سجل النشاط ({activities.length})
                    </button>
                    <button
                        onClick={loadData}
                        className="px-4 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all"
                    >
                        <RefreshCw className="w-4 h-4" /> تحديث
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <svg className="animate-spin h-12 w-12 text-white" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                    </div>
                ) : view === 'editors' ? (
                    /* Editors List */
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10">
                        <table className="w-full">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="text-right text-white/70 text-sm font-medium px-6 py-4">المحرر</th>
                                    <th className="text-right text-white/70 text-sm font-medium px-6 py-4">الدور</th>
                                    <th className="text-right text-white/70 text-sm font-medium px-6 py-4">آخر دخول</th>
                                    <th className="text-right text-white/70 text-sm font-medium px-6 py-4">اليوم</th>
                                    <th className="text-right text-white/70 text-sm font-medium px-6 py-4">الأسبوع</th>
                                    <th className="text-right text-white/70 text-sm font-medium px-6 py-4">الشهر</th>
                                    <th className="text-right text-white/70 text-sm font-medium px-6 py-4">الحالة</th>
                                    <th className="text-center text-white/70 text-sm font-medium px-6 py-4">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {editors.map(editor => (
                                    <tr key={editor.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                                                    {editor.full_name?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{editor.full_name || 'بدون اسم'}</p>
                                                    <p className="text-slate-400 text-xs">{editor.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${editor.role === 'superadmin'
                                                ? 'bg-purple-500/20 text-purple-300'
                                                : 'bg-emerald-500/20 text-emerald-300'
                                                }`}>
                                                {editor.role === 'superadmin' ? <><Crown className="w-3 h-3" /> مدير</> : <><Pencil className="w-3 h-3" /> محرر</>}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-300 text-sm">
                                            {formatDate(editor.last_login_at)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-white font-bold">{editor.stats?.articles_today || 0}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-white font-bold">{editor.stats?.articles_this_week || 0}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-white font-bold">{editor.stats?.articles_this_month || 0}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${editor.is_active
                                                ? 'bg-emerald-500/20 text-emerald-300'
                                                : 'bg-red-500/20 text-red-300'
                                                }`}>
                                                {editor.is_active ? <><CircleDot className="w-3 h-3 text-emerald-400" /> نشط</> : <><CircleDot className="w-3 h-3 text-red-400" /> معطل</>}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => loadEditorSessions(editor.id)}
                                                    className="p-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all"
                                                    title="عرض الجلسات"
                                                >
                                                    <ChartBar className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleActive(editor.id, editor.is_active)}
                                                    className={`p-2 rounded-lg transition-all ${editor.is_active
                                                        ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                                                        : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                                                        }`}
                                                    title={editor.is_active ? 'تعطيل' : 'تفعيل'}
                                                >
                                                    {editor.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                                </button>
                                                {editor.id !== currentUser.id && (
                                                    <button
                                                        onClick={() => handleChangeRole(editor.id, editor.role)}
                                                        className="p-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-all"
                                                        title="تغيير الدور"
                                                    >
                                                        <Crown className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* Activities List */
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10">
                        <div className="max-h-[600px] overflow-y-auto">
                            {activities.map(activity => (
                                <div
                                    key={activity.id}
                                    className="flex items-center gap-4 px-6 py-4 border-b border-white/5 hover:bg-white/5 transition-colors"
                                >
                                    <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center text-white text-sm">
                                        {activity.user?.full_name?.charAt(0) || 'U'}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white">
                                            <span className="font-medium">{activity.user?.full_name || 'مستخدم'}</span>
                                            <span className="text-slate-400 mx-2">•</span>
                                            <span>{getActionLabel(activity.action_type)}</span>
                                        </p>
                                        <p className="text-slate-400 text-xs">{formatDate(activity.created_at)}</p>
                                    </div>
                                    {activity.entity_type && (
                                        <span className="px-3 py-1 bg-white/10 rounded-lg text-slate-300 text-xs">
                                            {activity.entity_type}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Sessions Modal */}
                {selectedEditor && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                            <div className="flex items-center justify-between p-6 border-b border-white/10">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2"><ChartBar className="w-5 h-5" /> سجل الجلسات</h3>
                                <button
                                    onClick={() => setSelectedEditor(null)}
                                    className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 max-h-[60vh] overflow-y-auto">
                                {editorSessions.length === 0 ? (
                                    <p className="text-slate-400 text-center py-8">لا توجد جلسات مسجلة</p>
                                ) : (
                                    <div className="space-y-3">
                                        {editorSessions.map(session => (
                                            <div
                                                key={session.id}
                                                className="bg-white/5 rounded-xl p-4 flex items-center justify-between"
                                            >
                                                <div>
                                                    <p className="text-white font-medium">
                                                        {formatDate(session.started_at)}
                                                    </p>
                                                    <p className="text-slate-400 text-sm">
                                                        {session.ended_at ? `انتهت: ${formatDate(session.ended_at)}` : <span className="flex items-center gap-1"><CircleDot className="w-3 h-3 text-emerald-400" /> جارية حالياً</span>}
                                                    </p>
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-2xl font-bold text-emerald-400">
                                                        {session.duration_minutes || '—'} <span className="text-sm text-slate-400">دقيقة</span>
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

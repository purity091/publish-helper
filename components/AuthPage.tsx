
import React, { useState } from 'react';
import * as auth from '../services/authService';

interface AuthPageProps {
    onSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setIsLoading(true);

        try {
            if (mode === 'login') {
                const result = await auth.signIn(email, password);
                if (result.success) {
                    onSuccess();
                } else {
                    setError(result.error || 'حدث خطأ في تسجيل الدخول');
                }
            } else {
                if (!fullName.trim()) {
                    setError('الاسم الكامل مطلوب');
                    setIsLoading(false);
                    return;
                }
                const result = await auth.signUp(email, password, fullName);
                if (result.success) {
                    setSuccess('تم إنشاء الحساب بنجاح! تحقق من بريدك الإلكتروني للتأكيد.');
                    setMode('login');
                } else {
                    setError(result.error || 'حدث خطأ في إنشاء الحساب');
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center p-4" dir="rtl">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}></div>
            </div>

            <div className="w-full max-w-md relative">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-emerald-500/30">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">مولد المقالات الذكي</h1>
                    <p className="text-slate-400">منصة إنشاء المحتوى المدعومة بالذكاء الاصطناعي</p>
                </div>

                {/* Auth Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
                    {/* Tabs */}
                    <div className="flex bg-white/10 rounded-xl p-1 mb-6">
                        <button
                            onClick={() => setMode('login')}
                            className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all ${mode === 'login'
                                    ? 'bg-emerald-500 text-white shadow-lg'
                                    : 'text-slate-300 hover:text-white'
                                }`}
                        >
                            تسجيل الدخول
                        </button>
                        <button
                            onClick={() => setMode('register')}
                            className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all ${mode === 'register'
                                    ? 'bg-emerald-500 text-white shadow-lg'
                                    : 'text-slate-300 hover:text-white'
                                }`}
                        >
                            حساب جديد
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {mode === 'register' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">الاسم الكامل</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    placeholder="أدخل اسمك الكامل"
                                    required={mode === 'register'}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">البريد الإلكتروني</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                placeholder="example@email.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">كلمة المرور</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>

                        {/* Error/Success Messages */}
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-300 text-sm">
                                ⚠️ {error}
                            </div>
                        )}
                        {success && (
                            <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-xl p-4 text-emerald-300 text-sm">
                                ✅ {success}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>جاري المعالجة...</span>
                                </>
                            ) : (
                                <>
                                    <span>{mode === 'login' ? 'دخول' : 'إنشاء حساب'}</span>
                                    <svg className="w-5 h-5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-500 text-sm mt-6">
                    {mode === 'login' ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}{' '}
                    <button
                        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                        className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                    >
                        {mode === 'login' ? 'سجل الآن' : 'سجل دخولك'}
                    </button>
                </p>
            </div>
        </div>
    );
};

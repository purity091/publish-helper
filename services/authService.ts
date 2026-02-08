
import { supabase } from './supabaseService';

// Types
export interface UserProfile {
    id: string;
    email: string;
    full_name: string | null;
    role: 'editor' | 'superadmin';
    avatar_url: string | null;
    is_active: boolean;
    last_login_at: string | null;
    created_at: string;
}

export interface EditorStats {
    user_id: string;
    total_articles: number;
    total_sections: number;
    total_words: number;
    articles_today: number;
    articles_this_week: number;
    articles_this_month: number;
    avg_session_minutes: number;
    last_activity_at: string | null;
}

export interface ActivityLog {
    id: string;
    user_id: string;
    action_type: string;
    entity_type: string | null;
    entity_id: string | null;
    metadata: any;
    created_at: string;
    user?: UserProfile;
}

export interface AuthState {
    user: UserProfile | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

// ============ التحقق من صلاحية الجلسة ============

/**
 * التحقق مما إذا كانت الجلسة المحفوظة لا تزال صالحة
 * الجلسة تنتهي بعد 90 يومًا إذا لم يتم تسجيل الخروج
 */
export const isSessionStillValid = (): boolean => {
    const rememberMeActive = localStorage.getItem('remember_me_active');
    const sessionExpiresAt = localStorage.getItem('session_expires_at');

    if (!rememberMeActive || !sessionExpiresAt) {
        return true; // لا توجد جلسة محفوظة، دع Supabase يتحقق
    }

    const expiresAt = parseInt(sessionExpiresAt, 10);
    const now = Date.now();

    if (now > expiresAt) {
        // انتهت صلاحية الجلسة، مسح البيانات
        localStorage.removeItem('session_expires_at');
        localStorage.removeItem('remember_me_active');
        return false;
    }

    return true;
};

/**
 * تحديث وقت انتهاء الجلسة (يُستدعى عند أي نشاط)
 */
export const refreshSessionExpiry = (): void => {
    const rememberMeActive = localStorage.getItem('remember_me_active');
    if (rememberMeActive) {
        // تحديث وقت الانتهاء لـ 90 يوم من الآن
        const expiresAt = Date.now() + (90 * 24 * 60 * 60 * 1000);
        localStorage.setItem('session_expires_at', expiresAt.toString());
    }
};

// ============ المصادقة ============

export const signUp = async (email: string, password: string, fullName: string): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) {
        return { success: false, error: 'Supabase غير متصل' };
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                role: 'editor'
            }
        }
    });

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
};

// مدة الجلسة: 90 يوم بالثواني
const SESSION_DURATION_SECONDS = 90 * 24 * 60 * 60; // 7,776,000 ثانية

export const signIn = async (email: string, password: string, rememberMe: boolean = true): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) {
        return { success: false, error: 'Supabase غير متصل' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        return { success: false, error: error.message };
    }

    // إذا تم اختيار "تذكرني"، نحفظ علامة في localStorage
    if (rememberMe && data.session) {
        // تخزين وقت انتهاء الجلسة (90 يوم من الآن)
        const expiresAt = Date.now() + (SESSION_DURATION_SECONDS * 1000);
        localStorage.setItem('session_expires_at', expiresAt.toString());
        localStorage.setItem('remember_me_active', 'true');
    } else {
        localStorage.removeItem('session_expires_at');
        localStorage.removeItem('remember_me_active');
    }

    // العمليات الثانوية تُنفذ في الخلفية بدون انتظار (لا تؤخر تسجيل الدخول)
    if (data.user) {
        const userId = data.user.id;

        // تنفيذ جميع العمليات في الخلفية بالتوازي
        (async () => {
            try {
                await Promise.all([
                    // تحديث وقت آخر تسجيل دخول
                    (async () => {
                        try {
                            await supabase
                                .from('user_profiles')
                                .update({ last_login_at: new Date().toISOString() })
                                .eq('id', userId);
                        } catch (e) {
                            console.warn('Could not update last_login_at:', e);
                        }
                    })(),

                    // تسجيل النشاط (نسخة مبسطة بدون استدعاء getUser مرة أخرى)
                    (async () => {
                        try {
                            await supabase
                                .from('activity_logs')
                                .insert({
                                    user_id: userId,
                                    action_type: 'login',
                                    metadata: { remember_me: rememberMe }
                                });
                        } catch (e) {
                            console.warn('Could not log activity:', e);
                        }
                    })(),

                    // بدء جلسة جديدة (نسخة مبسطة)
                    startSessionFast(userId)
                ]);
            } catch {
                // تجاهل أي أخطاء في العمليات الخلفية
            }
        })();
    }

    return { success: true };
};

// نسخة سريعة من startSession تستخدم userId مباشرة بدون استدعاء getUser
const startSessionFast = async (userId: string): Promise<void> => {
    if (!supabase) return;

    try {
        // إنهاء الجلسات السابقة وبدء جلسة جديدة بالتوازي
        const [, sessionResult] = await Promise.all([
            supabase
                .from('user_sessions')
                .update({
                    is_active: false,
                    ended_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('is_active', true),

            supabase
                .from('user_sessions')
                .insert({
                    user_id: userId,
                    started_at: new Date().toISOString(),
                    is_active: true
                })
                .select('id')
                .single()
        ]);

        if (sessionResult.data) {
            currentSessionId = sessionResult.data.id;
        }
    } catch (e) {
        console.warn('Could not start session:', e);
    }
};

export const signOut = async (): Promise<void> => {
    if (!supabase) return;

    // محاولة إنهاء الجلسة (تجاهل الأخطاء)
    try {
        await endSession();
    } catch (e) {
        console.warn('Could not end session:', e);
    }

    // محاولة تسجيل النشاط (تجاهل الأخطاء)
    try {
        await logActivity('logout');
    } catch (e) {
        console.warn('Could not log activity:', e);
    }

    // مسح cache الدور
    clearRoleCache();

    // مسح cache المستخدم
    cachedUserProfile = null;

    // مسح بيانات "تذكرني"
    localStorage.removeItem('session_expires_at');
    localStorage.removeItem('remember_me_active');
    localStorage.removeItem('saved_user_email');

    await supabase.auth.signOut();
};

// Cache للـ user profile (صالح لمدة 30 ثانية)
let cachedUserProfile: { profile: UserProfile | null; timestamp: number } | null = null;
const USER_CACHE_DURATION = 30000; // 30 ثانية

export const getCurrentUser = async (forceRefresh = false): Promise<UserProfile | null> => {
    if (!supabase) return null;

    // استخدام الـ cache إذا كان صالحاً
    if (!forceRefresh && cachedUserProfile && Date.now() - cachedUserProfile.timestamp < USER_CACHE_DURATION) {
        return cachedUserProfile.profile;
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            cachedUserProfile = { profile: null, timestamp: Date.now() };
            return null;
        }

        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        // إذا لم يوجد profile، أنشئ واحد افتراضي من بيانات auth
        if (error || !profile) {
            console.warn('No profile found, using auth data');
            const fallbackProfile: UserProfile = {
                id: user.id,
                email: user.email || '',
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'مستخدم',
                role: 'editor',
                avatar_url: null,
                is_active: true,
                last_login_at: new Date().toISOString(),
                created_at: user.created_at || new Date().toISOString()
            };
            cachedUserProfile = { profile: fallbackProfile, timestamp: Date.now() };
            return fallbackProfile;
        }

        cachedUserProfile = { profile, timestamp: Date.now() };
        return profile;
    } catch (error) {
        console.error('getCurrentUser error:', error);
        return null;
    }
};

// مسح cache المستخدم عند تسجيل الخروج
export const clearUserCache = () => {
    cachedUserProfile = null;
};

export const updateProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
    if (!supabase) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id);

    return !error;
};

// ============ تسجيل النشاط ============

export const logActivity = async (
    actionType: string,
    entityType?: string,
    entityId?: string,
    metadata?: any
): Promise<void> => {
    if (!supabase) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
        .from('activity_logs')
        .insert({
            user_id: user.id,
            action_type: actionType,
            entity_type: entityType,
            entity_id: entityId,
            metadata: metadata || {}
        });
};

// ============ إدارة الجلسات ============

let currentSessionId: string | null = null;

export const startSession = async (): Promise<void> => {
    if (!supabase) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // إنهاء أي جلسات سابقة مفتوحة
    await supabase
        .from('user_sessions')
        .update({
            is_active: false,
            ended_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_active', true);

    // بدء جلسة جديدة
    const { data } = await supabase
        .from('user_sessions')
        .insert({
            user_id: user.id,
            started_at: new Date().toISOString(),
            is_active: true
        })
        .select()
        .single();

    if (data) {
        currentSessionId = data.id;
    }
};

export const endSession = async (): Promise<void> => {
    if (!supabase || !currentSessionId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: session } = await supabase
        .from('user_sessions')
        .select('started_at')
        .eq('id', currentSessionId)
        .single();

    if (session) {
        const startTime = new Date(session.started_at).getTime();
        const endTime = Date.now();
        const durationMinutes = Math.round((endTime - startTime) / 60000);

        await supabase
            .from('user_sessions')
            .update({
                ended_at: new Date().toISOString(),
                duration_minutes: durationMinutes,
                is_active: false
            })
            .eq('id', currentSessionId);
    }

    currentSessionId = null;
};

// ============ دوال SuperAdmin ============

// Cache للتحقق من الصلاحيات (صالح لمدة 5 دقائق)
let cachedRole: { role: string; timestamp: number } | null = null;
const ROLE_CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

const checkSuperadminRole = async (): Promise<boolean> => {
    if (!supabase) return false;

    // استخدام الـ cache إذا كان صالحاً
    if (cachedRole && Date.now() - cachedRole.timestamp < ROLE_CACHE_DURATION) {
        return cachedRole.role === 'superadmin';
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile) {
        cachedRole = { role: profile.role, timestamp: Date.now() };
    }

    return profile?.role === 'superadmin';
};

// مسح الـ cache عند تسجيل الخروج
export const clearRoleCache = () => {
    cachedRole = null;
};

export const getAllEditors = async (): Promise<(UserProfile & { stats?: EditorStats })[]> => {
    if (!supabase) return [];

    const isSuperadmin = await checkSuperadminRole();
    if (!isSuperadmin) return [];

    try {
        const { data: editors, error } = await supabase
            .from('user_profiles')
            .select(`
                *,
                editor_stats (*)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching editors:', error);
            return [];
        }

        return editors?.map(e => ({
            ...e,
            stats: e.editor_stats?.[0] || null
        })) || [];
    } catch (error) {
        console.error('getAllEditors error:', error);
        return [];
    }
};

export const getEditorActivities = async (userId?: string, limit = 50): Promise<ActivityLog[]> => {
    if (!supabase) return [];

    const isSuperadmin = await checkSuperadminRole();
    if (!isSuperadmin) return [];

    try {
        let query = supabase
            .from('activity_logs')
            .select(`
                *,
                user:user_profiles (id, email, full_name, role)
            `)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching activities:', error);
            return [];
        }
        return data || [];
    } catch (error) {
        console.error('getEditorActivities error:', error);
        return [];
    }
};

export const getEditorSessions = async (userId: string): Promise<any[]> => {
    if (!supabase) return [];

    const isSuperadmin = await checkSuperadminRole();
    if (!isSuperadmin) return [];

    try {
        const { data, error } = await supabase
            .from('user_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('started_at', { ascending: false })
            .limit(30);

        if (error) {
            console.error('Error fetching sessions:', error);
            return [];
        }
        return data || [];
    } catch (error) {
        console.error('getEditorSessions error:', error);
        return [];
    }
};

export const updateEditorStats = async (userId: string): Promise<void> => {
    if (!supabase) return;

    await supabase.rpc('update_editor_stats', { p_user_id: userId });
};

export const toggleUserActive = async (userId: string, isActive: boolean): Promise<boolean> => {
    if (!supabase) return false;

    const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: isActive })
        .eq('id', userId);

    return !error;
};

export const changeUserRole = async (userId: string, role: 'editor' | 'superadmin'): Promise<boolean> => {
    if (!supabase) return false;

    const { error } = await supabase
        .from('user_profiles')
        .update({ role })
        .eq('id', userId);

    return !error;
};

// ============ Auth State Listener ============

export const onAuthStateChange = (callback: (user: UserProfile | null) => void) => {
    if (!supabase) {
        callback(null);
        return () => { };
    }

    let isSubscribed = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        // تجاهل إذا تم إلغاء الاشتراك
        if (!isSubscribed) return;

        if (session?.user) {
            try {
                const profile = await getCurrentUser();
                if (isSubscribed) {
                    callback(profile);
                }
            } catch (error) {
                // تجاهل أخطاء الإلغاء
                if (isSubscribed) {
                    console.error('Auth state error:', error);
                }
            }
        } else {
            if (isSubscribed) {
                callback(null);
            }
        }
    });

    return () => {
        isSubscribed = false;
        subscription.unsubscribe();
    };
};

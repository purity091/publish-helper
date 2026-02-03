
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

export const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
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

    // محاولة تحديث وقت آخر تسجيل دخول (تجاهل الأخطاء)
    if (data.user) {
        try {
            await supabase
                .from('user_profiles')
                .update({ last_login_at: new Date().toISOString() })
                .eq('id', data.user.id);
        } catch (e) {
            console.warn('Could not update last_login_at:', e);
        }

        // محاولة تسجيل النشاط (تجاهل الأخطاء)
        try {
            await logActivity('login');
        } catch (e) {
            console.warn('Could not log activity:', e);
        }

        // محاولة بدء جلسة جديدة (تجاهل الأخطاء)
        try {
            await startSession();
        } catch (e) {
            console.warn('Could not start session:', e);
        }
    }

    return { success: true };
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

    await supabase.auth.signOut();
};

export const getCurrentUser = async (): Promise<UserProfile | null> => {
    if (!supabase) return null;

    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return null;

        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        // إذا لم يوجد profile، أنشئ واحد افتراضي من بيانات auth
        if (error || !profile) {
            console.warn('No profile found, using auth data');
            return {
                id: user.id,
                email: user.email || '',
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'مستخدم',
                role: 'editor',
                avatar_url: null,
                is_active: true,
                last_login_at: new Date().toISOString(),
                created_at: user.created_at || new Date().toISOString()
            };
        }

        return profile;
    } catch (error) {
        console.error('getCurrentUser error:', error);
        return null;
    }
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

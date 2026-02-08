
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// التحقق من صحة URL
const isValidUrl = (url: string): boolean => {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
};

const hasValidCredentials = supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl);

if (!hasValidCredentials) {
    console.warn('Supabase credentials not found or invalid. Using localStorage fallback.');
}

// مفتاح تخزين حالة "تذكرني"
const REMEMBER_ME_KEY = 'auth_remember_me';

// التحقق من حالة "تذكرني"
export const getRememberMeStatus = (): boolean => {
    return localStorage.getItem(REMEMBER_ME_KEY) === 'true';
};

export const setRememberMeStatus = (remember: boolean): void => {
    if (remember) {
        localStorage.setItem(REMEMBER_ME_KEY, 'true');
    } else {
        localStorage.removeItem(REMEMBER_ME_KEY);
    }
};

// إعدادات محسنة للأداء مع جلسة طويلة المدة (90 يوم)
export const supabase: SupabaseClient | null = hasValidCredentials
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false, // تعطيل للسرعة
            storage: localStorage, // استخدام localStorage للحفاظ على الجلسة
            storageKey: 'prowriter-auth-token',
            flowType: 'pkce',
        },
        global: {
            headers: {
                'X-Client-Info': 'prowriter-app'
            }
        },
        db: {
            schema: 'public'
        }
    })
    : null;

// Types
export interface PublishedArticle {
    id?: string;
    title: string;
    url: string;
    created_at?: string;
}

export interface Category {
    id?: string;
    name: string;
    created_at?: string;
}

// ============ ARTICLES ============

export const fetchArticles = async (): Promise<PublishedArticle[]> => {
    if (!supabase) {
        const saved = localStorage.getItem('published_articles_structured');
        return saved ? JSON.parse(saved) : [];
    }

    const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching articles:', error);
        return [];
    }

    return data || [];
};

export const addArticle = async (article: Omit<PublishedArticle, 'id' | 'created_at'>): Promise<PublishedArticle | null> => {
    if (!supabase) {
        const id = `art_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const newArticle = { ...article, id };
        const articles = await fetchArticles();
        localStorage.setItem('published_articles_structured', JSON.stringify([newArticle, ...articles]));
        return newArticle;
    }

    const { data, error } = await supabase
        .from('articles')
        .insert([article])
        .select()
        .single();

    if (error) {
        console.error('Error adding article:', error);
        return null;
    }

    return data;
};

export const deleteArticle = async (id: string): Promise<boolean> => {
    if (!supabase) {
        const articles = await fetchArticles();
        localStorage.setItem('published_articles_structured', JSON.stringify(articles.filter(a => a.id !== id)));
        return true;
    }

    const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting article:', error);
        return false;
    }

    return true;
};

export const deleteAllArticles = async (): Promise<boolean> => {
    if (!supabase) {
        localStorage.setItem('published_articles_structured', JSON.stringify([]));
        return true;
    }

    const { error } = await supabase
        .from('articles')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) {
        console.error('Error deleting all articles:', error);
        return false;
    }

    return true;
};

export const importArticles = async (articles: Omit<PublishedArticle, 'id' | 'created_at'>[]): Promise<number> => {
    if (!supabase) {
        const existing = await fetchArticles();
        const newArticles = articles.map(a => ({
            ...a,
            id: `imp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
        }));
        localStorage.setItem('published_articles_structured', JSON.stringify([...newArticles, ...existing]));
        return newArticles.length;
    }

    const { data, error } = await supabase
        .from('articles')
        .insert(articles)
        .select();

    if (error) {
        console.error('Error importing articles:', error);
        return 0;
    }

    return data?.length || 0;
};

// ============ CATEGORIES ============

export const fetchCategories = async (): Promise<Category[]> => {
    if (!supabase) {
        const saved = localStorage.getItem('site_categories_list');
        return saved ? JSON.parse(saved) : [];
    }

    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching categories:', error);
        return [];
    }

    return data || [];
};

export const addCategory = async (category: Omit<Category, 'id' | 'created_at'>): Promise<Category | null> => {
    if (!supabase) {
        const id = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const newCategory = { ...category, id };
        const categories = await fetchCategories();
        localStorage.setItem('site_categories_list', JSON.stringify([...categories, newCategory].sort((a, b) => a.name.localeCompare(b.name))));
        return newCategory;
    }

    const { data, error } = await supabase
        .from('categories')
        .insert([category])
        .select()
        .single();

    if (error) {
        console.error('Error adding category:', error);
        return null;
    }

    return data;
};

export const deleteCategory = async (id: string): Promise<boolean> => {
    if (!supabase) {
        const categories = await fetchCategories();
        localStorage.setItem('site_categories_list', JSON.stringify(categories.filter(c => c.id !== id)));
        return true;
    }

    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting category:', error);
        return false;
    }

    return true;
};

export const deleteAllCategories = async (): Promise<boolean> => {
    if (!supabase) {
        localStorage.setItem('site_categories_list', JSON.stringify([]));
        return true;
    }

    const { error } = await supabase
        .from('categories')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) {
        console.error('Error deleting all categories:', error);
        return false;
    }

    return true;
};

export const importCategories = async (categories: Omit<Category, 'id' | 'created_at'>[]): Promise<number> => {
    if (!supabase) {
        const existing = await fetchCategories();
        const existingNames = new Set(existing.map(c => c.name));
        const newCats = categories
            .filter(c => !existingNames.has(c.name))
            .map(c => ({
                ...c,
                id: `imp_cat_${Date.now()}_${Math.random()}`
            }));
        localStorage.setItem('site_categories_list', JSON.stringify([...existing, ...newCats].sort((a, b) => a.name.localeCompare(b.name))));
        return newCats.length;
    }

    // Filter duplicates
    const existingCategories = await fetchCategories();
    const existingNames = new Set(existingCategories.map(c => c.name));
    const uniqueCategories = categories.filter(c => !existingNames.has(c.name));

    if (uniqueCategories.length === 0) return 0;

    const { data, error } = await supabase
        .from('categories')
        .insert(uniqueCategories)
        .select();

    if (error) {
        console.error('Error importing categories:', error);
        return 0;
    }

    return data?.length || 0;
};

// ============ GENERATED ARTICLES (حفظ المقالات المولدة) ============

export interface GeneratedArticle {
    id?: string;
    topic: string;
    sections: any[];
    publish_metadata?: any;
    full_content?: string;
    status: 'draft' | 'ready' | 'published';
    created_at?: string;
    updated_at?: string;
}

const GENERATED_ARTICLES_KEY = 'generated_articles_local';

export const fetchGeneratedArticles = async (): Promise<GeneratedArticle[]> => {
    if (!supabase) {
        const saved = localStorage.getItem(GENERATED_ARTICLES_KEY);
        return saved ? JSON.parse(saved) : [];
    }

    const { data, error } = await supabase
        .from('generated_articles')
        .select('*')
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching generated articles:', error);
        return [];
    }

    return data || [];
};

export const getGeneratedArticleByTopic = async (topic: string): Promise<GeneratedArticle | null> => {
    if (!supabase) {
        const articles = await fetchGeneratedArticles();
        return articles.find(a => a.topic.toLowerCase() === topic.toLowerCase()) || null;
    }

    const { data, error } = await supabase
        .from('generated_articles')
        .select('*')
        .ilike('topic', topic)
        .single();

    if (error) {
        if (error.code !== 'PGRST116') { // Not found error
            console.error('Error fetching article by topic:', error);
        }
        return null;
    }

    return data;
};

export const saveGeneratedArticle = async (article: Omit<GeneratedArticle, 'id' | 'created_at' | 'updated_at'>): Promise<GeneratedArticle | null> => {
    if (!supabase) {
        const id = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const newArticle = {
            ...article,
            id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        const articles = await fetchGeneratedArticles();
        // إزالة المقال القديم بنفس الموضوع إن وجد
        const filtered = articles.filter(a => a.topic.toLowerCase() !== article.topic.toLowerCase());
        localStorage.setItem(GENERATED_ARTICLES_KEY, JSON.stringify([newArticle, ...filtered]));
        return newArticle;
    }

    // تحقق إذا كان المقال موجود مسبقاً
    const existing = await getGeneratedArticleByTopic(article.topic);

    if (existing) {
        // تحديث المقال الموجود
        const { data, error } = await supabase
            .from('generated_articles')
            .update({
                sections: article.sections,
                publish_metadata: article.publish_metadata,
                full_content: article.full_content,
                status: article.status
            })
            .eq('id', existing.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating generated article:', error);
            return null;
        }
        return data;
    }

    // إنشاء مقال جديد
    const { data, error } = await supabase
        .from('generated_articles')
        .insert([article])
        .select()
        .single();

    if (error) {
        console.error('Error saving generated article:', error);
        return null;
    }

    return data;
};

export const updateGeneratedArticle = async (id: string, updates: Partial<GeneratedArticle>): Promise<boolean> => {
    if (!supabase) {
        const articles = await fetchGeneratedArticles();
        const index = articles.findIndex(a => a.id === id);
        if (index === -1) return false;
        articles[index] = { ...articles[index], ...updates, updated_at: new Date().toISOString() };
        localStorage.setItem(GENERATED_ARTICLES_KEY, JSON.stringify(articles));
        return true;
    }

    const { error } = await supabase
        .from('generated_articles')
        .update(updates)
        .eq('id', id);

    if (error) {
        console.error('Error updating generated article:', error);
        return false;
    }

    return true;
};

export const deleteGeneratedArticle = async (id: string): Promise<boolean> => {
    if (!supabase) {
        const articles = await fetchGeneratedArticles();
        localStorage.setItem(GENERATED_ARTICLES_KEY, JSON.stringify(articles.filter(a => a.id !== id)));
        return true;
    }

    const { error } = await supabase
        .from('generated_articles')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting generated article:', error);
        return false;
    }

    return true;
};

// Alias للاستخدام في لوحة التحكم
export const getAllGeneratedArticles = fetchGeneratedArticles;

// ============ EXPANSION METHODS (أساليب التحرير) ============

export interface ExpansionMethodDB {
    id?: string;
    name: string;
    category: 'Analysis' | 'Narrative' | 'Strategic' | 'Data' | 'Context';
    description?: string;
    instruction: string;
    is_active?: boolean;
    usage_count?: number;
    created_at?: string;
}

const EXPANSION_METHODS_KEY = 'expansion_methods_local';

export const fetchExpansionMethods = async (): Promise<ExpansionMethodDB[]> => {
    if (!supabase) {
        const saved = localStorage.getItem(EXPANSION_METHODS_KEY);
        return saved ? JSON.parse(saved) : [];
    }

    const { data, error } = await supabase
        .from('expansion_methods')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

    if (error) {
        console.error('Error fetching expansion methods:', error);
        return [];
    }

    return data || [];
};

export const addExpansionMethod = async (method: Omit<ExpansionMethodDB, 'id' | 'created_at' | 'usage_count'>): Promise<ExpansionMethodDB | null> => {
    if (!supabase) {
        const id = `method_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const newMethod = { ...method, id, usage_count: 0, is_active: true };
        const methods = await fetchExpansionMethods();
        localStorage.setItem(EXPANSION_METHODS_KEY, JSON.stringify([newMethod, ...methods]));
        return newMethod;
    }

    const { data, error } = await supabase
        .from('expansion_methods')
        .insert([method])
        .select()
        .single();

    if (error) {
        console.error('Error adding expansion method:', error);
        return null;
    }

    return data;
};

export const incrementMethodUsage = async (id: string): Promise<void> => {
    if (!supabase) {
        const methods = await fetchExpansionMethods();
        const index = methods.findIndex(m => m.id === id);
        if (index !== -1) {
            methods[index].usage_count = (methods[index].usage_count || 0) + 1;
            localStorage.setItem(EXPANSION_METHODS_KEY, JSON.stringify(methods));
        }
        return;
    }

    // Simple increment - fetch current value and increment
    const { data } = await supabase
        .from('expansion_methods')
        .select('usage_count')
        .eq('id', id)
        .single();

    if (data) {
        await supabase
            .from('expansion_methods')
            .update({ usage_count: (data.usage_count || 0) + 1 })
            .eq('id', id);
    }
};

export const deleteExpansionMethod = async (id: string): Promise<boolean> => {
    if (!supabase) {
        const methods = await fetchExpansionMethods();
        localStorage.setItem(EXPANSION_METHODS_KEY, JSON.stringify(methods.filter(m => m.id !== id)));
        return true;
    }

    const { error } = await supabase
        .from('expansion_methods')
        .update({ is_active: false })
        .eq('id', id);

    if (error) {
        console.error('Error deleting expansion method:', error);
        return false;
    }

    return true;
};

// ============ APP SETTINGS (إعدادات التطبيق) ============

const APP_SETTINGS_KEY = 'app_settings_local';

export const getSetting = async <T>(key: string, defaultValue: T): Promise<T> => {
    if (!supabase) {
        const saved = localStorage.getItem(`${APP_SETTINGS_KEY}_${key}`);
        return saved ? JSON.parse(saved) : defaultValue;
    }

    const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', key)
        .single();

    if (error || !data) {
        return defaultValue;
    }

    return data.setting_value as T;
};

export const saveSetting = async <T>(key: string, value: T): Promise<boolean> => {
    if (!supabase) {
        localStorage.setItem(`${APP_SETTINGS_KEY}_${key}`, JSON.stringify(value));
        return true;
    }

    const { error } = await supabase
        .from('app_settings')
        .upsert({
            setting_key: key,
            setting_value: value
        }, {
            onConflict: 'setting_key'
        });

    if (error) {
        console.error('Error saving setting:', error);
        return false;
    }

    return true;
};

// ============ AI CONFIG (إعدادات الذكاء الاصطناعي) ============

export interface AIConfigDB {
    titlesCount: number;
    keywordsCount: number;
    linkingCount: number;
    categoriesCount: number;
    sourcesCount: number;
    systemInstruction: string;
    titlesInstruction: string;
    teaserPrompts: string[];
}

const DEFAULT_AI_CONFIG: AIConfigDB = {
    titlesCount: 10,
    keywordsCount: 10,
    linkingCount: 3,
    categoriesCount: 5,
    sourcesCount: 5,
    systemInstruction: "أنت مساعد تحرير خبير متخصص في تحسين محركات البحث (SEO) وصناعة المحتوى الجذاب.",
    titlesInstruction: "يجب أن تكون العناوين متنوعة بين الخبرية والتحليلية والمثيرة للفضول.",
    teaserPrompts: [
        "سؤال مثير للفضول يدفع القارئ للدخول",
        "أهم معلومة في الخبر بأسلوب عاجل ومختصر",
        "موجه لفئة محددة (مثل: للمعلمين، للموظفين..)",
        "أسلوب تحذيري أو تنبيهي (انتبه، احذر..)",
        "ملخص غامض للقصة دون كشف النهاية"
    ]
};

export const getAIConfig = async (): Promise<AIConfigDB> => {
    return getSetting('ai_config', DEFAULT_AI_CONFIG);
};

export const saveAIConfig = async (config: AIConfigDB): Promise<boolean> => {
    return saveSetting('ai_config', config);
};

// Export for checking if Supabase is available
export const isSupabaseAvailable = () => !!supabase;


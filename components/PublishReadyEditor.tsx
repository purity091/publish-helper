
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ArticleSection, PublishMetadata, AIConfig, LinkingSuggestion } from '../types';
import { generatePublishMetadata } from '../services/publishMetadataService';
import * as db from '../services/supabaseService';
import ResultCard from './ResultCard';

interface PublishReadyEditorProps {
    topic: string;
    sections: ArticleSection[];
    onBack: () => void;
}

const DEFAULT_AI_CONFIG: AIConfig = {
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

const initialEmptyResult: PublishMetadata = {
    slug: '',
    suggestedCategories: [],
    titles: [],
    keywords: [],
    teasers: [],
    linkingSuggestions: [],
    sources: [],
};

const CONFIG_KEY = 'ai_config_settings_v2';

type ViewMode = 'editor' | 'articles' | 'categories' | 'settings';

// Cache للبيانات المحملة - يتم تحميلها مرة واحدة فقط
let cachedArticles: db.PublishedArticle[] | null = null;
let cachedCategories: db.Category[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 دقيقة

export const PublishReadyEditor: React.FC<PublishReadyEditorProps> = ({ topic, sections, onBack }) => {
    const [view, setView] = useState<ViewMode>('editor');
    const [isLoading, setIsLoading] = useState(false); // لا نبدأ بـ true
    const [isSyncing, setIsSyncing] = useState(false);

    // حالة المقالات والتصنيفات - تبدأ من الـ cache إن وجد
    const [articles, setArticles] = useState<db.PublishedArticle[]>(cachedArticles || []);
    const [categories, setCategories] = useState<db.Category[]>(cachedCategories || []);

    const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
        try {
            const saved = localStorage.getItem(CONFIG_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (!parsed.teaserPrompts || !Array.isArray(parsed.teaserPrompts)) {
                    return DEFAULT_AI_CONFIG;
                }
                return parsed;
            }
            return DEFAULT_AI_CONFIG;
        } catch (e) { return DEFAULT_AI_CONFIG; }
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editableResult, setEditableResult] = useState<PublishMetadata>(initialEmptyResult);
    const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);

    const [newArticle, setNewArticle] = useState({ title: '', url: '' });
    const [newCategory, setNewCategory] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [categorySearchQuery, setCategorySearchQuery] = useState('');
    const [globalCopyStatus, setGlobalCopyStatus] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const categoryFileInputRef = useRef<HTMLInputElement>(null);

    // Flag لتتبع إذا تم تغيير الإعدادات يدوياً
    const configChangedRef = useRef(false);
    const initialLoadDoneRef = useRef(false);

    // تحميل البيانات من Supabase في الخلفية
    const loadData = useCallback(async (forceRefresh = false) => {
        const now = Date.now();
        const cacheValid = cachedArticles !== null && cachedCategories !== null && (now - cacheTimestamp) < CACHE_DURATION;

        // إذا كان الـ cache صالح ولا نريد تحديث إجباري
        if (cacheValid && !forceRefresh) {
            setArticles(cachedArticles!);
            setCategories(cachedCategories!);
            return;
        }

        // تحميل في الخلفية بدون إظهار شاشة التحميل
        try {
            const [articlesData, categoriesData, aiConfigData] = await Promise.all([
                db.fetchArticles(),
                db.fetchCategories(),
                db.getAIConfig()
            ]);

            // تحديث الـ cache
            cachedArticles = articlesData;
            cachedCategories = categoriesData;
            cacheTimestamp = Date.now();

            setArticles(articlesData);
            setCategories(categoriesData);

            // تحديث الإعدادات فقط في التحميل الأول
            if (!initialLoadDoneRef.current && aiConfigData && aiConfigData.teaserPrompts) {
                setAiConfig(aiConfigData);
            }
            initialLoadDoneRef.current = true;
        } catch (e) {
            console.error('Error loading data:', e);
        }
    }, []);

    // تحميل البيانات عند فتح المكون (في الخلفية)
    useEffect(() => {
        loadData();
    }, [loadData]);

    // دمج محتوى المقال
    const fullArticleContent = useMemo(() => {
        return sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n');
    }, [sections]);

    // حفظ إعدادات AI فقط عند التغيير اليدوي (ليس عند التحميل)
    useEffect(() => {
        // تجاهل التحديث الأول من قاعدة البيانات
        if (!configChangedRef.current) {
            return;
        }

        // حفظ في localStorage فوراً
        localStorage.setItem(CONFIG_KEY, JSON.stringify(aiConfig));

        // حفظ في قاعدة البيانات بتأخير (debounce)
        const timer = setTimeout(async () => {
            await db.saveAIConfig(aiConfig);
        }, 1000);

        return () => clearTimeout(timer);
    }, [aiConfig]);

    // --- Helpers ---
    const filteredArticles = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return articles;
        return articles.filter(art => art.title.toLowerCase().includes(query) || art.url.toLowerCase().includes(query));
    }, [articles, searchQuery]);

    const filteredCategories = useMemo(() => {
        const query = categorySearchQuery.toLowerCase().trim();
        if (!query) return categories;
        return categories.filter(c => c.name.toLowerCase().includes(query));
    }, [categories, categorySearchQuery]);

    // --- Article Functions ---
    const addArticleToDb = async () => {
        if (!newArticle.title.trim() || !newArticle.url.trim()) return;
        setIsSyncing(true);
        try {
            const result = await db.addArticle({
                title: newArticle.title.trim(),
                url: newArticle.url.trim()
            });
            if (result) {
                setArticles(prev => [result, ...prev]);
                setNewArticle({ title: '', url: '' });
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDeleteAll = async () => {
        if (articles.length === 0) return;
        if (window.confirm('⚠️ تحذير: هل أنت متأكد من حذف "جميع" المقالات نهائياً؟')) {
            setIsSyncing(true);
            try {
                await db.deleteAllArticles();
                setArticles([]);
                setSearchQuery('');
                alert('✅ تم إفراغ قاعدة البيانات.');
            } finally {
                setIsSyncing(false);
            }
        }
    };

    const removeArticleFromDb = async (id: string) => {
        if (window.confirm('هل تريد حذف هذا المقال؟')) {
            setIsSyncing(true);
            try {
                await db.deleteArticle(id);
                setArticles(prev => prev.filter(a => a.id !== id));
            } finally {
                setIsSyncing(false);
            }
        }
    };

    const handleCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const lines = text.split(/\r?\n/);
            const newBatch: { title: string; url: string }[] = [];
            lines.forEach((line) => {
                if (!line.trim()) return;
                const parts = line.split(',');
                if (parts.length >= 2) {
                    const title = parts[0].trim().replace(/^"|"$/g, '');
                    const url = parts[1].trim().replace(/^"|"$/g, '');
                    if (title && url) newBatch.push({ title, url });
                }
            });
            if (newBatch.length > 0) {
                setIsSyncing(true);
                try {
                    const count = await db.importArticles(newBatch);
                    await loadData();
                    alert(`🎉 تم استيراد ${count} مقال.`);
                } finally {
                    setIsSyncing(false);
                }
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // --- Category Functions ---
    const addCategoryHandler = async () => {
        if (!newCategory.trim()) return;
        if (categories.some(c => c.name === newCategory.trim())) {
            alert('هذا التصنيف موجود بالفعل.');
            return;
        }
        setIsSyncing(true);
        try {
            const result = await db.addCategory({ name: newCategory.trim() });
            if (result) {
                setCategories(prev => [...prev, result].sort((a, b) => a.name.localeCompare(b.name)));
                setNewCategory('');
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const deleteCategoryHandler = async (id: string) => {
        if (window.confirm('حذف هذا التصنيف؟')) {
            setIsSyncing(true);
            try {
                await db.deleteCategory(id);
                setCategories(prev => prev.filter(c => c.id !== id));
            } finally {
                setIsSyncing(false);
            }
        }
    };

    const handleDeleteAllCategories = async () => {
        if (categories.length === 0) return;
        if (window.confirm('⚠️ تحذير: هل أنت متأكد من حذف "جميع" التصنيفات؟')) {
            setIsSyncing(true);
            try {
                await db.deleteAllCategories();
                setCategories([]);
                setCategorySearchQuery('');
            } finally {
                setIsSyncing(false);
            }
        }
    };

    const handleCategoryImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const lines = text.split(/\r?\n/);
            const newCats: { name: string }[] = [];

            lines.forEach(line => {
                const name = line.trim().replace(/^"|"$/g, '');
                if (name) newCats.push({ name });
            });

            if (newCats.length > 0) {
                setIsSyncing(true);
                try {
                    const count = await db.importCategories(newCats);
                    await loadData();
                    alert(`🎉 تم استيراد ${count} تصنيف.`);
                } finally {
                    setIsSyncing(false);
                }
            }
        };
        reader.readAsText(file);
        if (categoryFileInputRef.current) categoryFileInputRef.current.value = '';
    };

    // --- Generation & UI Functions ---
    const handleGenerate = async () => {
        if (!fullArticleContent.trim()) return;
        setIsGenerating(true);
        setError(null);
        try {
            const metadata = await generatePublishMetadata(fullArticleContent, topic, articles, categories, aiConfig);
            setEditableResult(metadata);
            setHasGeneratedOnce(true);
        } catch (err: any) {
            console.error(err);
            setError(`حدث خطأ أثناء التوليد: ${err.message || 'يرجى التحقق من الاتصال.'}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const updateListItem = (field: keyof PublishMetadata, index: number, value: string) => {
        const newList = [...(editableResult[field] as any[])];
        newList[index] = value;
        setEditableResult({ ...editableResult, [field]: newList });
    };

    const updateLinkingItem = (index: number, key: keyof LinkingSuggestion, value: string) => {
        const newList = [...editableResult.linkingSuggestions];
        newList[index] = { ...newList[index], [key]: value };
        setEditableResult({ ...editableResult, linkingSuggestions: newList });
    };

    const handleTeaserPromptChange = (index: number, value: string) => {
        configChangedRef.current = true;
        const newPrompts = [...aiConfig.teaserPrompts];
        newPrompts[index] = value;
        setAiConfig(prev => ({ ...prev, teaserPrompts: newPrompts }));
    };

    // دالة مساعدة لتحديث الإعدادات مع تفعيل flag التغيير
    const updateAiConfig = (updates: Partial<AIConfig>) => {
        configChangedRef.current = true;
        setAiConfig(prev => ({ ...prev, ...updates }));
    };

    const copyToClipboard = (text: string) => {
        if (!text.trim()) return;
        navigator.clipboard.writeText(text);
    };

    const copyAllResults = () => {
        if (!hasGeneratedOnce) return;
        const text = `
التصنيفات المقترحة:
${editableResult.suggestedCategories.join(', ')}

رابط المقال المختصر (Slug):
${editableResult.slug}

العناوين المقترحة:
${editableResult.titles.filter(t => t).map((t, i) => `${i + 1}. ${t}`).join('\n')}

الكلمات المفتاحية:
${editableResult.keywords.join(', ')}

التشويقيات:
${editableResult.teasers.filter(t => t).map((t, i) => `${i + 1}. ${t}`).join('\n')}

الربط الداخلي:
${editableResult.linkingSuggestions.filter(s => s.title).map((s, i) => `${i + 1}. ${s.title}: ${s.url}`).join('\n')}

المصادر (APA 8):
${editableResult.sources.filter(s => s).map((s, i) => `${i + 1}. ${s}`).join('\n')}
    `.trim();
        copyToClipboard(text);
        setGlobalCopyStatus(true);
        setTimeout(() => setGlobalCopyStatus(false), 2000);
    };

    // --- Render ---
    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
                <div className="text-center">
                    <svg className="animate-spin h-12 w-12 text-emerald-600 mx-auto mb-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-slate-500 font-medium">جاري تحميل البيانات...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-['Alexandria'] flex" dir="rtl">
            {/* Syncing Indicator */}
            {isSyncing && (
                <div className="fixed top-4 left-4 z-[100] bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm font-medium">جاري المزامنة...</span>
                </div>
            )}

            {/* Database Status Badge */}
            <div className="fixed bottom-4 left-4 z-[100]">
                <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${db.isSupabaseAvailable() ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    <span className={`w-2 h-2 rounded-full ${db.isSupabaseAvailable() ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                    {db.isSupabaseAvailable() ? 'Supabase متصل' : 'وضع محلي'}
                </div>
            </div>

            {/* Sidebar */}
            <aside className="w-64 bg-white border-l border-slate-200 h-screen sticky top-0 flex flex-col shadow-sm z-50">
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-100">P</div>
                        <h1 className="text-lg font-bold text-slate-800 leading-tight">تجهيز <span className="text-emerald-600">النشر</span></h1>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <button onClick={() => setView('editor')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'editor' ? 'bg-emerald-50 text-emerald-600 shadow-sm font-bold' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        توليد البيانات
                    </button>

                    <button onClick={() => setView('articles')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'articles' ? 'bg-emerald-50 text-emerald-600 shadow-sm font-bold' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        قاعدة المقالات
                    </button>

                    <button onClick={() => setView('categories')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'categories' ? 'bg-emerald-50 text-emerald-600 shadow-sm font-bold' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                        إدارة التصنيفات
                    </button>

                    <button onClick={() => setView('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'settings' ? 'bg-emerald-50 text-emerald-600 shadow-sm font-bold' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        الإعدادات
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <div className="flex gap-2">
                        <div className="bg-emerald-600 rounded-xl p-3 flex-1 text-white shadow-lg text-center">
                            <p className="text-[9px] opacity-80 uppercase tracking-wider mb-1">المقالات</p>
                            <p className="text-xl font-bold">{articles.length}</p>
                        </div>
                        <div className="bg-indigo-500 rounded-xl p-3 flex-1 text-white shadow-lg text-center">
                            <p className="text-[9px] opacity-80 uppercase tracking-wider mb-1">التصنيفات</p>
                            <p className="text-xl font-bold">{categories.length}</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100">
                    <button
                        onClick={onBack}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all font-medium"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        العودة للمعاينة
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto custom-scrollbar">
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-8 justify-between sticky top-0 z-40">
                    <h2 className="font-bold text-slate-800 text-lg">
                        {view === 'editor' && 'توليد بيانات النشر الوصفية'}
                        {view === 'articles' && 'إدارة المقالات المؤرشفة'}
                        {view === 'categories' && 'إدارة تصنيفات الموقع'}
                        {view === 'settings' && 'تخصيص التعليمات والأعداد'}
                    </h2>
                    <div className="text-slate-400 text-xs">المقال: {topic}</div>
                </header>

                <main className="p-8 pb-20">
                    {view === 'editor' ? (
                        <div className="space-y-6 animate-in">
                            {/* Generate Button */}
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <span className="w-2 h-6 bg-emerald-600 rounded-full"></span>
                                    توليد البيانات الوصفية للنشر
                                </h3>
                                <p className="text-slate-500 text-sm mb-6">
                                    سيتم تحليل محتوى المقال "{topic}" وتوليد العناوين، الكلمات المفتاحية، التشويقيات، وباقي البيانات الوصفية.
                                </p>
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-emerald-200 flex items-center justify-center gap-2"
                                >
                                    {isGenerating ? (
                                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    ) : (
                                        <>بدء التوليد الذكي <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></>
                                    )}
                                </button>
                                {error && <div className="mt-4 text-red-600 bg-red-50 p-4 rounded-xl text-sm border border-red-100">{error}</div>}
                            </div>

                            {/* Copy All Button */}
                            <div className={`p-5 rounded-3xl shadow-lg flex items-center justify-between transition-all duration-500 sticky top-20 z-30 ${hasGeneratedOnce ? 'bg-emerald-600 translate-y-0 opacity-100' : 'bg-slate-200 translate-y-4 opacity-50 pointer-events-none'}`}>
                                <div className="text-white">
                                    <h4 className="font-bold text-lg">النسخة النهائية</h4>
                                    <p className="text-[11px] opacity-80">نسخ كافة الحقول بضغطة واحدة</p>
                                </div>
                                <button disabled={!hasGeneratedOnce} onClick={copyAllResults} className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-3 shadow-2xl ${globalCopyStatus ? 'bg-green-500 text-white' : 'bg-white text-emerald-600 hover:scale-105 active:scale-95'}`}>
                                    {globalCopyStatus ? 'تم النسخ!' : 'نسخ الكل'}
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                </button>
                            </div>

                            {/* Results */}
                            <div className="space-y-6">
                                {editableResult.suggestedCategories.length > 0 && (
                                    <ResultCard title={`التصنيفات المقترحة (${editableResult.suggestedCategories.length})`} icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>} onCopy={() => copyToClipboard(editableResult.suggestedCategories.join('\n'))}>
                                        <div className="space-y-2">
                                            {editableResult.suggestedCategories.map((c, i) => (
                                                <div key={i} className="flex gap-2">
                                                    <span className="text-[10px] bg-emerald-50 text-emerald-500 px-2 py-3 rounded-lg font-bold">{i + 1}</span>
                                                    <input value={c} onChange={(e) => updateListItem('suggestedCategories', i, e.target.value)} className="flex-1 bg-white border border-slate-100 p-2 rounded-xl text-sm text-slate-700 outline-none focus:border-emerald-300" />
                                                </div>
                                            ))}
                                        </div>
                                    </ResultCard>
                                )}

                                <ResultCard title="الرابط المختصر (Slug)" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>} onCopy={() => copyToClipboard(editableResult.slug)}>
                                    <input value={editableResult.slug} onChange={(e) => setEditableResult({ ...editableResult, slug: e.target.value })} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-mono text-emerald-600 text-sm focus:bg-white outline-none" />
                                </ResultCard>

                                {editableResult.titles.length > 0 && (
                                    <ResultCard title={`عناوين مقترحة (${editableResult.titles.length})`} icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 6h16M4 12h16" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>} onCopy={() => copyToClipboard(editableResult.titles.join('\n'))}>
                                        <div className="space-y-2">
                                            {editableResult.titles.map((t, i) => (
                                                <div key={i} className="flex gap-2">
                                                    <span className="text-[10px] bg-slate-100 px-2 py-3 rounded-lg text-slate-400 font-bold">{i + 1}</span>
                                                    <input value={t} onChange={(e) => updateListItem('titles', i, e.target.value)} className="flex-1 bg-white border border-slate-100 p-2 rounded-xl text-sm text-slate-700 outline-none focus:border-emerald-300" />
                                                </div>
                                            ))}
                                        </div>
                                    </ResultCard>
                                )}

                                {editableResult.keywords.length > 0 && (
                                    <ResultCard title="الكلمات المفتاحية" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>} onCopy={() => copyToClipboard(editableResult.keywords.join(', '))}>
                                        <textarea value={editableResult.keywords.join(', ')} onChange={(e) => setEditableResult({ ...editableResult, keywords: e.target.value.split(',').map(s => s.trim()) })} className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 outline-none focus:bg-white resize-none" />
                                    </ResultCard>
                                )}

                                {editableResult.teasers.length > 0 && (
                                    <ResultCard title={`التشويقيات (${editableResult.teasers.length})`} icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>} onCopy={() => copyToClipboard(editableResult.teasers.join('\n'))}>
                                        <div className="space-y-4">
                                            {editableResult.teasers.map((s, i) => (
                                                <div key={i} className="flex flex-col gap-1">
                                                    {aiConfig.teaserPrompts[i] && (
                                                        <div className="text-[10px] text-emerald-400 font-bold px-1 truncate">
                                                            {i + 1}. نوع: {aiConfig.teaserPrompts[i]}
                                                        </div>
                                                    )}
                                                    <textarea value={s} onChange={(e) => updateListItem('teasers', i, e.target.value)} className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm text-slate-600 h-20 resize-none outline-none focus:bg-white focus:border-emerald-200" />
                                                </div>
                                            ))}
                                        </div>
                                    </ResultCard>
                                )}

                                {editableResult.linkingSuggestions.length > 0 && (
                                    <ResultCard title="مقترحات الربط الداخلي" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>} onCopy={() => copyToClipboard(editableResult.linkingSuggestions.map(s => `${s.title}: ${s.url}`).join('\n'))}>
                                        <div className="space-y-4">
                                            {editableResult.linkingSuggestions.map((s, i) => (
                                                <div key={i} className="bg-emerald-50/20 border border-emerald-100 p-4 rounded-2xl space-y-2">
                                                    <div className="flex gap-2 items-center">
                                                        <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-1 rounded-md font-bold">عنوان</span>
                                                        <input value={s.title} onChange={(e) => updateLinkingItem(i, 'title', e.target.value)} className="flex-1 bg-white border border-slate-100 p-2 rounded-xl text-sm text-slate-700 outline-none" />
                                                    </div>
                                                    <div className="flex gap-2 items-center">
                                                        <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-1 rounded-md font-bold">رابط</span>
                                                        <input value={s.url} onChange={(e) => updateLinkingItem(i, 'url', e.target.value)} className="flex-1 bg-white border border-slate-100 p-2 rounded-xl text-xs font-mono text-emerald-500 outline-none" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ResultCard>
                                )}

                                {editableResult.sources.length > 0 && (
                                    <ResultCard title="المصادر (APA 8)" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>} onCopy={() => copyToClipboard(editableResult.sources.join('\n'))}>
                                        <div className="space-y-3">
                                            {editableResult.sources.map((s, i) => (
                                                <div key={i} className="flex gap-2">
                                                    <span className="text-[10px] bg-slate-100 px-2 py-3 rounded-lg text-slate-400 font-bold">{i + 1}</span>
                                                    <textarea value={s} onChange={(e) => updateListItem('sources', i, e.target.value)} className="flex-1 bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm text-slate-700 h-20 resize-none outline-none focus:bg-white focus:border-emerald-300" />
                                                </div>
                                            ))}
                                        </div>
                                    </ResultCard>
                                )}
                            </div>
                        </div>
                    ) : view === 'categories' ? (
                        /* CATEGORIES VIEW */
                        <div className="space-y-8 animate-in">
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-800">إدارة تصنيفات الموقع</h3>
                                        <p className="text-slate-500 text-sm mt-1">قم برفع كافة التصنيفات (أقسام الموقع) هنا ليتمكن الذكاء الاصطناعي من الاختيار منها.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => categoryFileInputRef.current?.click()} className="bg-emerald-50 text-emerald-700 px-6 py-2 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                            استيراد (CSV)
                                            <input type="file" ref={categoryFileInputRef} hidden accept=".csv" onChange={handleCategoryImport} />
                                        </button>
                                        <button onClick={handleDeleteAllCategories} className="bg-red-50 text-red-700 px-6 py-2 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            حذف الكل
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-4 mb-8">
                                    <input
                                        className="flex-1 bg-white border border-slate-200 p-3 rounded-xl text-sm"
                                        placeholder="اسم التصنيف الجديد (مثلاً: أخبار محلية، رياضة، اقتصاد)..."
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                    />
                                    <button onClick={addCategoryHandler} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-95">إضافة تصنيف</button>
                                </div>

                                <div className="mb-6 relative">
                                    <input
                                        type="text"
                                        placeholder="بحث في التصنيفات..."
                                        className="w-full pr-10 pl-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
                                        value={categorySearchQuery}
                                        onChange={(e) => setCategorySearchQuery(e.target.value)}
                                    />
                                    <svg className="w-5 h-5 text-slate-400 absolute right-3 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {filteredCategories.length > 0 ? filteredCategories.map(cat => (
                                        <div key={cat.id} className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between group hover:border-emerald-200 hover:shadow-sm transition-all">
                                            <span className="text-slate-700 font-medium text-sm">{cat.name}</span>
                                            <button onClick={() => deleteCategoryHandler(cat.id!)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    )) : (
                                        <div className="col-span-full py-12 text-center text-slate-400 italic">لا توجد تصنيفات، أضف بعضها أو قم باستيرادها.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : view === 'articles' ? (
                        /* ARTICLES VIEW */
                        <div className="space-y-8 animate-in">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                                    <p className="text-slate-500 text-xs mb-1">إجمالي المقالات</p>
                                    <p className="text-3xl font-black text-emerald-600">{articles.length}</p>
                                </div>
                                <button onClick={() => {
                                    if (articles.length === 0) return;
                                    const headers = ['Title', 'URL'];
                                    const rows = articles.map(art => `"${art.title.replace(/"/g, '""')}","${art.url}"`);
                                    const csvContent = [headers.join(','), ...rows].join('\n');
                                    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
                                    const link = document.createElement('a');
                                    link.href = URL.createObjectURL(blob);
                                    link.download = `backup_articles_${new Date().toISOString().split('T')[0]}.csv`;
                                    link.click();
                                }} disabled={articles.length === 0} className="bg-green-50 text-green-700 p-6 rounded-3xl border border-green-100 shadow-sm hover:bg-green-100 disabled:opacity-50 flex flex-col items-center justify-center gap-2 group transition-all">
                                    <svg className="w-6 h-6 group-hover:-translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    <span className="text-sm font-bold">تصدير CSV</span>
                                </button>
                                <button onClick={() => fileInputRef.current?.click()} className="bg-blue-50 text-blue-700 p-6 rounded-3xl border border-blue-100 shadow-sm hover:bg-blue-100 flex flex-col items-center justify-center gap-2 group transition-all">
                                    <svg className="w-6 h-6 group-hover:-translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    <span className="text-sm font-bold">استيراد CSV</span>
                                    <input type="file" ref={fileInputRef} hidden accept=".csv" onChange={handleCsvImport} />
                                </button>
                                <button onClick={handleDeleteAll} disabled={articles.length === 0} className="bg-red-50 text-red-700 p-6 rounded-3xl border border-red-100 shadow-sm hover:bg-red-600 hover:text-white disabled:opacity-50 flex flex-col items-center justify-center gap-2 group transition-all">
                                    <svg className="w-6 h-6 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    <span className="text-sm font-bold">حذف الكل</span>
                                </button>
                            </div>

                            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <h3 className="text-xl font-bold text-slate-800">إدارة المستودع</h3>
                                    <div className="relative w-full md:w-80">
                                        <input type="text" placeholder="بحث عن مقال..." className="w-full pr-10 pl-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-100 outline-none text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                        <svg className="w-5 h-5 text-slate-400 absolute right-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    </div>
                                </div>

                                <div className="p-8">
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-4 mb-8">
                                        <input className="flex-1 bg-white border border-slate-200 p-3 rounded-xl text-sm" placeholder="عنوان المقال الجديد..." value={newArticle.title} onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })} />
                                        <input className="flex-1 bg-white border border-slate-200 p-3 rounded-xl text-sm font-mono" placeholder="الرابط الكامل (URL)..." value={newArticle.url} onChange={(e) => setNewArticle({ ...newArticle, url: e.target.value })} />
                                        <button onClick={addArticleToDb} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-95">إضافة</button>
                                    </div>

                                    <div className="rounded-2xl border border-slate-100 overflow-hidden">
                                        <table className="w-full text-right border-collapse">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">المقال</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">الرابط</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-center w-20">إجراء</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {filteredArticles.length > 0 ? filteredArticles.map(art => (
                                                    <tr key={art.id} className="hover:bg-emerald-50/10 transition-colors group">
                                                        <td className="px-6 py-4 text-sm font-medium text-slate-700">{art.title}</td>
                                                        <td className="px-6 py-4 text-xs font-mono text-emerald-500">{art.url}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <button onClick={() => removeArticleFromDb(art.id!)} className="text-slate-300 hover:text-red-500 p-2 transition-all opacity-0 group-hover:opacity-100">
                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 text-sm italic">لا توجد مقالات لعرضها.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* SETTINGS VIEW */
                        <div className="max-w-4xl mx-auto space-y-8 animate-in">
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
                                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                                    <span className="w-2 h-6 bg-emerald-600 rounded-full"></span>
                                    التعليمات العامة (System Instruction)
                                </h3>
                                <textarea className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white transition-all outline-none text-sm text-slate-600" value={aiConfig.systemInstruction} onChange={(e) => updateAiConfig({ systemInstruction: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-6">
                                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-4">أعداد المخرجات</h3>
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm text-slate-600">عدد العناوين:</label>
                                        <input type="number" min="1" max="50" className="w-20 p-2 bg-slate-50 border border-slate-200 rounded-xl text-center" value={aiConfig.titlesCount} onChange={(e) => updateAiConfig({ titlesCount: parseInt(e.target.value) })} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm text-slate-600">عدد التصنيفات المقترحة:</label>
                                        <input type="number" min="1" max="10" className="w-20 p-2 bg-slate-50 border border-slate-200 rounded-xl text-center" value={aiConfig.categoriesCount} onChange={(e) => updateAiConfig({ categoriesCount: parseInt(e.target.value) })} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm text-slate-600">عدد الكلمات المفتاحية:</label>
                                        <input type="number" min="1" max="50" className="w-20 p-2 bg-slate-50 border border-slate-200 rounded-xl text-center" value={aiConfig.keywordsCount} onChange={(e) => updateAiConfig({ keywordsCount: parseInt(e.target.value) })} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm text-slate-600">عدد المصادر (APA):</label>
                                        <input type="number" min="0" max="10" className="w-20 p-2 bg-slate-50 border border-slate-200 rounded-xl text-center" value={aiConfig.sourcesCount} onChange={(e) => updateAiConfig({ sourcesCount: parseInt(e.target.value) })} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm text-slate-600">عدد مقترحات الربط:</label>
                                        <input type="number" min="0" max="10" className="w-20 p-2 bg-slate-50 border border-slate-200 rounded-xl text-center" value={aiConfig.linkingCount} onChange={(e) => updateAiConfig({ linkingCount: parseInt(e.target.value) })} />
                                    </div>
                                </div>

                                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-6">
                                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-4">تعليمات مخصصة</h3>
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-400">تعليمات العناوين:</label>
                                        <textarea className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white" value={aiConfig.titlesInstruction} onChange={(e) => updateAiConfig({ titlesInstruction: e.target.value })} />
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <h4 className="text-sm font-bold text-slate-700">أنماط التشويقيات (5 أنواع)</h4>
                                        <p className="text-xs text-slate-400">حدد التعليمات الخاصة لكل تشويقية على حدة:</p>
                                        <div className="space-y-3">
                                            {aiConfig.teaserPrompts.map((prompt, idx) => (
                                                <div key={idx} className="flex gap-2 items-center">
                                                    <span className="text-xs font-bold text-emerald-500 w-6">{idx + 1}</span>
                                                    <input
                                                        type="text"
                                                        className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-emerald-200 transition-all"
                                                        value={prompt}
                                                        onChange={(e) => handleTeaserPromptChange(idx, e.target.value)}
                                                        placeholder={`تعليمات التشويقية رقم ${idx + 1}...`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fade-in 0.4s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
        </div>
    );
};

export default PublishReadyEditor;

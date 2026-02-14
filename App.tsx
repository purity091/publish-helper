
import React, { useState, useEffect, useCallback } from 'react';
import { AppStep, ArticleState, ArticleSection, ExpansionMethod } from './types';
import { ArticleSetup } from './components/ArticleSetup';
import { ToCEditor } from './components/ToCEditor';
import { SectionGenerator } from './components/SectionGenerator';
import { ArticlePreview } from './components/ArticlePreview';
import { KnowledgeCentral } from './components/KnowledgeCentral';
import { PublishReadyEditor } from './components/PublishReadyEditor';
import { AuthPage } from './components/AuthPage';
import { AdminDashboard } from './components/AdminDashboard';
import { generateTableOfContents, generateSectionContent } from './services/openaiService';
import * as db from './services/supabaseService';
import * as auth from './services/authService';
import { ListChecks, Brain, PenLine, Eye, Rocket, Crown, CheckCircle, Download, Wifi, WifiOff } from 'lucide-react';
import { usePWA } from './src/hooks/usePWA';

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<auth.UserProfile | null>(null);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  // PWA State
  const {
    installationStatus,
    isInstallButtonVisible,
    installPWA,
    isStandalone
  } = usePWA();

  // Online/Offline State
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // App State
  const [step, setStep] = useState<AppStep>(AppStep.SETUP);
  const [currentArticleId, setCurrentArticleId] = useState<string | null>(null);
  const [state, setState] = useState<ArticleState>({
    topic: '',
    sections: [],
    isGeneratingToC: false,
    customMethods: []
  });

  // Online/Offline effect
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auth Effect - Check session on load
  useEffect(() => {
    const checkAuth = async () => {
      const user = await auth.getCurrentUser();
      setCurrentUser(user);
    };
    checkAuth();

    // Listen for auth changes
    const unsubscribe = auth.onAuthStateChange((user) => {
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    if (!confirm('هل أنت متأكد من تسجيل الخروج؟')) return;

    await auth.signOut();
    setCurrentUser(null);
    setStep(AppStep.SETUP);
    setState({
      topic: '',
      sections: [],
      isGeneratingToC: false,
      customMethods: []
    });
  };

  // حفظ المقال تلقائياً عند تغيير الأقسام
  const saveArticle = useCallback(async () => {
    if (!state.topic || state.sections.length === 0) return;

    const fullContent = state.sections
      .filter(s => s.content)
      .map(s => `## ${s.title}\n\n${s.content}`)
      .join('\n\n');

    await db.saveGeneratedArticle({
      topic: state.topic,
      sections: state.sections,
      full_content: fullContent,
      status: state.sections.every(s => s.content) ? 'ready' : 'draft'
    });
  }, [state.topic, state.sections]);

  // حفظ تلقائي عند تغيير المحتوى
  useEffect(() => {
    if (state.sections.some(s => s.content)) {
      const timer = setTimeout(saveArticle, 2000); // حفظ بعد 2 ثواني من التوقف
      return () => clearTimeout(timer);
    }
  }, [state.sections, saveArticle]);

  const handleStart = async (topic: string) => {
    setState(prev => ({ ...prev, topic, isGeneratingToC: true }));

    try {
      // التحقق أولاً من وجود مقال محفوظ بنفس الموضوع
      const existingArticle = await db.getGeneratedArticleByTopic(topic);

      if (existingArticle && existingArticle.sections.length > 0) {
        // استخدام المقال المحفوظ بدلاً من التوليد الجديد
        const sections = existingArticle.sections as ArticleSection[];
        setState(prev => ({
          ...prev,
          sections,
          isGeneratingToC: false
        }));
        setCurrentArticleId(existingArticle.id || null);

        // الانتقال للمرحلة المناسبة بناءً على حالة المقال
        if (sections.every(s => s.content)) {
          setStep(AppStep.PREVIEW);
        } else if (sections.some(s => s.content)) {
          setStep(AppStep.WRITING);
        } else {
          setStep(AppStep.OUTLINE);
        }

        alert('تم استرجاع مقال محفوظ مسبقاً! لن يتم استهلاك API إضافي.');
        return;
      }

      // توليد جديد إذا لم يكن هناك مقال محفوظ
      const titles = await generateTableOfContents(topic);
      const initialSections: ArticleSection[] = titles.map((title, index) => ({
        id: Math.random().toString(36).substr(2, 9),
        title,
        context: '',
        content: '',
        isGenerating: false,
        order: index
      }));
      setState(prev => ({ ...prev, sections: initialSections, isGeneratingToC: false }));
      setStep(AppStep.OUTLINE);

      // حفظ الهيكل الجديد
      const saved = await db.saveGeneratedArticle({
        topic,
        sections: initialSections,
        status: 'draft'
      });
      if (saved) {
        setCurrentArticleId(saved.id || null);
        // تسجيل النشاط
        await auth.logActivity('article_created', 'article', saved.id, { topic });
      }

    } catch (error: any) {
      console.error("Full Error Object:", error);
      if (error.message === 'API_KEY_MISSING') {
        alert("مفتاح الـ API غير موجود! يرجى إضافة VITE_OPENAI_API_KEY في ملف .env.local وإعادة تشغيل الخادم.");
      } else {
        alert(`خطأ في الاتصال: ${error.message || 'غير معروف'}. تأكد من صحة مفتاح الـ API وصلاحيته.`);
      }
      setState(prev => ({ ...prev, isGeneratingToC: false }));
    }
  };

  const addCustomMethod = (method: ExpansionMethod) => {
    setState(prev => ({
      ...prev,
      customMethods: [method, ...prev.customMethods]
    }));
  };

  const updateSectionTitle = (id: string, newTitle: string) => {
    setState(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === id ? { ...s, title: newTitle } : s)
    }));
  };

  const updateSectionContext = (id: string, context: string) => {
    setState(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === id ? { ...s, context } : s)
    }));
  };

  const deleteSection = (id: string) => {
    setState(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== id)
    }));
  };

  const generateOneSection = async (id: string) => {
    const section = state.sections.find(s => s.id === id);
    if (!section) return;
    setState(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === id ? { ...s, isGenerating: true } : s)
    }));
    try {
      const content = await generateSectionContent(state.topic, section.title, section.context);
      setState(prev => ({
        ...prev,
        sections: prev.sections.map(s => s.id === id ? { ...s, content, isGenerating: false } : s)
      }));
      // تسجيل النشاط
      await auth.logActivity('section_generated', 'section', id, {
        title: section.title,
        wordCount: content.split(/\s+/).length
      });
    } catch (error) {
      console.error(error);
      setState(prev => ({
        ...prev,
        sections: prev.sections.map(s => s.id === id ? { ...s, isGenerating: false } : s)
      }));
    }
  };

  const generateAllRemaining = async () => {
    const pending = state.sections.filter(s => s.content.length === 0 && !s.isGenerating);
    for (const s of pending) {
      await generateOneSection(s.id);
    }
  };

  const sectionsComplete = state.sections.filter(s => s.content.length > 0).length;

  // Auth Required - Show Login
  if (!currentUser && db.isSupabaseAvailable()) {
    return <AuthPage onSuccess={async () => {
      const user = await auth.getCurrentUser();
      setCurrentUser(user);
    }} />;
  }

  // Admin Dashboard
  if (showAdminDashboard && currentUser?.role === 'superadmin') {
    return (
      <AdminDashboard
        currentUser={currentUser}
        onBack={() => setShowAdminDashboard(false)}
      />
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Navigation Stepper */}
      <nav className="sticky top-0 z-50 glass-card border-b border-slate-200 px-6 py-4 mb-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setStep(AppStep.SETUP)}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            title="العودة للوحة التحكم"
          >
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <span className="text-white font-bold text-xl">P</span>
            </div>
            <h1 className="text-xl font-serif font-bold tracking-tight hidden sm:block">برو رايتر (ProWriter)</h1>
          </button>

          {step !== AppStep.SETUP && (
            <div className="flex items-center gap-4 md:gap-8">
              {[
                { s: AppStep.OUTLINE, label: 'الهيكل', icon: <ListChecks className="w-4 h-4" /> },
                { s: AppStep.KNOWLEDGE_BASE, label: 'المعرفة', icon: <Brain className="w-4 h-4" /> },
                { s: AppStep.WRITING, label: 'المسودة', icon: <PenLine className="w-4 h-4" /> },
                { s: AppStep.PREVIEW, label: 'المعاينة', icon: <Eye className="w-4 h-4" /> },
                { s: AppStep.PUBLISH_READY, label: 'النشر', icon: <Rocket className="w-4 h-4" /> }
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setStep(item.s)}
                  className={`text-sm font-bold transition-all cursor-pointer hover:scale-105 flex items-center gap-1 ${step === item.s ? 'step-active scale-110 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <span className="hidden md:inline">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {/* User Controls */}
          <div className="flex items-center gap-3">
            {/* Online/Offline Indicator */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${isOnline
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
              }`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span>{isOnline ? 'متصل' : 'غير متصل'}</span>
            </div>

            {/* PWA Install Button */}
            {isInstallButtonVisible && (
              <button
                onClick={installPWA}
                className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-200 transition-all flex items-center gap-2"
                title="ثبت التطبيق"
              >
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">ثبت</span>
              </button>
            )}

            {currentUser && (
              <>
                {/* Admin Button */}
                {currentUser.role === 'superadmin' && (
                  <button
                    onClick={() => setShowAdminDashboard(true)}
                    className="px-3 py-2 bg-purple-100 text-purple-700 rounded-xl text-sm font-bold hover:bg-purple-200 transition-all flex items-center gap-2"
                    title="لوحة التحكم"
                  >
                    <Crown className="w-4 h-4" />
                    <span className="hidden md:inline">الإدارة</span>
                  </button>
                )}

                {/* User Menu */}
                <div className="flex items-center gap-2">
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-slate-700">{currentUser.full_name}</p>
                    <p className="text-xs text-slate-400">{currentUser.role === 'superadmin' ? 'مدير' : 'محرر'}</p>
                  </div>
                  <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {currentUser.full_name?.charAt(0) || 'U'}
                  </div>
                </div>

                {/* Sign Out */}
                <button
                  onClick={handleSignOut}
                  className="p-2 text-slate-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50"
                  title="تسجيل الخروج"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </>
            )}

            <button
              onClick={() => window.location.reload()}
              className="text-slate-400 hover:text-rose-500 transition-colors"
              title="مشروع جديد"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
        </div>
      </nav>

      <main className="px-4">
        {step === AppStep.SETUP && <ArticleSetup onStart={handleStart} isLoading={state.isGeneratingToC} />}

        {step === AppStep.OUTLINE && (
          <ToCEditor
            sections={state.sections}
            onUpdate={updateSectionTitle}
            onDelete={deleteSection}
            onProceed={() => setStep(AppStep.KNOWLEDGE_BASE)}
          />
        )}

        {step === AppStep.KNOWLEDGE_BASE && (
          <KnowledgeCentral
            topic={state.topic}
            sections={state.sections}
            customMethods={state.customMethods}
            onAddCustomMethod={addCustomMethod}
            onUpdateContext={updateSectionContext}
            onDeleteSection={deleteSection}
            onProceed={() => setStep(AppStep.WRITING)}
            onBack={() => setStep(AppStep.OUTLINE)}
          />
        )}

        {step === AppStep.WRITING && (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-white p-8 rounded-3xl border border-slate-200">
              <div className="text-right">
                <span className="text-indigo-600 font-bold text-xs uppercase tracking-widest">المشروع الحالي</span>
                <h1 className="text-3xl font-serif mt-1">{state.topic}</h1>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full w-48 overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${(sectionsComplete / (state.sections.length || 1)) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold text-slate-500">{sectionsComplete} من {state.sections.length}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(AppStep.KNOWLEDGE_BASE)} className="px-5 py-3 text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm">تعديل المعرفة</button>
                <button onClick={generateAllRemaining} className="px-5 py-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-2xl font-bold text-sm">توليد الكل</button>
                <button
                  onClick={() => setStep(AppStep.PREVIEW)}
                  disabled={sectionsComplete === 0}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 disabled:opacity-50"
                >
                  معاينة المقال
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {state.sections.map((section, index) => (
                <SectionGenerator
                  key={section.id}
                  section={section}
                  index={index}
                  onUpdateContext={updateSectionContext}
                  onGenerate={generateOneSection}
                />
              ))}
            </div>
          </div>
        )}

        {step === AppStep.PREVIEW && (
          <ArticlePreview
            topic={state.topic}
            sections={state.sections}
            onBack={() => setStep(AppStep.WRITING)}
            onPublishReady={() => setStep(AppStep.PUBLISH_READY)}
          />
        )}

        {step === AppStep.PUBLISH_READY && (
          <PublishReadyEditor
            topic={state.topic}
            sections={state.sections}
            onBack={() => setStep(AppStep.PREVIEW)}
          />
        )}
      </main>

      <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 glass-card px-6 py-3 rounded-full border border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-tighter shadow-xl z-40">
        محرك ProWriter الذكي • مدعوم بـ OpenAI GPT-4o • صُنع بدقة للمحترفين
      </footer>
    </div>
  );
};

export default App;

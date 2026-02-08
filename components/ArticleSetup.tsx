
import React, { useState, useEffect } from 'react';
import * as db from '../services/supabaseService';
import { FileText, CheckCircle, Rocket, ClipboardList, Sparkles, FileIcon, Newspaper, BookOpen, Check } from 'lucide-react';

interface ArticleSetupProps {
  onStart: (topic: string) => void;
  isLoading: boolean;
}

type ContentType = 'article' | 'news';

interface SavedArticle {
  id: string;
  topic: string;
  status: 'draft' | 'ready' | 'published';
  sections: any[];
  created_at: string;
  updated_at?: string;
}

export const ArticleSetup: React.FC<ArticleSetupProps> = ({ onStart, isLoading }) => {
  const [topic, setTopic] = useState('');
  const [contentType, setContentType] = useState<ContentType>('article');
  const [showNewForm, setShowNewForm] = useState(false);
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [isLoadingArticles, setIsLoadingArticles] = useState(true);

  useEffect(() => {
    loadSavedArticles();
  }, []);

  const loadSavedArticles = async () => {
    setIsLoadingArticles(true);
    const articles = await db.getAllGeneratedArticles();
    setSavedArticles(articles);
    setIsLoadingArticles(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      const prefix = contentType === 'news' ? '[خبر] ' : '';
      onStart(prefix + topic);
    }
  };

  const handleContinueArticle = (article: SavedArticle) => {
    onStart(article.topic);
  };

  const handleDeleteArticle = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المحتوى؟')) {
      await db.deleteGeneratedArticle(id);
      loadSavedArticles();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold inline-flex items-center gap-1"><Check className="w-3 h-3" /> منشور</span>;
      case 'ready':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">جاهز للنشر</span>;
      default:
        return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">مسودة</span>;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-slate-900 mb-2">لوحة التحكم</h1>
        <p className="text-slate-500">إدارة المقالات والأخبار المُنشأة بالذكاء الاصطناعي</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-indigo-100 text-sm">إجمالي المحتوى</span>
            <FileText className="w-6 h-6 text-indigo-100" />
          </div>
          <p className="text-3xl font-bold">{savedArticles.length}</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-emerald-100 text-sm">منشور</span>
            <CheckCircle className="w-6 h-6 text-emerald-100" />
          </div>
          <p className="text-3xl font-bold">{savedArticles.filter(a => a.status === 'published').length}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-blue-100 text-sm">جاهز للنشر</span>
            <Rocket className="w-6 h-6 text-blue-100" />
          </div>
          <p className="text-3xl font-bold">{savedArticles.filter(a => a.status === 'ready').length}</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-amber-100 text-sm">مسودات</span>
            <ClipboardList className="w-6 h-6 text-amber-100" />
          </div>
          <p className="text-3xl font-bold">{savedArticles.filter(a => a.status === 'draft').length}</p>
        </div>
      </div>

      {/* New Content Button or Form */}
      {!showNewForm ? (
        <button
          onClick={() => setShowNewForm(true)}
          className="w-full mb-8 py-6 bg-white border-2 border-dashed border-indigo-300 rounded-2xl text-indigo-600 font-bold text-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-center gap-3"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          إنشاء محتوى جديد
        </button>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Sparkles className="w-5 h-5 text-indigo-500" /> إنشاء محتوى جديد</h2>
            <button
              onClick={() => setShowNewForm(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content Type Selector */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setContentType('article')}
              className={`flex-1 py-4 px-6 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${contentType === 'article'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
            >
              <FileIcon className="w-6 h-6 text-current" />
              <div className="text-right">
                <p className="font-bold">مقال</p>
                <p className="text-xs opacity-70">محتوى تفصيلي ومعمق</p>
              </div>
            </button>

            <button
              onClick={() => setContentType('news')}
              className={`flex-1 py-4 px-6 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${contentType === 'news'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
            >
              <Newspaper className="w-6 h-6 text-current" />
              <div className="text-right">
                <p className="font-bold">خبر</p>
                <p className="text-xs opacity-70">تغطية سريعة للأحداث</p>
              </div>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-slate-700 mb-2">
                {contentType === 'article' ? 'موضوع المقال' : 'عنوان الخبر'}
              </label>
              <input
                type="text"
                id="topic"
                placeholder={contentType === 'article'
                  ? 'مثال: أثر الحوسبة الكمية على الأمن السيبراني المالي'
                  : 'مثال: إطلاق نظام ذكاء اصطناعي جديد من شركة OpenAI'
                }
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-lg"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="px-6 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-all"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isLoading || !topic.trim()}
                className={`flex-1 py-3 rounded-xl font-bold text-white transition-all shadow-lg ${isLoading || !topic.trim()
                  ? 'bg-indigo-300 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    جاري التوليد...
                  </span>
                ) : (
                  `بدء إنشاء ${contentType === 'article' ? 'المقال' : 'الخبر'}`
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Saved Articles List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><BookOpen className="w-5 h-5 text-slate-600" /> المحتوى السابق</h2>
          <button
            onClick={loadSavedArticles}
            className="text-slate-400 hover:text-indigo-600 transition-colors"
            title="تحديث"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {isLoadingArticles ? (
          <div className="p-12 text-center">
            <svg className="animate-spin h-8 w-8 text-indigo-500 mx-auto mb-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <p className="text-slate-400">جاري التحميل...</p>
          </div>
        ) : savedArticles.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">لا يوجد محتوى بعد</p>
            <p className="text-slate-400 text-sm mt-1">ابدأ بإنشاء أول مقال أو خبر</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {savedArticles.map(article => (
              <div
                key={article.id}
                className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${article.topic.startsWith('[خبر]')
                    ? 'bg-amber-100'
                    : 'bg-indigo-100'
                    }`}>
                    {article.topic.startsWith('[خبر]') ? <Newspaper className="w-5 h-5" /> : <FileIcon className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-800 truncate">
                      {article.topic.replace('[خبر] ', '')}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      {getStatusBadge(article.status)}
                      <span className="text-xs text-slate-400">
                        {article.sections?.length || 0} أقسام
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDate(article.updated_at || article.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleContinueArticle(article)}
                    className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-medium text-sm hover:bg-indigo-200 transition-all"
                  >
                    متابعة
                  </button>
                  <button
                    onClick={() => handleDeleteArticle(article.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                    title="حذف"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { ArticleSection } from '../types';
import {
  createWordPressPost,
  getWordPressCategories,
  getWordPressTags,
  formatWordPressDate,
  convertToWordPressBlocks,
  WordPressCategory,
  WordPressTag
} from '../services/wordpressService';
import { X, Rocket, Calendar, FileText, Tag, Hash, Eye, Lock, Clock, CheckCircle, Loader, AlertTriangle } from 'lucide-react';

interface WordPressPublishModalProps {
  topic: string;
  sections: ArticleSection[];
  metadata?: {
    slug?: string;
    keywords?: string[];
    titles?: string[];
  };
  onClose: () => void;
  onSuccess?: (post: any) => void;
}

interface PublishOptions {
  title: string;
  slug: string;
  status: 'publish' | 'future' | 'draft' | 'pending' | 'private';
  scheduledDate: string;
  scheduledTime: string;
  categories: number[];
  tags: number[];
  commentStatus: 'open' | 'closed';
  excerpt: string;
}

export const WordPressPublishModal: React.FC<WordPressPublishModalProps> = ({
  topic,
  sections,
  metadata,
  onClose,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [wpCategories, setWpCategories] = useState<WordPressCategory[]>([]);
  const [wpTags, setWpTags] = useState<WordPressTag[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ url: string; title: string } | null>(null);

  const [options, setOptions] = useState<PublishOptions>({
    title: topic,
    slug: metadata?.slug || topic.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, ''),
    status: 'draft',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '12:00',
    categories: [],
    tags: [],
    commentStatus: 'open',
    excerpt: ''
  });

  useEffect(() => {
    loadWordPressData();
  }, []);

  const loadWordPressData = async () => {
    setIsLoading(true);
    try {
      const [categories, tags] = await Promise.all([
        getWordPressCategories(),
        getWordPressTags()
      ]);
      setWpCategories(categories);
      setWpTags(tags);
    } catch (error: any) {
      setError(`فشل تحميل البيانات من WordPress: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!options.title.trim()) {
      setError('يرجى إدخال عنوان للمقال');
      return;
    }

    setIsPublishing(true);
    setError(null);

    try {
      // Prepare content
      const fullContent = sections
        .filter(s => s.content)
        .map(s => `## ${s.title}\n\n${s.content}`)
        .join('\n\n');

      const contentBlocks = convertToWordPressBlocks(fullContent);

      // Prepare post data
      const postData: any = {
        title: options.title,
        content: contentBlocks,
        slug: options.slug,
        status: options.status,
        comment_status: options.commentStatus,
        categories: options.categories,
        tags: options.tags,
      };

      // Add excerpt if provided
      if (options.excerpt.trim()) {
        postData.excerpt = options.excerpt;
      }

      // Add scheduled date if status is 'future'
      if (options.status === 'future' && options.scheduledDate && options.scheduledTime) {
        const scheduleDateTime = new Date(`${options.scheduledDate}T${options.scheduledTime}`);
        postData.date = formatWordPressDate(scheduleDateTime);
      }

      // Create post
      const result = await createWordPressPost(postData);

      setSuccess({
        url: result.link,
        title: result.title.rendered
      });

      onSuccess?.(result);
    } catch (error: any) {
      setError(`فشل النشر: ${error.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const statusOptions = [
    { value: 'draft', label: 'مسودة', icon: FileText, color: 'slate', description: 'حفظ كمسودة للتعديل لاحقاً' },
    { value: 'pending', label: 'قيد المراجعة', icon: Clock, color: 'amber', description: 'بانتظار موافقة المحرر' },
    { value: 'future', label: 'مجدول', icon: Calendar, color: 'blue', description: 'النشر التلقائي في وقت محدد' },
    { value: 'publish', label: 'منشور فوراً', icon: Rocket, color: 'emerald', description: 'نشر مباشر على الموقع' },
    { value: 'private', label: 'خاص', icon: Lock, color: 'purple', description: 'مرئي فقط للمحررين' },
  ];

  const getStatusColor = (color: string) => {
    const colors: Record<string, string> = {
      slate: 'bg-slate-100 text-slate-700 border-slate-200',
      amber: 'bg-amber-100 text-amber-700 border-amber-200',
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      purple: 'bg-purple-100 text-purple-700 border-purple-200',
    };
    return colors[color] || colors.slate;
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 animate-in fade-in zoom-in duration-300">
          <div className="text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">تم النشر بنجاح!</h3>
            <p className="text-slate-600 mb-6">{success.title}</p>
            <a
              href={success.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
            >
              <Eye className="w-5 h-5" />
              معاينة المقال
            </a>
            <div className="mt-4">
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-700 font-bold text-sm"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-100">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">النشر على WordPress</h3>
              <p className="text-slate-500 text-xs">انشر مقالك مباشرة على موقعك</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-slate-600 font-bold">جاري التحميل...</p>
            </div>
          ) : (
            <>
              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  <FileText className="w-4 h-4 inline-block ml-1" />
                  عنوان المقال
                </label>
                <input
                  type="text"
                  value={options.title}
                  onChange={(e) => setOptions({ ...options, title: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                  placeholder="أدخل عنوان المقال"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  الرابط المختصر (Slug)
                </label>
                <div className="flex gap-2">
                  <span className="px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-sm font-mono whitespace-nowrap">
                    /{(() => { try { const u = getWordPressUrl(); return u ? new URL(u).hostname : 'yoursite.com'; } catch { return 'yoursite.com'; } })()}/
                  </span>
                  <input
                    type="text"
                    value={options.slug}
                    onChange={(e) => setOptions({ ...options, slug: e.target.value })}
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                    placeholder="my-article-slug"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Post Status */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">
                  <Rocket className="w-4 h-4 inline-block ml-1" />
                  حالة النشر
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {statusOptions.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setOptions({ ...options, status: opt.value as any })}
                        className={`p-4 rounded-xl border-2 transition-all text-right ${options.status === opt.value
                            ? `${getStatusColor(opt.color)} border-current shadow-lg scale-[1.02]`
                            : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className={`w-5 h-5 ${options.status === opt.value ? 'text-current' : 'text-slate-400'}`} />
                          <span className={`font-bold text-sm ${options.status === opt.value ? 'text-current' : 'text-slate-600'}`}>
                            {opt.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{opt.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Schedule Options */}
              {options.status === 'future' && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-blue-800 text-sm">توقيت النشر المجدول</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-blue-700 mb-1">التاريخ</label>
                      <input
                        type="date"
                        value={options.scheduledDate}
                        onChange={(e) => setOptions({ ...options, scheduledDate: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-blue-700 mb-1">الوقت</label>
                      <input
                        type="time"
                        value={options.scheduledTime}
                        onChange={(e) => setOptions({ ...options, scheduledTime: e.target.value })}
                        className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    سيتم النشر تلقائياً في: {options.scheduledDate} الساعة {options.scheduledTime}
                  </p>
                </div>
              )}

              {/* Categories */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  <Tag className="w-4 h-4 inline-block ml-1" />
                  التصنيفات
                </label>
                {wpCategories.length === 0 ? (
                  <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-xl">لا توجد تصنيفات متاحة</p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-3 bg-slate-50 rounded-xl">
                    {wpCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          const isSelected = options.categories.includes(cat.id);
                          setOptions({
                            ...options,
                            categories: isSelected
                              ? options.categories.filter(id => id !== cat.id)
                              : [...options.categories, cat.id]
                          });
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${options.categories.includes(cat.id)
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'
                          }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  <Hash className="w-4 h-4 inline-block ml-1" />
                  الوسوم
                </label>
                {wpTags.length === 0 ? (
                  <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-xl">لا توجد وسوم متاحة</p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-3 bg-slate-50 rounded-xl">
                    {wpTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => {
                          const isSelected = options.tags.includes(tag.id);
                          setOptions({
                            ...options,
                            tags: isSelected
                              ? options.tags.filter(id => id !== tag.id)
                              : [...options.tags, tag.id]
                          });
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${options.tags.includes(tag.id)
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'
                          }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  <FileText className="w-4 h-4 inline-block ml-1" />
                  مقتطف المقال (اختياري)
                </label>
                <textarea
                  value={options.excerpt}
                  onChange={(e) => setOptions({ ...options, excerpt: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  rows={3}
                  placeholder="ملخص قصير يظهر في أرشيف الموقع..."
                />
              </div>

              {/* Comments */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  التعليقات
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setOptions({ ...options, commentStatus: 'open' })}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${options.commentStatus === 'open'
                        ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                        : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
                      }`}
                  >
                    مفتوحة
                  </button>
                  <button
                    onClick={() => setOptions({ ...options, commentStatus: 'closed' })}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${options.commentStatus === 'closed'
                        ? 'bg-red-100 text-red-700 border-2 border-red-300'
                        : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
                      }`}
                  >
                    مغلقة
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-200 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 rounded-b-3xl">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isPublishing}
              className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl transition-all"
            >
              إلغاء
            </button>
            <button
              onClick={handlePublish}
              disabled={isPublishing || isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
            >
              {isPublishing ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  جاري النشر...
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5" />
                  {options.status === 'future' ? 'جدولة النشر' : options.status === 'draft' ? 'حفظ كمسودة' : 'نشر المقال'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function getWordPressUrl(): string {
  try {
    const config = localStorage.getItem('wordpress_config_v1');
    if (config) {
      const { siteUrl } = JSON.parse(config);
      return siteUrl || '';
    }
  } catch (e) {
    console.error('Error getting WordPress URL:', e);
  }
  return '';
}

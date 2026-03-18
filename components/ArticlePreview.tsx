
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ArticleSection } from '../types';
import {
  ArrowRight,
  Copy,
  CheckCircle,
  Rocket,
  Eye,
  PenLine,
  Type,
  AlignJustify,
  Hash,
  Clock,
  Maximize2,
  Minimize2,
  Undo2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface ArticlePreviewProps {
  topic: string;
  sections: ArticleSection[];
  onBack: () => void;
  onPublishReady?: () => void;
  onSectionsChange?: (sections: ArticleSection[]) => void;
}

export const ArticlePreview: React.FC<ArticlePreviewProps> = ({
  topic,
  sections,
  onBack,
  onPublishReady,
  onSectionsChange
}) => {
  const [editMode, setEditMode] = useState(true);
  const [copied, setCopied] = useState(false);
  const [focusedSection, setFocusedSection] = useState<string | null>(null);
  const [expandedView, setExpandedView] = useState(false);
  const [undoStack, setUndoStack] = useState<ArticleSection[][]>([]);
  const contentRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Auto-resize textareas
  const autoResize = useCallback((textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  // Resize all textareas on mount and section changes
  useEffect(() => {
    if (editMode) {
      Object.values(contentRefs.current).forEach(ref => {
        if (ref) autoResize(ref);
      });
    }
  }, [sections, editMode, autoResize]);

  // Stats
  const stats = useMemo(() => {
    const totalWords = sections.reduce((sum, s) => {
      const words = s.content.trim().split(/\s+/).filter(w => w).length;
      return sum + words;
    }, 0);
    const totalChars = sections.reduce((sum, s) => sum + s.content.length, 0);
    const readTime = Math.max(1, Math.ceil(totalWords / 200));
    return { totalWords, totalChars, readTime, sectionCount: sections.length };
  }, [sections]);

  const fullArticle = useMemo(() => {
    return `# ${topic}\n\n${sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n')}`.trim();
  }, [topic, sections]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullArticle);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pushUndo = () => {
    setUndoStack(prev => [...prev.slice(-19), sections.map(s => ({ ...s }))]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(stack => stack.slice(0, -1));
    onSectionsChange?.(prev);
  };

  const handleTitleChange = (sectionId: string, newTitle: string) => {
    if (!onSectionsChange) return;
    pushUndo();
    const updated = sections.map(s =>
      s.id === sectionId ? { ...s, title: newTitle } : s
    );
    onSectionsChange(updated);
  };

  const handleContentChange = (sectionId: string, newContent: string) => {
    if (!onSectionsChange) return;
    const updated = sections.map(s =>
      s.id === sectionId ? { ...s, content: newContent } : s
    );
    onSectionsChange(updated);
  };

  const handleContentBlur = () => {
    pushUndo();
  };

  const moveSectionUp = (index: number) => {
    if (index === 0 || !onSectionsChange) return;
    pushUndo();
    const updated = [...sections];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onSectionsChange(updated.map((s, i) => ({ ...s, order: i })));
  };

  const moveSectionDown = (index: number) => {
    if (index === sections.length - 1 || !onSectionsChange) return;
    pushUndo();
    const updated = [...sections];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onSectionsChange(updated.map((s, i) => ({ ...s, order: i })));
  };

  const getSectionWordCount = (content: string) => {
    return content.trim().split(/\s+/).filter(w => w).length;
  };

  return (
    <div className={`mx-auto pb-24 transition-all duration-500 ${expandedView ? 'max-w-6xl' : 'max-w-4xl'}`} dir="rtl">
      {/* Top Toolbar */}
      <div className="sticky top-16 z-30 mb-8">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Right Side - Back + Mode Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 font-bold text-sm rounded-xl transition-all"
              >
                <ArrowRight className="w-4 h-4" />
                <span className="hidden sm:inline">العودة للمحرر</span>
              </button>

              <div className="h-8 w-px bg-slate-200" />

              {/* Edit/Preview Toggle */}
              <div className="flex bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => setEditMode(true)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    editMode
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <PenLine className="w-3.5 h-3.5" />
                  تحرير
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    !editMode
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  معاينة
                </button>
              </div>
            </div>

            {/* Center - Stats */}
            <div className="hidden md:flex items-center gap-4 text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <AlignJustify className="w-3 h-3" />
                {stats.totalWords.toLocaleString('ar-EG')} كلمة
              </span>
              <span className="flex items-center gap-1">
                <Type className="w-3 h-3" />
                {stats.totalChars.toLocaleString('ar-EG')} حرف
              </span>
              <span className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {stats.sectionCount} أقسام
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {stats.readTime} دقائق قراءة
              </span>
            </div>

            {/* Left Side - Actions */}
            <div className="flex items-center gap-2">
              {editMode && onSectionsChange && (
                <button
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  title="تراجع"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => setExpandedView(!expandedView)}
                className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                title={expandedView ? 'عرض مضغوط' : 'عرض موسّع'}
              >
                {expandedView ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                onClick={copyToClipboard}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  copied
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span className="hidden sm:inline">{copied ? 'تم النسخ!' : 'نسخ'}</span>
              </button>

              {onPublishReady && (
                <button
                  onClick={onPublishReady}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95 text-sm"
                >
                  <Rocket className="w-4 h-4" />
                  <span className="hidden sm:inline">تجهيز للنشر</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Article Container */}
      <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
        {/* Article Header */}
        <div className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 px-8 md:px-16 py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-xs font-bold mb-6">
            <PenLine className="w-3 h-3" />
            {editMode ? 'وضع التحرير — انقر على النص لتعديله' : 'وضع المعاينة — كما سيظهر للقارئ'}
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-slate-900 leading-tight mb-4">{topic}</h1>
          <p className="text-slate-400 text-sm">
            تم تأليفه بواسطة معمار المقالات الذكي ProWriter
          </p>
          {/* Mobile Stats */}
          <div className="flex md:hidden items-center justify-center gap-4 mt-6 text-xs text-slate-400 font-medium flex-wrap">
            <span>{stats.totalWords.toLocaleString('ar-EG')} كلمة</span>
            <span>•</span>
            <span>{stats.sectionCount} أقسام</span>
            <span>•</span>
            <span>{stats.readTime} دقائق قراءة</span>
          </div>
        </div>

        {/* Table of Contents - Quick Nav */}
        <div className="px-8 md:px-16 py-6 border-b border-slate-100 bg-slate-50/50">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">فهرس المحتوى</p>
          <div className="flex flex-wrap gap-2">
            {sections.map((section, idx) => (
              <button
                key={section.id}
                onClick={() => {
                  const el = document.getElementById(`section-${section.id}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all"
              >
                <span className="text-slate-400 ml-1">{idx + 1}.</span>
                {section.title}
              </button>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="px-8 md:px-16 py-10 space-y-10">
          {sections.map((section, idx) => (
            <div
              key={section.id}
              id={`section-${section.id}`}
              className={`group relative transition-all duration-300 scroll-mt-40 ${
                editMode && focusedSection === section.id
                  ? 'bg-indigo-50/30 -mx-6 px-6 py-6 rounded-2xl ring-1 ring-indigo-200/50'
                  : ''
              }`}
            >
              {/* Section Controls (Edit Mode) */}
              {editMode && onSectionsChange && (
                <div className={`absolute -right-2 top-0 flex flex-col gap-1 transition-opacity duration-200 ${
                  focusedSection === section.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}>
                  <button
                    onClick={() => moveSectionUp(idx)}
                    disabled={idx === 0}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-300 disabled:opacity-30 transition-all shadow-sm"
                    title="تحريك لأعلى"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveSectionDown(idx)}
                    disabled={idx === sections.length - 1}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-300 disabled:opacity-30 transition-all shadow-sm"
                    title="تحريك لأسفل"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Section Number + Title */}
              <div className="flex items-start gap-4 mb-5">
                <span className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-sm font-bold mt-1">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  {editMode && onSectionsChange ? (
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => handleTitleChange(section.id, e.target.value)}
                      onFocus={() => setFocusedSection(section.id)}
                      onBlur={() => setFocusedSection(null)}
                      className="w-full text-2xl md:text-3xl font-serif text-slate-800 bg-transparent border-0 outline-none focus:text-indigo-800 transition-colors placeholder:text-slate-300 caret-indigo-500"
                      placeholder="عنوان القسم..."
                      dir="rtl"
                    />
                  ) : (
                    <h2 className="text-2xl md:text-3xl font-serif text-slate-800">
                      {section.title}
                    </h2>
                  )}
                  <div className="h-px bg-gradient-to-l from-transparent via-slate-200 to-transparent mt-3" />
                </div>
              </div>

              {/* Section Content */}
              <div className="pr-12">
                {editMode && onSectionsChange ? (
                  <div className="relative">
                    <textarea
                      ref={(el) => {
                        contentRefs.current[section.id] = el;
                        if (el) autoResize(el);
                      }}
                      value={section.content}
                      onChange={(e) => {
                        handleContentChange(section.id, e.target.value);
                        autoResize(e.target);
                      }}
                      onFocus={() => setFocusedSection(section.id)}
                      onBlur={() => {
                        handleContentBlur();
                        setFocusedSection(null);
                      }}
                      className="w-full text-slate-700 leading-[2] font-serif text-lg bg-transparent border-0 outline-none resize-none overflow-hidden placeholder:text-slate-300 caret-indigo-500 selection:bg-indigo-100"
                      placeholder="اكتب محتوى القسم هنا..."
                      dir="rtl"
                      style={{ minHeight: '120px' }}
                    />
                    {/* Word count badge */}
                    <div className={`absolute bottom-2 left-0 text-[10px] font-medium px-2 py-0.5 rounded-full transition-opacity duration-200 ${
                      focusedSection === section.id
                        ? 'opacity-100 bg-indigo-50 text-indigo-500'
                        : 'opacity-0 group-hover:opacity-60 bg-slate-100 text-slate-400'
                    }`}>
                      {getSectionWordCount(section.content)} كلمة
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-700 leading-[2] whitespace-pre-wrap font-serif text-lg">
                    {section.content || (
                      <p className="text-slate-300 italic">لم يتم توليد محتوى لهذا القسم.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Section Divider */}
              {idx < sections.length - 1 && (
                <div className="mt-10 flex items-center gap-4">
                  <div className="flex-1 h-px bg-gradient-to-l from-transparent via-slate-200 to-transparent" />
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Article Footer */}
        <div className="bg-gradient-to-t from-slate-50 to-white border-t border-slate-100 px-8 md:px-16 py-8 text-center">
          <p className="text-slate-400 text-sm mb-4">— نهاية المقال —</p>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
            <span>{stats.totalWords.toLocaleString('ar-EG')} كلمة</span>
            <span>•</span>
            <span>{stats.readTime} دقائق قراءة</span>
            <span>•</span>
            <span>{stats.sectionCount} أقسام</span>
          </div>
        </div>
      </div>

      {/* Bottom Actions Bar */}
      <div className="mt-8 flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="px-6 py-3 text-slate-500 hover:text-indigo-600 hover:bg-white font-bold text-sm rounded-xl border border-slate-200 transition-all"
        >
          العودة للمسودة
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={copyToClipboard}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all border ${
              copied
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'تم النسخ!' : 'نسخ المقال كاملاً'}
          </button>
          {onPublishReady && (
            <button
              onClick={onPublishReady}
              className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95 text-sm"
            >
              <Rocket className="w-4 h-4" />
              تجهيز للنشر
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

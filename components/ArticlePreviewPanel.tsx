import React, { useMemo } from 'react';
import { ArticleSection } from '../types';
import { Eye, FileText, CheckCircle } from 'lucide-react';

interface ArticlePreviewPanelProps {
  topic: string;
  sections: ArticleSection[];
}

export const ArticlePreviewPanel: React.FC<ArticlePreviewPanelProps> = ({ topic, sections }) => {
  const fullContent = useMemo(() => {
    return sections
      .filter(s => s.content)
      .map(s => `## ${s.title}\n\n${s.content}`)
      .join('\n\n');
  }, [sections]);

  const sectionsComplete = sections.filter(s => s.content).length;
  const totalSections = sections.length;
  const progress = totalSections > 0 ? (sectionsComplete / totalSections) * 100 : 0;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg">معاينة المقال</h3>
            <p className="text-indigo-100 text-xs">معاينة مباشرة للمحتوى</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white/20 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-white h-full transition-all duration-500" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2 text-xs text-indigo-100">
          <span>التقدم: {sectionsComplete} من {totalSections} قسم</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-h-[600px] overflow-y-auto custom-scrollbar">
        {/* Topic */}
        <div className="mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">الموضوع</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-slate-800">{topic}</h1>
        </div>

        {/* Table of Contents */}
        {sections.length > 0 && (
          <div className="mb-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">فهرس المحتويات</span>
            </div>
            <ol className="space-y-2">
              {sections.map((section, index) => (
                <li key={section.id} className="flex items-start gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    section.content 
                      ? 'bg-emerald-100 text-emerald-600' 
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    {index + 1}
                  </span>
                  <span className={`text-sm ${
                    section.content ? 'text-slate-700 font-medium' : 'text-slate-400'
                  }`}>
                    {section.title}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Article Content */}
        {fullContent ? (
          <div className="prose prose-slate max-w-none">
            {sections.filter(s => s.content).map((section, index) => (
              <div key={section.id} className="mb-6 last:mb-0">
                <h2 className="text-xl font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100">
                  {section.title}
                </h2>
                {section.content.split('\n').map((paragraph, idx) => (
                  paragraph.trim() && (
                    <p key={idx} className="text-slate-600 leading-relaxed mb-3 last:mb-0">
                      {paragraph}
                    </p>
                  )
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-bold text-sm">لا يوجد محتوى للمعاينة</p>
            <p className="text-slate-400 text-xs mt-1">قم بتوليد أقسام المقال أولاً</p>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-indigo-600">{sections.length}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">الأقسام</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600">{sectionsComplete}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">مكتملة</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">{fullContent.split(/\s+/).filter(w => w).length}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">كلمة</p>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};

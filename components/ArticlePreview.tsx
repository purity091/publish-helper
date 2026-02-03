
import React from 'react';
import { ArticleSection } from '../types';

interface ArticlePreviewProps {
  topic: string;
  sections: ArticleSection[];
  onBack: () => void;
  onPublishReady?: () => void;
}

export const ArticlePreview: React.FC<ArticlePreviewProps> = ({ topic, sections, onBack, onPublishReady }) => {
  const fullArticle = `
# ${topic}

${sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n')}
  `.trim();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullArticle);
    alert('تم نسخ المقال بالكامل إلى الحافظة!');
  };

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-slate-500 hover:text-indigo-600 font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          <span>العودة للمحرر</span>
        </button>
        <div className="flex gap-3">
          <button
            onClick={copyToClipboard}
            className="flex items-center space-x-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all active:transform active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
            <span>نسخ المقال</span>
          </button>
          {onPublishReady && (
            <button
              onClick={onPublishReady}
              className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all active:transform active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>تجهيز للنشر</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-8 text-center">
          <h1 className="text-5xl font-serif text-slate-900 leading-tight mb-4">{topic}</h1>
          <p className="text-slate-400 italic">تم تأليفه بواسطة معمار المقالات الذكي ProWriter</p>
        </div>

        <div className="p-12 prose prose-slate max-w-none space-y-12">
          {sections.map((section, idx) => (
            <div key={section.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
              <h2 className="text-3xl font-serif text-slate-800 border-b border-slate-100 pb-2 mb-6">
                {section.title}
              </h2>
              <div className="text-slate-700 leading-relaxed whitespace-pre-wrap font-serif text-lg">
                {section.content || <p className="text-slate-300 italic">لم يتم توليد محتوى لهذا القسم.</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

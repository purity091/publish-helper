
import React from 'react';
import { ArticleSection } from '../types';

interface SectionGeneratorProps {
  section: ArticleSection;
  onUpdateContext: (id: string, context: string) => void;
  onGenerate: (id: string) => void;
  index: number;
}

export const SectionGenerator: React.FC<SectionGeneratorProps> = ({ 
  section, 
  onGenerate,
  index
}) => {
  const isComplete = section.content.length > 0;

  return (
    <div className={`bg-white rounded-3xl border p-8 transition-all relative group ${
      section.isGenerating 
        ? 'border-indigo-400 ring-4 ring-indigo-50 shadow-2xl' 
        : isComplete 
          ? 'border-emerald-100 shadow-sm' 
          : 'border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'
    }`}>
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
            isComplete ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
          }`}>
            {index + 1}
          </span>
          <h3 className="text-xl font-bold text-slate-800">{section.title}</h3>
        </div>
        {isComplete && (
          <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
        )}
      </div>

      <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 mb-6">
        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-widest">الإستراتيجية المطبقة</label>
        <p className="text-xs text-slate-600 line-clamp-2 italic">
          {section.context || 'لا توجد إستراتيجية مخصصة، سيتم استخدام التوليد العام.'}
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => onGenerate(section.id)}
          disabled={section.isGenerating}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all ${
            section.isGenerating
              ? 'bg-indigo-100 text-indigo-400 cursor-wait'
              : isComplete
                ? 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'
          }`}
        >
          {section.isGenerating ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>جاري الكتابة...</span>
            </>
          ) : isComplete ? 'إعادة توليد القسم' : 'توليد المحتوى الآن'}
        </button>
        
        {isComplete && (
           <div className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-2 rounded-xl">
             {section.content.split(' ').length} كلمة
           </div>
        )}
      </div>
    </div>
  );
};


import React from 'react';
import { ArticleSection } from '../types';

interface ToCEditorProps {
  sections: ArticleSection[];
  onUpdate: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
  onProceed: () => void;
}

export const ToCEditor: React.FC<ToCEditorProps> = ({ sections, onUpdate, onDelete, onProceed }) => {
  return (
    <div className="max-w-3xl mx-auto p-8 bg-white rounded-2xl shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-serif text-slate-900">تحسين هيكل المقال</h2>
          <p className="text-slate-500">تأكد من أن هذه الأقسام تغطي موضوعك بشكل مثالي.</p>
        </div>
        <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-semibold border border-indigo-100">
          {sections.length} أقسام
        </div>
      </div>

      <div className="space-y-3 mb-10">
        {sections.map((section, index) => (
          <div key={section.id} className="group flex items-center space-x-4 p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200">
            <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full font-bold text-xs group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
              {index + 1}
            </span>
            <input
              type="text"
              value={section.title}
              onChange={(e) => onUpdate(section.id, e.target.value)}
              className="flex-grow bg-transparent border-none focus:ring-0 text-slate-800 font-medium placeholder:text-slate-300 outline-none"
              placeholder={`أدخل عنوان القسم ${index + 1}...`}
            />
            <button
              onClick={() => onDelete(section.id)}
              className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-500 transition-all"
              title="حذف القسم"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onProceed}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg transition-all active:transform active:scale-95 flex items-center space-x-2"
        >
          <span>تخصيص نماذج المعرفة</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
        </button>
      </div>
    </div>
  );
};

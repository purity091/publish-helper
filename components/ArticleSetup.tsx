
import React, { useState } from 'react';

interface ArticleSetupProps {
  onStart: (topic: string) => void;
  isLoading: boolean;
}

export const ArticleSetup: React.FC<ArticleSetupProps> = ({ onStart, isLoading }) => {
  const [topic, setTopic] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onStart(topic);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-16 p-8 bg-white rounded-2xl shadow-xl border border-slate-100">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-serif text-slate-900 mb-2">معمار المقالات الذكي</h1>
        <p className="text-slate-500">حول أفكارك إلى مقالات احترافية طويلة بدقة الذكاء الاصطناعي.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-slate-700 mb-2">
            ما هو موضوع المقال الخاص بك؟
          </label>
          <input
            type="text"
            id="topic"
            placeholder="مثال: أثر الحوسبة الكمية على الأمن السيبراني المالي"
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-lg"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !topic.trim()}
          className={`w-full py-4 rounded-xl font-semibold text-white transition-all shadow-lg ${isLoading || !topic.trim()
              ? 'bg-indigo-300 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 active:transform active:scale-95'
            }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              جاري هندسة جدول المحتويات...
            </span>
          ) : 'توليد الهيكل'}
        </button>
      </form>
    </div>
  );
};

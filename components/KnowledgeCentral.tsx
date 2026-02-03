
import React, { useState, useMemo } from 'react';
import { ArticleSection, ExpansionMethod } from '../types';
import { EXPANSION_METHODS } from '../constants/expansionMethods';

interface KnowledgeCentralProps {
  topic: string;
  sections: ArticleSection[];
  customMethods: ExpansionMethod[];
  onAddCustomMethod: (method: ExpansionMethod) => void;
  onUpdateContext: (id: string, context: string) => void;
  onDeleteSection: (id: string) => void;
  onProceed: () => void;
  onBack: () => void;
}

export const KnowledgeCentral: React.FC<KnowledgeCentralProps> = ({
  topic,
  sections,
  customMethods,
  onAddCustomMethod,
  onUpdateContext,
  onDeleteSection,
  onProceed,
  onBack
}) => {
  const [selectedSectionId, setSelectedSectionId] = useState<string>(sections[0]?.id || '');
  const [showManager, setShowManager] = useState(false);
  const [newMethod, setNewMethod] = useState<Partial<ExpansionMethod>>({
    category: 'Analysis',
    name: '',
    description: '',
    instruction: ''
  });

  const allMethods = useMemo(() => [...EXPANSION_METHODS, ...customMethods], [customMethods]);

  const applyMethod = (sectionId: string, method: ExpansionMethod) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const newContext = `[إستراتيجية: ${method.name}]\n${method.instruction}`;
    onUpdateContext(sectionId, newContext);
  };

  const handleCreateMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMethod.name && newMethod.instruction) {
      const method: ExpansionMethod = {
        id: `custom-${Date.now()}`,
        name: newMethod.name,
        category: newMethod.category as any,
        description: newMethod.description || '',
        instruction: newMethod.instruction
      };
      onAddCustomMethod(method);
      setNewMethod({ category: 'Analysis', name: '', description: '', instruction: '' });
      setShowManager(false);
    }
  };

  const getCategoryBadge = (cat: string) => {
    const colors: Record<string, string> = {
      'Analysis': 'bg-purple-100 text-purple-700 border-purple-200',
      'Narrative': 'bg-orange-100 text-orange-700 border-orange-200',
      'Strategic': 'bg-blue-100 text-blue-700 border-blue-200',
      'Data': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Context': 'bg-slate-100 text-slate-700 border-slate-200',
    };
    return colors[cat] || colors['Context'];
  };

  const currentSection = sections.find(s => s.id === selectedSectionId);

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="bg-white rounded-3xl p-8 mb-8 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-right">
          <span className="text-indigo-600 font-bold text-sm tracking-widest uppercase">مكتب التخطيط المركزي</span>
          <h1 className="text-3xl font-serif mt-2 text-slate-900">هندسة المعرفة للمقال</h1>
          <p className="text-slate-500 mt-1">قم بتخصيص عمق المعلومات لكل قسم من الأقسام المتاحة.</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setShowManager(true)}
            className="px-6 py-3 bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 rounded-2xl font-bold transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
            إدارة الإستراتيجيات
          </button>
          <button onClick={onProceed} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95">
            بدء صياغة المسودة &larr;
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar: Sections List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-400 px-4 mb-4 uppercase tracking-tighter">هيكل المقال</h3>
            <div className="space-y-1">
              {sections.map((section, idx) => (
                <div
                  key={section.id}
                  className={`group relative flex items-center gap-2 p-1 rounded-2xl transition-all ${selectedSectionId === section.id
                      ? 'bg-indigo-50 border-indigo-100 border text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                      : 'hover:bg-slate-50 border border-transparent text-slate-600'
                    }`}
                >
                  <button
                    onClick={() => setSelectedSectionId(section.id)}
                    className="flex-1 flex items-center gap-4 p-3 text-right overflow-hidden"
                  >
                    <span className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-xl font-bold text-xs ${selectedSectionId === section.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 truncate font-semibold text-sm">
                      {section.title}
                    </div>
                    {section.context && (
                      <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-sm shadow-indigo-200" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (sections.length > 1) {
                        onDeleteSection(section.id);
                        if (selectedSectionId === section.id) {
                          const nextIdx = idx === 0 ? 1 : idx - 1;
                          setSelectedSectionId(sections[nextIdx].id);
                        }
                      } else {
                        alert("يجب أن يحتوي المقال على قسم واحد على الأقل.");
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-500 transition-all ml-1"
                    title="حذف القسم"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
          <button onClick={onBack} className="w-full text-slate-400 hover:text-slate-600 font-bold text-sm py-4">العودة لتعديل العناوين</button>
        </div>

        {/* Main Content: Method Selector & Preview */}
        <div className="lg:col-span-8 space-y-8">
          {currentSection && (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">{currentSection.title}</h2>
                <span className="text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-500 font-bold">القسم {sections.indexOf(currentSection) + 1}</span>
              </div>

              <div className="mb-8">
                <label className="text-xs font-bold text-slate-400 uppercase mb-3 block">التعليمات الحالية للذكاء الاصطناعي</label>
                <textarea
                  className="w-full bg-slate-50 rounded-2xl p-6 text-sm font-mono text-slate-600 border border-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-32"
                  value={currentSection.context}
                  onChange={(e) => onUpdateContext(currentSection.id, e.target.value)}
                  placeholder="اختر إستراتيجية من الأسفل أو اكتب تعليماتك الخاصة هنا..."
                />
              </div>

              <div className="border-t border-slate-100 pt-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    اختر إستراتيجية ({allMethods.length} متاحة)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
                  {allMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => applyMethod(currentSection.id, method)}
                      className="p-4 border border-slate-100 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-right group flex flex-col items-start gap-2"
                    >
                      <div className="flex justify-between w-full items-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${getCategoryBadge(method.category)}`}>
                          {method.category}
                        </span>
                        <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600">{method.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{method.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Strategy Manager Modal */}
      {showManager && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-xl font-bold text-slate-900">إضافة إستراتيجية مخصصة</h4>
                <p className="text-sm text-slate-500">قم بتعريف أسلوب كتابة فريد لاستخدامه لاحقاً.</p>
              </div>
              <button onClick={() => setShowManager(false)} className="text-slate-400 hover:text-slate-600 p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <form onSubmit={handleCreateMethod} className="p-8 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="text-xs font-bold text-slate-500 mb-2 block">اسم الإستراتيجية</label>
                  <input
                    required
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="مثال: تحليل مقارن"
                    value={newMethod.name}
                    onChange={(e) => setNewMethod({ ...newMethod, name: e.target.value })}
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-xs font-bold text-slate-500 mb-2 block">التصنيف</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newMethod.category}
                    onChange={(e) => setNewMethod({ ...newMethod, category: e.target.value as any })}
                  >
                    <option value="Analysis">تحليل (Analysis)</option>
                    <option value="Narrative">سرد (Narrative)</option>
                    <option value="Strategic">إستراتيجي (Strategic)</option>
                    <option value="Data">بيانات (Data)</option>
                    <option value="Context">سياق (Context)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-2 block">وصف قصير</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="وصف مبسط لما تفعله هذه الإستراتيجية..."
                  value={newMethod.description}
                  onChange={(e) => setNewMethod({ ...newMethod, description: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-2 block">تعليمات الذكاء الاصطناعي التفصيلية</label>
                <textarea
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-sm font-mono h-32 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="اكتب الأوامر التي سيتلقاها المحرك عند اختيار هذه الإستراتيجية..."
                  value={newMethod.instruction}
                  onChange={(e) => setNewMethod({ ...newMethod, instruction: e.target.value })}
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg transition-all"
                >
                  حفظ الإستراتيجية الجديدة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

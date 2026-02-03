
import React, { useState } from 'react';

interface ResultCardProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    onCopy?: () => void;
}

const ResultCard: React.FC<ResultCardProps> = ({ title, icon, children, onCopy }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (onCopy) {
            onCopy();
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        {icon}
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                </div>
                {onCopy && (
                    <button
                        onClick={handleCopy}
                        className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-2 ${copied ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        {copied ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                        )}
                        {copied ? 'تم النسخ' : 'نسخ القسم'}
                    </button>
                )}
            </div>
            <div className="space-y-3">
                {children}
            </div>
        </div>
    );
};

export default ResultCard;

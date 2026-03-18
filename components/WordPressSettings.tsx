import React, { useState, useEffect } from 'react';
import {
  WordPressConfig,
  getWordPressConfig,
  saveWordPressConfig,
  clearWordPressConfig,
  testWordPressConnection,
  getWordPressCategories,
  getWordPressTags
} from '../services/wordpressService';
import { Settings, CheckCircle, XCircle, Loader, Wifi, WifiOff, Trash2 } from 'lucide-react';

interface WordPressSettingsProps {
  onConfigChange?: () => void;
}

export const WordPressSettings: React.FC<WordPressSettingsProps> = ({ onConfigChange }) => {
  const [config, setConfig] = useState<WordPressConfig>({
    siteUrl: '',
    username: '',
    applicationPassword: ''
  });
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [siteInfo, setSiteInfo] = useState<any>(null);

  useEffect(() => {
    const savedConfig = getWordPressConfig();
    if (savedConfig) {
      setConfig(savedConfig);
      testConnection(false, savedConfig);
    }
  }, []);

  const testConnection = async (showLoading = true, overrideConfig?: WordPressConfig) => {
    const activeConfig = overrideConfig || config;
    if (!activeConfig.siteUrl || !activeConfig.username || !activeConfig.applicationPassword) {
      setTestResult({ success: false, message: 'يرجى ملء جميع الحقول' });
      return;
    }

    if (showLoading) {
      setIsTesting(true);
    }

    try {
      const result = await testWordPressConnection();
      setTestResult(result);
      setIsConnected(result.success);
      if (result.success && result.siteInfo) {
        setSiteInfo(result.siteInfo);
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'فشل الاتصال'
      });
      setIsConnected(false);
    } finally {
      if (showLoading) {
        setIsTesting(false);
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      saveWordPressConfig(config);
      await testConnection(false);
      setTestResult({ success: true, message: 'تم حفظ الإعدادات بنجاح!' });
      onConfigChange?.();
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'فشل الحفظ'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    if (window.confirm('هل أنت متأكد من حذف إعدادات WordPress؟')) {
      clearWordPressConfig();
      setConfig({ siteUrl: '', username: '', applicationPassword: '' });
      setTestResult(null);
      setIsConnected(false);
      setSiteInfo(null);
      onConfigChange?.();
    }
  };

  const statusLabels = {
    'publish': 'منشور',
    'future': 'مجدول',
    'draft': 'مسودة',
    'pending': 'قيد المراجعة',
    'private': 'خاص'
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-100">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-lg">إعدادات WordPress</h3>
          <p className="text-slate-500 text-xs">اتصل بموقع WordPress للنشر المباشر</p>
        </div>
      </div>

      {/* Connection Status */}
      <div className={`mb-6 p-4 rounded-xl border-2 ${isConnected
          ? 'bg-emerald-50 border-emerald-200'
          : testResult
            ? 'bg-red-50 border-red-200'
            : 'bg-slate-50 border-slate-200'
        }`}>
        <div className="flex items-center gap-3">
          {isConnected ? (
            <CheckCircle className="w-6 h-6 text-emerald-600" />
          ) : testResult ? (
            <XCircle className="w-6 h-6 text-red-600" />
          ) : (
            <WifiOff className="w-6 h-6 text-slate-400" />
          )}
          <div className="flex-1">
            <p className={`font-bold text-sm ${isConnected
                ? 'text-emerald-700'
                : testResult
                  ? 'text-red-700'
                  : 'text-slate-600'
              }`}>
              {isConnected ? 'متصل بنجاح' : testResult ? 'غير متصل' : 'غير مُكوّن'}
            </p>
            {testResult && (
              <p className={`text-xs ${isConnected ? 'text-emerald-600' : 'text-red-600'}`}>
                {testResult.message}
              </p>
            )}
            {siteInfo && (
              <p className="text-xs text-emerald-600 mt-1">
                {siteInfo.name}
              </p>
            )}
          </div>
          {isConnected && (
            <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
              <Wifi className="w-3 h-3 inline-block ml-1" />
              متصل
            </div>
          )}
        </div>
      </div>

      {/* Configuration Form */}
      <div className="space-y-4">
        {/* Site URL */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            رابط الموقع
            <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={config.siteUrl}
            onChange={(e) => setConfig({ ...config, siteUrl: e.target.value })}
            placeholder="https://example.com"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            dir="ltr"
          />
          <p className="text-xs text-slate-500 mt-1">
            مثال: https://yoursite.com أو https://yoursite.com/blog
          </p>
        </div>

        {/* Username */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            اسم المستخدم
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.username}
            onChange={(e) => setConfig({ ...config, username: e.target.value })}
            placeholder="admin"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            dir="ltr"
          />
        </div>

        {/* Application Password */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            كلمة مرور التطبيق
            <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={config.applicationPassword}
              onChange={(e) => setConfig({ ...config, applicationPassword: e.target.value })}
              placeholder="xxxx xxxx xxxx xxxx"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
              dir="ltr"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              type="button"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.593a4 4 0 015.956 0m1.003-1.003a4 4 0 015.956 0M12 15a4 4 0 100-8 4 4 0 000 8z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            أنشئ كلمة مرور تطبيق جديدة من: WordPress → المستخدم → ملف شخصي
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={() => testConnection(true)}
            disabled={isTesting || !config.siteUrl || !config.username || !config.applicationPassword}
            className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
          >
            {isTesting ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                جاري الاختبار...
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4" />
                اختبار الاتصال
              </>
            )}
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || !config.siteUrl || !config.username || !config.applicationPassword}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 text-sm"
          >
            {isSaving ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                حفظ الإعدادات
              </>
            )}
          </button>

          {getWordPressConfig() && (
            <button
              onClick={handleClear}
              className="px-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-xl transition-all"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <h4 className="font-bold text-blue-800 text-sm mb-2">كيفية إنشاء كلمة مرور التطبيق:</h4>
        <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
          <li>سجّل الدخول إلى لوحة تحكم WordPress</li>
          <li>انتقل إلى: المستخدم → الملف الشخصي</li>
          <li>انزل إلى قسم "كلمات مرور التطبيق"</li>
          <li>أدخل اسماً لكلمة المرور (مثلاً: ProWriter)</li>
          <li>انقر على "إنشاء كلمة مرور للتطبيق"</li>
          <li>انسخ كلمة المرور التي تظهر (ستظهر مرة واحدة فقط)</li>
        </ol>
      </div>
    </div>
  );
};

-- ================================================
-- Supabase Database Setup for Article Generator
-- نظام شامل لإدارة المقالات والمحتوى مع المصادقة
-- ================================================

-- ============ جداول المستخدمين والمصادقة ============

-- جدول ملفات المستخدمين (يرتبط بـ auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('editor', 'superadmin')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول سجل النشاطات
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'login', 'logout', 
    'article_created', 'article_updated', 'article_published',
    'section_generated', 'metadata_generated',
    'method_created', 'category_added'
  )),
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول إحصائيات المحررين (يتم تحديثه دورياً)
CREATE TABLE IF NOT EXISTS editor_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE,
  total_articles INTEGER DEFAULT 0,
  total_sections INTEGER DEFAULT 0,
  total_words INTEGER DEFAULT 0,
  articles_today INTEGER DEFAULT 0,
  articles_this_week INTEGER DEFAULT 0,
  articles_this_month INTEGER DEFAULT 0,
  avg_session_minutes INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول الجلسات (لتتبع وقت العمل)
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  is_active BOOLEAN DEFAULT true
);

-- ============ جداول المحتوى ============

-- جدول المقالات المنشورة (للربط الداخلي)
CREATE TABLE IF NOT EXISTS articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول التصنيفات (Categories)
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول المقالات المولدة (لحفظ المسودات وتجنب إعادة التوليد)
CREATE TABLE IF NOT EXISTS generated_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  sections JSONB NOT NULL,
  publish_metadata JSONB,
  full_content TEXT,
  custom_methods JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'published')),
  created_by UUID REFERENCES user_profiles(id),
  updated_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول أساليب التحرير المخصصة (Expansion Methods)
CREATE TABLE IF NOT EXISTS expansion_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Analysis', 'Narrative', 'Strategic', 'Data', 'Context')),
  description TEXT,
  instruction TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول إعدادات التطبيق (لحفظ كل الإعدادات)
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ الفهارس ============

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_generated_articles_topic ON generated_articles(topic);
CREATE INDEX IF NOT EXISTS idx_generated_articles_status ON generated_articles(status);
CREATE INDEX IF NOT EXISTS idx_generated_articles_user ON generated_articles(created_by);
CREATE INDEX IF NOT EXISTS idx_expansion_methods_category ON expansion_methods(category);
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(setting_key);

-- ============ تفعيل RLS ============

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE editor_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE expansion_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- ============ سياسات الوصول ============

-- user_profiles: المستخدمون يرون ملفاتهم، superadmin يرى الجميع
CREATE POLICY "Users can view own profile" ON user_profiles 
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Superadmin can view all profiles" ON user_profiles 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'superadmin')
  );
CREATE POLICY "Users can update own profile" ON user_profiles 
  FOR UPDATE USING (auth.uid() = id);

-- activity_logs: المستخدمون يرون أنشطتهم، superadmin يرى الجميع
CREATE POLICY "Users can view own activities" ON activity_logs 
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Superadmin can view all activities" ON activity_logs 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'superadmin')
  );
CREATE POLICY "Users can insert own activities" ON activity_logs 
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- editor_stats: نفس نمط activity_logs
CREATE POLICY "Users can view own stats" ON editor_stats 
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Superadmin can view all stats" ON editor_stats 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- user_sessions
CREATE POLICY "Users can manage own sessions" ON user_sessions 
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Superadmin can view all sessions" ON user_sessions 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- باقي الجداول: وصول عام للمستخدمين المسجلين
CREATE POLICY "Authenticated users can access articles" ON articles 
  FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can access categories" ON categories 
  FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can access generated_articles" ON generated_articles 
  FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can access expansion_methods" ON expansion_methods 
  FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can access app_settings" ON app_settings 
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ============ الدوال والـ Triggers ============

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- دالة لإنشاء ملف المستخدم تلقائياً عند التسجيل
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'editor')
    );
    
    -- إنشاء سجل إحصائيات فارغ
    INSERT INTO editor_stats (user_id) VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- دالة لتسجيل النشاط
CREATE OR REPLACE FUNCTION log_activity(
    p_action_type TEXT,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO activity_logs (user_id, action_type, entity_type, entity_id, metadata)
    VALUES (auth.uid(), p_action_type, p_entity_type, p_entity_id, p_metadata)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- دالة لتحديث إحصائيات المحرر
CREATE OR REPLACE FUNCTION update_editor_stats(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE editor_stats SET
        total_articles = (
            SELECT COUNT(*) FROM generated_articles 
            WHERE created_by = p_user_id AND status = 'published'
        ),
        articles_today = (
            SELECT COUNT(*) FROM generated_articles 
            WHERE created_by = p_user_id 
            AND created_at >= CURRENT_DATE
        ),
        articles_this_week = (
            SELECT COUNT(*) FROM generated_articles 
            WHERE created_by = p_user_id 
            AND created_at >= CURRENT_DATE - INTERVAL '7 days'
        ),
        articles_this_month = (
            SELECT COUNT(*) FROM generated_articles 
            WHERE created_by = p_user_id 
            AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        ),
        last_activity_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Triggers
CREATE TRIGGER update_generated_articles_updated_at
    BEFORE UPDATE ON generated_articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger لإنشاء ملف المستخدم عند التسجيل
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============ البيانات الافتراضية ============

-- إدخال الإعدادات الافتراضية
INSERT INTO app_settings (setting_key, setting_value) VALUES 
('ai_config', '{
  "titlesCount": 10,
  "keywordsCount": 10,
  "linkingCount": 3,
  "categoriesCount": 5,
  "sourcesCount": 5,
  "systemInstruction": "أنت مساعد تحرير خبير متخصص في تحسين محركات البحث (SEO) وصناعة المحتوى الجذاب.",
  "titlesInstruction": "يجب أن تكون العناوين متنوعة بين الخبرية والتحليلية والمثيرة للفضول.",
  "teaserPrompts": [
    "سؤال مثير للفضول يدفع القارئ للدخول",
    "أهم معلومة في الخبر بأسلوب عاجل ومختصر",
    "موجه لفئة محددة (مثل: للمعلمين، للموظفين..)",
    "أسلوب تحذيري أو تنبيهي (انتبه، احذر..)",
    "ملخص غامض للقصة دون كشف النهاية"
  ]
}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- إدخال أساليب تحرير افتراضية
INSERT INTO expansion_methods (name, category, description, instruction) VALUES 
('تحليل عميق', 'Analysis', 'تحليل شامل للموضوع', 'قم بتحليل عميق للموضوع مع ذكر الأسباب والنتائج'),
('سرد قصصي', 'Narrative', 'أسلوب قصصي جذاب', 'اكتب بأسلوب قصصي يجذب القارئ'),
('رؤية استراتيجية', 'Strategic', 'نظرة مستقبلية', 'قدم رؤية استراتيجية للموضوع'),
('بيانات وإحصائيات', 'Data', 'دعم بالأرقام', 'ادعم المحتوى بالبيانات والإحصائيات'),
('سياق تاريخي', 'Context', 'خلفية تاريخية', 'أضف السياق التاريخي للموضوع')
ON CONFLICT DO NOTHING;

-- ================================================
-- خطوات الإعداد في Supabase:
-- ================================================
-- 1. اذهب إلى https://supabase.com وأنشئ حساب/مشروع جديد
-- 2. من "Authentication" > "Providers" فعّل Email provider
-- 3. من لوحة التحكم، اذهب إلى "SQL Editor"
-- 4. انسخ هذا الكود والصقه في المحرر ثم اضغط "Run"
-- 5. من "Settings" > "API" انسخ:
--    - Project URL → ضعه في VITE_SUPABASE_URL
--    - anon public key → ضعه في VITE_SUPABASE_ANON_KEY
-- 6. لإنشاء أول superadmin، سجل مستخدم عادي ثم نفذ:
--    UPDATE user_profiles SET role = 'superadmin' WHERE email = 'your-email@example.com';
-- ================================================


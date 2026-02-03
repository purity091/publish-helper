
import OpenAI from "openai";
import { PublishMetadata, PublishedArticle, AIConfig, Category } from "../types";

export const generatePublishMetadata = async (
    articleContent: string,
    articleTitle: string,
    existingArticles: PublishedArticle[],
    categories: Category[],
    config: AIConfig
): Promise<PublishMetadata> => {
    // التحقق من وجود مفتاح API
    if (!import.meta.env.VITE_OPENAI_API_KEY) {
        throw new Error("مفتاح OpenAI API غير موجود. يرجى التأكد من إضافة VITE_OPENAI_API_KEY في ملف .env.local");
    }

    // التهيئة
    const openai = new OpenAI({
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true
    });

    const articlesContext = existingArticles.length > 0
        ? `إليك قائمة بالمقالات المنشورة حالياً في الموقع للربط الداخلي:\n${existingArticles.map(a => `- العنوان: ${a.title} | الرابط: ${a.url}`).join('\n')}`
        : "لا توجد قائمة مقالات سابقة للربط الداخلي.";

    const categoriesContext = categories.length > 0
        ? `إليك قائمة التصنيفات المتاحة في الموقع:\n${categories.map(c => `- ${c.name}`).join('\n')}\nاختر أنسب التصنيفات من هذه القائمة.`
        : "لا توجد تصنيفات محددة مسبقاً، اقترح تصنيفات عامة مناسبة.";

    // بناء نص تعليمات التشويقيات الخمسة
    const teasersPromptPart = config.teaserPrompts.map((instruction, index) =>
        `   - التشويقية رقم ${index + 1}: يجب أن تكون مبنية على هذه القاعدة: "${instruction}"`
    ).join('\n');

    const prompt = `
    ${config.systemInstruction}
    
    قم بتحليل المقال التالي باللغة العربية:
    
    عنوان المقال: "${articleTitle}"
    
    محتوى المقال:
    "${articleContent}"
    
    ${articlesContext}

    ${categoriesContext}

    المطلوب توليد البيانات التالية بدقة بصيغة JSON حصراً:
    1. slug: اسم مختصر بالإنجليزية للرابط (SEO friendly).
    2. suggestedCategories: مصفوفة نصوص. اقترح قائمة تضم (${config.categoriesCount}) تصنيفات مناسبة للمقال.
    3. titles: مصفوفة نصوص. توليد عدد (${config.titlesCount}) عنواناً جذاباً. ${config.titlesInstruction}
    4. keywords: مصفوفة نصوص. توليد عدد (${config.keywordsCount}) كلمة مفتاحية قوية جداً لمحركات البحث.
    5. teasers: مصفوفة نصوص. قم بتوليد مصفوفة تحتوي بالضبط على (${config.teaserPrompts.length}) نصوص تشويقية، بحيث يتوافق كل نص مع التعليمات التالية بالترتيب:
    ${teasersPromptPart}
    6. linkingSuggestions: مصفوفة كائنات (title, url). اقترح عدد (${config.linkingCount}) مقالات من القائمة المزودة أعلاه للربط معها. إذا لم تتوفر مقالات كافية، اقترح روابط وهمية لمواضيع مشابهة جداً.
    7. sources: مصفوفة نصوص. اقترح قائمة تضم (${config.sourcesCount}) أبحاث علمية قوية، دراسات أكاديمية، أو تقارير موثوقة جداً مرتبطة بالموضوع بنظام APA 8.

    Example JSON Structure:
    {
      "slug": "example-slug",
      "suggestedCategories": ["cat1", "cat2"],
      "titles": ["title1", "title2"],
      "keywords": ["kw1", "kw2"],
      "teasers": ["teaser1", "teaser2"],
      "linkingSuggestions": [{"title": "t", "url": "u"}],
      "sources": ["source1"]
    }
  `;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a helpful AI assistant that outputs JSON only." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
        });

        const contentResponse = response.choices[0].message.content;
        if (!contentResponse) throw new Error("لم يتم استلام أي بيانات من OpenAI");

        const result = JSON.parse(contentResponse);
        return result as PublishMetadata;

    } catch (error) {
        console.error("OpenAI API Error:", error);
        throw new Error("فشل في الاتصال بـ OpenAI: " + (error instanceof Error ? error.message : String(error)));
    }
};

import OpenAI from 'openai';

// Try multiple sources for the API key (Vite's import.meta.env and injected process.env)
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : "") || "";

const getAI = () => {
  if (!API_KEY || API_KEY === 'PLACEHOLDER_KEY') {
    console.error("OpenAI API Key is missing or invalid in environment variables.");
    throw new Error("API_KEY_MISSING");
  }
  return new OpenAI({ apiKey: API_KEY, dangerouslyAllowBrowser: true });
};

export const generateTableOfContents = async (topic: string): Promise<string[]> => {
  const openai = getAI();

  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `أنت خبير اقتصادي ومستشار تنموي متخصص في شؤون الوطن العربي. 
        هدفك هو مساعدة الكُتّاب في توليد هياكل مقالات احترافية تهدف نهوض وتطوير الاقتصاد العربي. 
        يجب أن يكون الفهرس باللغة العربية الفصحى، رزيناً، وعملياً. 
        يجب أن تكون النتيجة حصراً بصيغة JSON كائن يحتوي على مفتاح "titles" وقيمته مصفوفة من 10 نصوص.
        مثال: {"titles": ["العنوان 1", "العنوان 2", ...]}`
      },
      {
        role: "user",
        content: `قم بتوليد هيكل مقال احترافي ومفصل لموضوع: "${topic}". 
        ركز على الجوانب الاقتصادية والاستثمارية التي تخدم الاقتصاد العربي. 
        أعطني 10 عناوين أقسام في كائن JSON.`
      }
    ],
    model: "gpt-4o",
    response_format: { type: "json_object" }
  });

  const content = completion.choices[0].message.content;
  console.log("Raw AI Response:", content);

  try {
    const data = JSON.parse(content || "{}");
    let results: string[] = [];

    // Check common keys OpenAI might use or we requested
    if (data.titles && Array.isArray(data.titles)) {
      results = data.titles;
    } else if (data.sections && Array.isArray(data.sections)) {
      results = data.sections;
    } else if (data.items && Array.isArray(data.items)) {
      results = data.items;
    } else if (Array.isArray(data)) {
      results = data;
    } else {
      // If none of the above, find any array in the object
      const anyArray = Object.values(data).find(v => Array.isArray(v));
      if (anyArray) {
        results = anyArray as string[];
      }
    }

    // Filter to ensure only strings and sanitize
    results = results.filter(r => typeof r === 'string' && r.length > 0);

    // Ensure 10 items
    results = results.slice(0, 10);
    while (results.length < 10) results.push(`القسم ${results.length + 1}`);

    return results;
  } catch (e) {
    console.error("Failed to parse ToC JSON", e);
    return Array.from({ length: 10 }, (_, i) => `القسم ${i + 1}`);
  }
};

export const generateSectionContent = async (
  topic: string,
  sectionTitle: string,
  context: string
): Promise<string> => {
  const openai = getAI();

  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `أنت رئيس تحرير اقتصادي وصحفي محترف متخصص في قضايا التنمية والنمو في العالم العربي.
          متطلبات الكتابة:
          1. اكتب مسودة شاملة وذات سلطة عالية لهذا القسم فقط باللغة العربية الفصحى.
          2. حافظ على نبرة أكاديمية ومهنية (مثل أسلوب Harvard Business Review بالعربي).
          3. استخدم Markdown للتنسيق (عناوين فرعية، قوائم، نقاط).
          4. ركز على تقديم قيمة مضافة للاقتصاد العربي وحلول عملية.
          5. تجنب الحشو والمقدمات الطويلة، ادخل في صلب الموضوع فوراً.`
      },
      {
        role: "user",
        content: `
          الموضوع العام للمقال: ${topic}
          عنوان هذا القسم: ${sectionTitle}
          
          السياق والتعليمات الإضافية:
          ${context || 'لا يوجد سياق محدد. استخدم خبرتك الاقتصادية المهنية.'}
          
          إذا وجدت "إستراتيجية" أو أوامر هيكلية في السياق أعلاه، يجب عليك الالتزام بها بدقة.
        `
      }
    ],
    model: "gpt-4o",
  });

  return completion.choices[0].message.content || "خطأ في توليد المحتوى. يرجى المحاولة مرة أخرى.";
};

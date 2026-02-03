
export interface ExpansionMethod {
  id: string;
  name: string;
  category: 'Analysis' | 'Narrative' | 'Strategic' | 'Data' | 'Context';
  description: string;
  instruction: string;
}

export interface ArticleSection {
  id: string;
  title: string;
  context: string;
  content: string;
  isGenerating: boolean;
  order: number;
}

export interface ArticleState {
  topic: string;
  sections: ArticleSection[];
  isGeneratingToC: boolean;
  customMethods: ExpansionMethod[];
}

// أنواع البيانات الوصفية للنشر
export interface LinkingSuggestion {
  title: string;
  url: string;
}

export interface PublishMetadata {
  slug: string;
  suggestedCategories: string[];
  titles: string[];
  keywords: string[];
  teasers: string[];
  linkingSuggestions: LinkingSuggestion[];
  sources: string[];
}

export interface PublishedArticle {
  id: string;
  title: string;
  url: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface AIConfig {
  titlesCount: number;
  keywordsCount: number;
  linkingCount: number;
  categoriesCount: number;
  sourcesCount: number;
  systemInstruction: string;
  titlesInstruction: string;
  teaserPrompts: string[];
}

export enum AppStep {
  SETUP = 'setup',
  OUTLINE = 'outline',
  KNOWLEDGE_BASE = 'knowledge_base',
  WRITING = 'writing',
  PREVIEW = 'preview',
  PUBLISH_READY = 'publish_ready'
}

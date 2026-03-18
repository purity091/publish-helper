/**
 * WordPress REST API Integration Service
 * Supports post creation, scheduling, and draft management
 */

export interface WordPressConfig {
  siteUrl: string;
  applicationPassword: string;
  username: string;
}

export interface WordPressPost {
  id: number;
  date: string;
  date_gmt: string;
  guid: {
    rendered: string;
  };
  modified: string;
  modified_gmt: string;
  slug: string;
  status: 'publish' | 'future' | 'draft' | 'pending' | 'private';
  type: string;
  link: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
    protected: boolean;
  };
  excerpt: {
    rendered: string;
    protected: boolean;
  };
  author: number;
  featured_media: number;
  comment_status: 'open' | 'closed';
  ping_status: 'open' | 'closed';
  sticky: boolean;
  template: string;
  format: string;
  meta: any[];
  categories: number[];
  tags: number[];
}

export interface WordPressCategory {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: 'category';
  parent: number;
  meta: any[];
}

export interface WordPressTag {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: 'post_tag';
  meta: any[];
}

interface WordPressPostCreate {
  title: string;
  content: string;
  excerpt?: string;
  slug?: string;
  status?: 'publish' | 'future' | 'draft' | 'pending' | 'private';
  date?: string; // For scheduling (ISO 8601 format)
  categories?: number[];
  tags?: number[];
  comment_status?: 'open' | 'closed';
  meta?: {
    seo_title?: string;
    seo_description?: string;
    seo_keywords?: string;
  };
}

const CONFIG_STORAGE_KEY = 'wordpress_config_v1';

/**
 * Get stored WordPress configuration
 */
export function getWordPressConfig(): WordPressConfig | null {
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error retrieving WordPress config:', error);
  }
  return null;
}

/**
 * Save WordPress configuration to localStorage
 */
export function saveWordPressConfig(config: WordPressConfig): void {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Error saving WordPress config:', error);
  }
}

/**
 * Clear WordPress configuration
 */
export function clearWordPressConfig(): void {
  try {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing WordPress config:', error);
  }
}

/**
 * Check if WordPress is configured
 */
export function isWordPressConfigured(): boolean {
  const config = getWordPressConfig();
  return !!(config?.siteUrl && config?.applicationPassword && config?.username);
}

/**
 * Create Basic Auth header for WordPress API
 */
function getAuthHeader(config: WordPressConfig): string {
  const credentials = btoa(`${config.username}:${config.applicationPassword}`);
  return `Basic ${credentials}`;
}

/**
 * Get WordPress API base URL
 */
function getApiBaseUrl(config: WordPressConfig): string {
  const url = config.siteUrl.endsWith('/') ? config.siteUrl : `${config.siteUrl}/`;
  return `${url}wp-json`;
}

/**
 * Test WordPress connection
 */
export async function testWordPressConnection(): Promise<{ success: boolean; message: string; siteInfo?: any }> {
  const config = getWordPressConfig();
  if (!config) {
    return { success: false, message: 'WordPress غير مُكوّن. يرجى إضافة الإعدادات.' };
  }

  try {
    const response = await fetch(`${getApiBaseUrl(config)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const siteInfo = await response.json();
    return {
      success: true,
      message: 'تم الاتصال بنجاح!',
      siteInfo
    };
  } catch (error: any) {
    return {
      success: false,
      message: `فشل الاتصال: ${error.message}`
    };
  }
}

/**
 * Get WordPress site info
 */
export async function getWordPressSiteInfo(): Promise<any> {
  const config = getWordPressConfig();
  if (!config) {
    throw new Error('WordPress غير مُكوّن');
  }

  const response = await fetch(`${getApiBaseUrl(config)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Create or update a post in WordPress
 */
export async function createWordPressPost(postData: WordPressPostCreate): Promise<WordPressPost> {
  const config = getWordPressConfig();
  if (!config) {
    throw new Error('WordPress غير مُكوّن. يرجى إضافة الإعدادات.');
  }

  const response = await fetch(`${getApiBaseUrl(config)}/wp/v2/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(config),
    },
    body: JSON.stringify(postData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Update an existing WordPress post
 */
export async function updateWordPressPost(postId: number, postData: Partial<WordPressPostCreate>): Promise<WordPressPost> {
  const config = getWordPressConfig();
  if (!config) {
    throw new Error('WordPress غير مُكوّن. يرجى إضافة الإعدادات.');
  }

  const response = await fetch(`${getApiBaseUrl(config)}/wp/v2/posts/${postId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(config),
    },
    body: JSON.stringify(postData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Get WordPress categories
 */
export async function getWordPressCategories(): Promise<WordPressCategory[]> {
  const config = getWordPressConfig();
  if (!config) {
    throw new Error('WordPress غير مُكوّن');
  }

  const response = await fetch(`${getApiBaseUrl(config)}/wp/v2/categories?per_page=100`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(config),
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Get WordPress tags
 */
export async function getWordPressTags(): Promise<WordPressTag[]> {
  const config = getWordPressConfig();
  if (!config) {
    throw new Error('WordPress غير مُكوّن');
  }

  const response = await fetch(`${getApiBaseUrl(config)}/wp/v2/tags?per_page=100`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(config),
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Create a WordPress category
 */
export async function createWordPressCategory(name: string, slug?: string, parent?: number): Promise<WordPressCategory> {
  const config = getWordPressConfig();
  if (!config) {
    throw new Error('WordPress غير مُكوّن');
  }

  const response = await fetch(`${getApiBaseUrl(config)}/wp/v2/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(config),
    },
    body: JSON.stringify({ name, slug: slug || name.toLowerCase().replace(/\s+/g, '-'), parent }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Create a WordPress tag
 */
export async function createWordPressTag(name: string, slug?: string): Promise<WordPressTag> {
  const config = getWordPressConfig();
  if (!config) {
    throw new Error('WordPress غير مُكوّن');
  }

  const response = await fetch(`${getApiBaseUrl(config)}/wp/v2/tags`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(config),
    },
    body: JSON.stringify({ name, slug: slug || name.toLowerCase().replace(/\s+/g, '-') }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Format date for WordPress scheduling (ISO 8601)
 */
export function formatWordPressDate(date: Date): string {
  return date.toISOString();
}

/**
 * Parse WordPress status to Arabic label
 */
export function getPostStatusLabel(status: WordPressPost['status']): string {
  const labels: Record<WordPressPost['status'], string> = {
    'publish': 'منشور',
    'future': 'مجدول',
    'draft': 'مسودة',
    'pending': 'قيد المراجعة',
    'private': 'خاص'
  };
  return labels[status] || status;
}

/**
 * Convert HTML to blocks (basic conversion)
 */
export function convertToWordPressBlocks(content: string): string {
  // Split by markdown-style headers
  const sections = content.split(/##\s+/);
  
  return sections.map(section => {
    const trimmed = section.trim();
    if (!trimmed) return '';
    
    const lines = trimmed.split('\n');
    const title = lines[0];
    const body = lines.slice(1).join('\n').trim();
    
    let blocks = '';
    
    // Add heading block
    blocks += `<!-- wp:heading -->\n<h2 class="wp-block-heading">${title}</h2>\n<!-- /wp:heading -->\n\n`;
    
    if (body) {
      // Convert paragraphs
      const paragraphs = body.split(/\n\n+/);
      paragraphs.forEach(para => {
        const trimmedPara = para.trim();
        if (trimmedPara) {
          blocks += `<!-- wp:paragraph -->\n<p>${trimmedPara.replace(/\n/g, '<br>')}</p>\n<!-- /wp:paragraph -->\n\n`;
        }
      });
    }
    
    return blocks;
  }).join('');
}

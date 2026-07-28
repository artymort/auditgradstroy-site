import sanitizeHtml from 'sanitize-html';

export const RICH_INLINE_PREFIX = '@@CMS_RICH_INLINE@@';
export const RICH_BLOCK_PREFIX = '@@CMS_RICH_BLOCK@@';

const allowedLinkSchemes = ['http', 'https', 'mailto', 'tel'];

const safeLink = (tagName, attributes) => {
  const href = String(attributes.href || '').trim();
  if (!/^(?:https?:|mailto:|tel:|\/|#)/i.test(href)) {
    return { tagName: 'span', attribs: {} };
  }
  return {
    tagName: 'a',
    attribs: {
      href,
      ...(attributes.target === '_blank' ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
    },
  };
};

const normalizeInlineBlocks = (source) => String(source || '')
  .replace(/<li\b[^>]*>/gi, '• ')
  .replace(/<\/li>/gi, '<br>')
  .replace(/<\/?(?:ul|ol)\b[^>]*>/gi, '')
  .replace(/<(?:div|p)\b[^>]*>/gi, '')
  .replace(/<\/(?:div|p)>/gi, '<br><br>');

export const sanitizeInlineHtml = (source) => sanitizeHtml(normalizeInlineBlocks(source), {
  allowedTags: ['strong', 'b', 'em', 'i', 'u', 'br', 'a'],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
  },
  allowedSchemes: allowedLinkSchemes,
  allowProtocolRelative: false,
  transformTags: {
    b: 'strong',
    i: 'em',
    a: safeLink,
  },
})
  .replace(/(?:<br\s*\/?>\s*){3,}/gi, '<br><br>')
  .replace(/^(?:<br\s*\/?>\s*)+/i, '')
  .replace(/(?:<br\s*\/?>\s*)+$/i, '')
  .trim();

export const sanitizeBlockHtml = (source) => sanitizeHtml(String(source || ''), {
  allowedTags: ['p', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 'br', 'ul', 'ol', 'li', 'blockquote', 'a', 'img'],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'loading'],
  },
  allowedSchemes: allowedLinkSchemes,
  allowedSchemesByTag: {
    img: ['http', 'https'],
  },
  allowProtocolRelative: false,
  transformTags: {
    b: 'strong',
    i: 'em',
    a: safeLink,
    img: (tagName, attributes) => {
      const src = String(attributes.src || '').trim();
      if (!/^(?:https?:\/\/|\/)/i.test(src)) return { tagName: 'span', attribs: {} };
      return {
        tagName: 'img',
        attribs: {
          src,
          alt: String(attributes.alt || '').slice(0, 250),
          loading: 'lazy',
        },
      };
    },
  },
}).trim();

export const richTextMode = (value) => {
  const source = String(value || '');
  if (source.startsWith(RICH_INLINE_PREFIX)) return 'inline';
  if (source.startsWith(RICH_BLOCK_PREFIX)) return 'block';
  return null;
};

export const richTextHtml = (value) => {
  const source = String(value || '');
  const mode = richTextMode(source);
  if (mode === 'inline') return sanitizeInlineHtml(source.slice(RICH_INLINE_PREFIX.length));
  if (mode === 'block') return sanitizeBlockHtml(source.slice(RICH_BLOCK_PREFIX.length));
  return null;
};

export const sanitizeStoredRichText = (value) => {
  const source = String(value || '');
  const mode = richTextMode(source);
  if (mode === 'inline') return `${RICH_INLINE_PREFIX}${sanitizeInlineHtml(source.slice(RICH_INLINE_PREFIX.length))}`;
  if (mode === 'block') return `${RICH_BLOCK_PREFIX}${sanitizeBlockHtml(source.slice(RICH_BLOCK_PREFIX.length))}`;
  return value;
};

export const sanitizeRichTree = (value) => {
  if (typeof value === 'string') return sanitizeStoredRichText(value);
  if (Array.isArray(value)) return value.map(sanitizeRichTree);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, sanitizeRichTree(child)]));
  }
  return value;
};

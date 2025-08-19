import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Create DOM environment for Node.js
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/**
 * Sanitize HTML content for product descriptions
 * @param {string} html - Raw HTML content
 * @returns {string} - Sanitized HTML content
 */
export const sanitizeProductContent = (html) => {
  if (!html || typeof html !== 'string') {
    return null;
  }

  return DOMPurify.sanitize(html, {
    // Allowed HTML tags
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'ul', 'ol', 'li',
      'strong', 'em', 'u', 'mark',
      'div', 'span',
      'a', 'img'
    ],
    
    // Allowed attributes
    ALLOWED_ATTR: [
      'class', 'id',
      'href', 'target', 'rel',  // for links
      'src', 'alt', 'width', 'height'  // for images
    ],
    
    // Additional security options
    KEEP_CONTENT: true,  // Keep text content even if tags are removed
    ALLOW_DATA_ATTR: false,  // Disallow data-* attributes
    FORBID_CONTENTS: ['script', 'style'],  // Never allow these contents
    
    // URL validation for links and images
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  });
};

/**
 * Validate content length and structure
 * @param {string} content - HTML content to validate
 * @returns {object} - Validation result
 */
export const validateProductContent = (content) => {
  const errors = [];
  
  if (content) {
    // Check content length (max 50KB)
    if (content.length > 50000) {
      errors.push('Content too long (max 50KB)');
    }
    
    // Check for suspicious patterns
    if (content.includes('<script>') || content.includes('javascript:')) {
      errors.push('Potentially dangerous content detected');
    }
    
    // Basic HTML structure validation
    const openTags = (content.match(/</g) || []).length;
    const closeTags = (content.match(/>/g) || []).length;
    if (openTags !== closeTags) {
      errors.push('Malformed HTML structure');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Text utility functions for consistent text handling across components
 */

// Truncate text to a specified length with ellipsis
export const truncateText = (text: string, maxLength: number = 50): string => {
  if (!text || typeof text !== 'string') return '';
  
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength).trim() + '...';
};

// Clean and sanitize text for display
export const cleanText = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\w\s\-.,!?()]/g, '') // Remove special characters except common punctuation
    .trim();
};

// Truncate text by words instead of characters
export const truncateWords = (text: string, maxWords: number = 10): string => {
  if (!text || typeof text !== 'string') return '';
  
  const words = text.split(' ').filter(word => word.length > 0);
  
  if (words.length <= maxWords) return text;
  
  return words.slice(0, maxWords).join(' ') + '...';
};

// Format text for display in cards/lists
export const formatDisplayText = (text: string, maxLength: number = 100): string => {
  if (!text) return 'No description provided';
  
  const cleaned = cleanText(text);
  return truncateText(cleaned, maxLength);
};

// Check if text contains mock data patterns
export const isMockData = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false;
  
  const mockPatterns = [
    'example.com',
    'lorem ipsum',
    'test@test',
    'placeholder',
    /^([a-z])\1{5,}$/i, // Repeated characters like "nmmmmmmmmm"
  ];
  
  return mockPatterns.some(pattern => {
    if (typeof pattern === 'string') {
      return text.toLowerCase().includes(pattern.toLowerCase());
    } else {
      return pattern.test(text);
    }
  });
};

// Replace mock data with appropriate fallback
export const sanitizeMockData = (text: string, fallback: string = 'Information not available'): string => {
  if (!text || isMockData(text)) {
    return fallback;
  }
  
  return formatDisplayText(text);
}; 
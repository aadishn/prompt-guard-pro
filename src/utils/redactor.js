const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const PII_PATTERNS = {
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  PHONE: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g,
  API_KEY: /\b((?:sk-|AIza)[a-zA-Z0-9-_]{20,})\b/g,
};

export const redactText = (text, entities = [], customRules = []) => {
  if (!text) return { redactedText: "", sessionMap: {} };

  let redactedText = text;
  const sessionMap = {}; 
  const typeCounters = {}; 

  const getPlaceholder = (label, original) => {
    const existingEntry = Object.entries(sessionMap).find(
      ([_, val]) => val.toLowerCase() === original.toLowerCase()
    );
    if (existingEntry) return existingEntry[0];

    const cleanLabel = label.toUpperCase().replace('GPE', 'LOCATION');
    typeCounters[cleanLabel] = (typeCounters[cleanLabel] || 0) + 1;
    const placeholder = `[${cleanLabel}_${typeCounters[cleanLabel]}]`;
    sessionMap[placeholder] = original;
    return placeholder;
  };

  // 1. Custom Rules
  customRules.forEach(({ word, placeholder }) => {
    if (!word || word.trim().length < 2) return;
    const cleanWord = word.trim();
    const regex = new RegExp(`\\b${escapeRegExp(cleanWord)}\\b`, 'gi');
    
    redactedText = redactedText.replace(regex, (match) => {
      const p = placeholder ? `[${placeholder.replace(/[\[\]]/g, '')}]` : "[SECRET]";
      sessionMap[p] = match;
      return p;
    });
  });

  // 2. Regex Patterns
  Object.entries(PII_PATTERNS).forEach(([label, pattern]) => {
    redactedText = redactedText.replace(pattern, (match) => getPlaceholder(label, match));
  });

  // 3. AI Entities
  const sortedEntities = [...entities].sort((a, b) => b.text.length - a.text.length);
  sortedEntities.forEach(({ text: word, label }) => {
    if (!word || word.length < 2) return;
    const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
    redactedText = redactedText.replace(regex, (match) => getPlaceholder(label || 'ENTITY', match));
  });

  return { redactedText, sessionMap };
};
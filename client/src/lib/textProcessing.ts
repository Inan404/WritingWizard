// Helper function to extract sentences from text
export function extractSentences(text: string): string[] {
  // Simple sentence splitting with handling for common abbreviations
  const sentenceRegex = /[^.!?]+[.!?]+/g;
  const matches = text.match(sentenceRegex);
  return matches ? matches.map(sentence => sentence.trim()) : [];
}

// Helper function to calculate text readability
export function calculateReadabilityScore(text: string): number {
  // Simple implementation of Flesch-Kincaid readability score
  const sentences = extractSentences(text);
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const syllables = countSyllables(text);
  
  if (sentences.length === 0 || words.length === 0) return 100;
  
  // Flesch-Kincaid formula: 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
  const wordsPerSentence = words.length / sentences.length;
  const syllablesPerWord = syllables / words.length;
  
  const score = 206.835 - (1.015 * wordsPerSentence) - (84.6 * syllablesPerWord);
  
  // Normalize to 0-100 scale
  return Math.max(0, Math.min(100, score));
}

// Helper function to count syllables (simplified approach)
function countSyllables(text: string): number {
  const words = text.split(/\s+/).filter(word => word.length > 0);
  let count = 0;
  
  for (const word of words) {
    // Count vowel groups as a proxy for syllables
    const normalizedWord = word.toLowerCase().replace(/[.,?!;:()\-]/, '');
    const vowelGroups = normalizedWord.match(/[aeiouy]+/gi);
    const syllableCount = vowelGroups ? vowelGroups.length : 1;
    
    // Words typically have at least one syllable
    count += Math.max(1, syllableCount);
  }
  
  return count;
}

// Helper function to detect potential grammar errors
export function detectGrammarErrors(text: string): { start: number, end: number, type: string }[] {
  const errors: { start: number, end: number, type: string }[] = [];
  
  // Example simple patterns to detect (a more robust implementation would use NLP libraries)
  const patterns = [
    { regex: /\b(a)\s+[aeiou]/gi, type: 'article', replacement: 'an' },
    { regex: /\b(an)\s+[^aeiou]/gi, type: 'article', replacement: 'a' },
    { regex: /\b(is|are|was|were)\s+been\b/gi, type: 'verb-form' },
    { regex: /\b(their|there|they're)\b/gi, type: 'homophone' },
    { regex: /\b(your|you're)\b/gi, type: 'homophone' },
    { regex: /\b(its|it's)\b/gi, type: 'homophone' },
    { regex: /\s+,/g, type: 'punctuation' },
    { regex: /\s+\./g, type: 'punctuation' },
    { regex: /,,/g, type: 'punctuation' },
    { regex: /\.\./g, type: 'punctuation' },
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      errors.push({
        start: match.index,
        end: match.index + match[0].length,
        type: pattern.type
      });
    }
  }
  
  return errors;
}

// Function to detect potential AI-generated content markers
export function detectAIMarkers(text: string): { score: number, markers: { start: number, end: number }[] } {
  // This is a simplified implementation - a real one would use ML models
  const markers: { start: number, end: number }[] = [];
  let aiScore = 0;
  
  // Some simple heuristics that might indicate AI-generated content
  const aiPatterns = [
    // Common AI phrasing
    /\b(in conclusion|to summarize|in summary)\b/gi,
    // Overly formal transitions
    /\b(furthermore|moreover|additionally|consequently)\b/gi,
    // Perfect parallelism
    /\b(firstly|secondly|thirdly|finally)\b/gi,
    // Generic phrases often used by AI
    /\b(it is worth noting that|it is important to consider|it is essential to understand)\b/gi,
    // Sophisticated but generic vocabulary
    /\b(paradigm shift|underlying mechanisms|fundamental principles|inherent limitations)\b/gi
  ];
  
  // Check for AI patterns
  for (const pattern of aiPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      markers.push({
        start: match.index,
        end: match.index + match[0].length
      });
      
      // Increase AI score for each marker found
      aiScore += 5;
    }
  }
  
  // Check for excessive sentence length (AI often writes longer sentences)
  const sentences = extractSentences(text);
  const avgSentenceLength = sentences.reduce((acc, sentence) => acc + sentence.length, 0) / Math.max(1, sentences.length);
  
  if (avgSentenceLength > 150) aiScore += 20;
  else if (avgSentenceLength > 120) aiScore += 15;
  else if (avgSentenceLength > 100) aiScore += 10;
  
  // Normalize score to 0-100 range
  aiScore = Math.min(100, Math.max(0, aiScore));
  
  return { score: aiScore, markers };
}

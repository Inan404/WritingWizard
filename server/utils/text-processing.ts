// Helper function to extract sentences from text
export function extractSentences(text: string): string[] {
  // Simple sentence splitting with handling for common abbreviations
  const sentenceRegex = /[^.!?]+[.!?]+/g;
  const matches = text.match(sentenceRegex);
  return matches ? matches.map(sentence => sentence.trim()) : [];
}

// Helper function to detect potential grammar errors
export function detectGrammarErrors(text: string): { start: number, end: number, type: string }[] {
  const errors: { start: number, end: number, type: string }[] = [];
  
  // Example simple patterns to detect (a more robust implementation would use NLP libraries)
  const patterns = [
    { regex: /\b(a)\s+[aeiou]/gi, type: 'article', replacement: 'an' },
    { regex: /\b(an)\s+[^aeiou]/gi, type: 'article', replacement: 'a' },
    { regex: /\b(is|are|was|were)\s+been\b/gi, type: 'verb-form' },
    { regex: /\b(i|we|they|you|he|she|it)\s+(is|was|are|were)\s+(been)\b/gi, type: 'verb-tense' },
    { regex: /\b(can|could|will|would|shall|should|may|might|must)\s+(recognized|ran|gone|done|seen)\b/gi, type: 'verb-tense' },
    { regex: /\bcan\s+recognized\b/gi, type: 'verb-tense' },
    { regex: /\b(their|there|they're)\b/gi, type: 'homophone' },
    { regex: /\b(your|you're)\b/gi, type: 'homophone' },
    { regex: /\b(its|it's)\b/gi, type: 'homophone' },
    { regex: /\b(to|too|two)\b/gi, type: 'homophone' },
    { regex: /\b(affect|effect)\b/gi, type: 'word-choice' },
    { regex: /\b(accept|except)\b/gi, type: 'word-choice' },
    { regex: /\b(then|than)\b/gi, type: 'word-choice' },
    { regex: /\s+,/g, type: 'punctuation' },
    { regex: /\s+\./g, type: 'punctuation' },
    { regex: /,,/g, type: 'punctuation' },
    { regex: /\.\./g, type: 'punctuation' },
    { regex: /\b(such as the number three)\b/gi, type: 'wordy-phrase' },
    { regex: /\bin order to\b/gi, type: 'wordy-phrase', replacement: 'to' },
    { regex: /\bdue to the fact that\b/gi, type: 'wordy-phrase', replacement: 'because' },
    { regex: /\bat this point in time\b/gi, type: 'wordy-phrase', replacement: 'now' },
    { regex: /\bfor the purpose of\b/gi, type: 'wordy-phrase', replacement: 'for' },
    { regex: /\bin spite of the fact that\b/gi, type: 'wordy-phrase', replacement: 'although' },
    { regex: /\bwith reference to\b/gi, type: 'wordy-phrase', replacement: 'regarding' },
    { regex: /\bit is worth noting that\b/gi, type: 'wordiness', replacement: 'notably' },
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
  
  // Check for passive voice
  const passiveVoiceRegex = /\b(am|is|are|was|were|be|being|been)\s+(\w+ed|built|cut|done|drawn|eaten|fallen|felt|found|given|gone|had|hidden|known|laid|led|made|paid|put|read|ridden|run|said|seen|sold|sent|set|shown|sung|sat|spoken|spent|stood|taken|taught|told|thought|understood|worn|won)\b/gi;
  
  let passiveMatch;
  while ((passiveMatch = passiveVoiceRegex.exec(text)) !== null) {
    errors.push({
      start: passiveMatch.index,
      end: passiveMatch.index + passiveMatch[0].length,
      type: 'passive-voice'
    });
  }
  
  return errors;
}

// Function to detect potential AI-generated content markers
export function detectAIMarkers(text: string): { score: number, markers: { start: number, end: number }[] } {
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
  
  // Check for consistently sized paragraphs (AI tends to write uniform paragraphs)
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  if (paragraphs.length > 1) {
    const paragraphLengths = paragraphs.map(p => p.length);
    const avgLength = paragraphLengths.reduce((sum, len) => sum + len, 0) / paragraphLengths.length;
    
    // Calculate standard deviation
    const variance = paragraphLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / paragraphLengths.length;
    const stdDev = Math.sqrt(variance);
    
    // If paragraphs are very consistent in size (low standard deviation relative to mean)
    if (stdDev / avgLength < 0.2 && paragraphs.length >= 3) {
      aiScore += 15;
    }
  }
  
  // Check for consistent use of pronouns (AI often maintains consistent pronoun usage)
  const pronounPatterns = [
    /\bI\b/g, /\bwe\b/gi, /\byou\b/gi, /\bthey\b/gi, /\bhe\b/gi, /\bshe\b/gi, /\bit\b/gi
  ];
  
  const pronounCounts = pronounPatterns.map(pattern => {
    const matches = text.match(pattern);
    return matches ? matches.length : 0;
  });
  
  // If only one pronoun type is used extensively
  const totalPronouns = pronounCounts.reduce((sum, count) => sum + count, 0);
  const maxPronoun = Math.max(...pronounCounts);
  
  if (totalPronouns > 10 && maxPronoun / totalPronouns > 0.8) {
    aiScore += 10;
  }
  
  // Normalize score to 0-100 range
  aiScore = Math.min(100, Math.max(0, aiScore));
  
  return { score: aiScore, markers };
}

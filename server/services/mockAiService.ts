/**
 * Mock AI Service - A free alternative that returns canned responses for development
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  GrammarResult, 
  ParaphraseResult, 
  HumanizedResult, 
  AICheckResult, 
  GenerateWritingResult,
  GenerateWritingParams
} from './aiServiceTypes';

/**
 * Generates a mock grammar check response
 */
export async function generateGrammarCheck(text: string): Promise<GrammarResult> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Generate a simple mock response
  const words = text.split(' ');
  const highlights: Array<{
    type: "error" | "suggestion" | "ai";
    start: number;
    end: number;
    suggestion?: string;
    message?: string;
  }> = [];
  
  const suggestions: Array<{
    id: string;
    type: "grammar" | "suggestion" | "ai" | "error";
    text: string;
    replacement: string;
    description: string;
  }> = [];
  
  // Create random suggestions for demonstration
  let position = 0;
  for (const word of words) {
    if (Math.random() < 0.1) { // 10% chance of finding an "error"
      const start = text.indexOf(word, position);
      const end = start + word.length;
      
      // Skip if we couldn't find the word (shouldn't happen but just in case)
      if (start === -1) continue;
      
      // Update position for next search
      position = end;
      
      // Type of issue - randomly assign
      const type = Math.random() < 0.5 ? 'error' as const : 'suggestion' as const;
      
      // Create a highlight
      highlights.push({
        type,
        start,
        end,
        suggestion: word.length > 3 ? word.charAt(0).toUpperCase() + word.slice(1) : word,
        message: `Consider revising this ${type === 'error' ? 'error' : 'for better clarity'}`
      });
      
      // Create a corresponding suggestion
      suggestions.push({
        id: uuidv4(),
        type: type === 'error' ? 'grammar' : 'suggestion',
        text: word,
        replacement: word.length > 3 ? word.charAt(0).toUpperCase() + word.slice(1) : word,
        description: type === 'error' 
          ? 'This may be a grammatical error. Consider the suggested correction.' 
          : 'This could be phrased more clearly. Consider the suggestion.'
      });
    }
  }
  
  return {
    corrected: text,
    highlights,
    suggestions
  };
}

/**
 * Generates a mock paraphrase response
 */
export async function generateParaphrase(text: string, style: string = 'standard'): Promise<ParaphraseResult> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // For demo purposes, just change some words based on style
  let paraphrased = text;
  
  const styleMap: { [key: string]: string[] } = {
    'standard': ['also', 'likewise', 'additionally', 'furthermore', 'moreover'],
    'fluency': ['smoothly', 'expertly', 'effortlessly', 'gracefully', 'seamlessly'],
    'formal': ['therefore', 'subsequently', 'consequently', 'hence', 'thus'],
    'academic': ['aforementioned', 'significant', 'empirical', 'theoretical', 'fundamental'],
    'custom': ['uniquely', 'specifically', 'particularly', 'especially', 'notably']
  };
  
  // Simple word substitution for demonstration
  if (styleMap[style]) {
    const styleWords = styleMap[style];
    
    // Simple substitution of common words with style-specific alternatives
    paraphrased = text
      .replace(/also/gi, styleWords[0])
      .replace(/and/gi, styleWords[1])
      .replace(/in addition/gi, styleWords[2])
      .replace(/more/gi, styleWords[3])
      .replace(/as well/gi, styleWords[4]);
  }
  
  // Reformat some sentences for demonstration
  const sentences = paraphrased.split('. ');
  paraphrased = sentences.map((sentence, i) => {
    // Reorder some sentences for effect
    if (i % 2 === 1 && sentence.includes(' ')) {
      const words = sentence.split(' ');
      if (words.length > 3) {
        const firstPart = words.slice(0, Math.floor(words.length / 2));
        const secondPart = words.slice(Math.floor(words.length / 2));
        return [...secondPart, '—', ...firstPart].join(' ');
      }
    }
    return sentence;
  }).join('. ');
  
  return { paraphrased };
}

/**
 * Generates a mock humanized text response
 */
/**
 * Generates a simulated chat response based on message history
 */
export async function generateChatResponse(messages: { role: string, content: string }[]): Promise<string> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Get the last user message
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
  
  // If it's a greeting, respond with a greeting
  if (/^(hi|hello|hey|greetings)/i.test(lastUserMessage)) {
    return "Hello! I'm your AI writing assistant. How can I help with your writing today?";
  }
  
  // If it's a question about capabilities
  if (/what can you do|help me with|your capabilities/i.test(lastUserMessage)) {
    return "I can help you with various writing tasks including grammar checking, paraphrasing, detecting AI-generated content, humanizing text, and generating new content. Just let me know what you need!";
  }
  
  // If it's about grammar
  if (/grammar|spelling|punctuation|error/i.test(lastUserMessage)) {
    return "I'd be happy to help check your grammar. You can either use the Grammar Check tool in the tab above, or paste your text here and I'll identify any issues.";
  }
  
  // If it's about paraphrasing
  if (/paraphrase|rephrase|reword|say differently/i.test(lastUserMessage)) {
    return "Paraphrasing content is one of my specialties. You can use the dedicated Paraphrase tool, or share the text you'd like me to reword here.";
  }
  
  // If it's about AI detection
  if (/ai detection|detect ai|written by ai|ai written/i.test(lastUserMessage)) {
    return "I can analyze text to determine whether it was likely written by AI. This can be helpful if you want your content to appear more human-written. Use the AI Check tool or share your text here.";
  }
  
  // If it contains actual text to analyze (longer message)
  if (lastUserMessage.length > 100) {
    return "Thank you for sharing your text. It appears well-structured, though I notice a few areas that could be improved for clarity and impact. Would you like specific feedback on grammar, style, or organization?";
  }
  
  // Default response for other queries
  return "I'm here to assist with your writing needs. Would you like help with grammar checking, paraphrasing, content generation, or making AI-generated text sound more human? Feel free to share any text you'd like me to help with.";
}

export async function generateHumanized(text: string, style: string = 'standard'): Promise<HumanizedResult> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // For demo, add human-like quirks to make AI text sound more natural
  let humanized = text;
  
  // Add some "humanizing" elements
  humanized = humanized
    // Add some filler words
    .replace(/\. /g, '. Well, ')
    // Add some contractions
    .replace(/it is/g, "it's")
    .replace(/cannot/g, "can't")
    .replace(/do not/g, "don't")
    // Add some conversational elements
    .replace(/furthermore/g, "also")
    .replace(/therefore/g, "so")
    .replace(/subsequently/g, "after that")
    // Break up some perfect sentences
    .replace(/\. /g, (match, index) => {
      return Math.random() < 0.3 ? '! ' : '. ';
    });
  
  return { humanized };
}

/**
 * Generates a mock AI content check response
 */
export async function checkAIContent(text: string): Promise<AICheckResult> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Parse the text and find patterns that look "AI-generated"
  const aiPercentage = Math.floor(Math.random() * 75) + 25; // Random value between 25-99
  
  // Pattern matching for phrases that sound like AI
  const aiPatterns = [
    'as an AI language model',
    'in conclusion',
    'furthermore',
    'on the other hand',
    'it is worth noting',
    'subsequently',
    'in summary',
  ];
  
  // Create mock AI detection highlights
  const highlights: Array<{
    type: "ai";
    start: number;
    end: number;
    message?: string;
  }> = [];
  
  const suggestions: Array<{
    id: string;
    type: "error" | "ai";
    text: string;
    replacement: string;
    description: string;
  }> = [];
  
  // Find any patterns in the text
  for (const pattern of aiPatterns) {
    const patternRegExp = new RegExp(pattern, 'gi');
    let match;
    
    while ((match = patternRegExp.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      
      highlights.push({
        type: 'ai' as const,
        start,
        end,
        message: `This phrase pattern "${pattern}" is commonly used by AI models`
      });
      
      // Create a more human alternative
      let replacement = '';
      switch (pattern) {
        case 'as an AI language model':
          replacement = 'in my view';
          break;
        case 'in conclusion':
          replacement = 'to wrap up';
          break;
        case 'furthermore':
          replacement = 'also';
          break;
        case 'on the other hand':
          replacement = 'but then again';
          break;
        case 'it is worth noting':
          replacement = 'interestingly';
          break;
        case 'subsequently':
          replacement = 'after that';
          break;
        case 'in summary':
          replacement = 'to sum it up';
          break;
        default:
          replacement = pattern;
      }
      
      suggestions.push({
        id: uuidv4(),
        type: 'ai' as const,
        text: match[0],
        replacement,
        description: 'This phrase is commonly used in AI-generated content. Consider using a more conversational alternative.'
      });
    }
  }
  
  // Also suggest changes for sentences that are too long or complex
  const sentences = text.split(/[.!?]+/);
  let position = 0;
  
  for (const sentence of sentences) {
    const start = text.indexOf(sentence, position);
    if (start === -1) continue;
    
    const end = start + sentence.length;
    position = end;
    
    // If sentence is very long, flag it
    if (sentence.length > 150) {
      highlights.push({
        type: 'ai' as const,
        start,
        end,
        message: 'Long, complex sentences are a common pattern in AI writing'
      });
      
      suggestions.push({
        id: uuidv4(),
        type: 'ai' as const,
        text: sentence,
        replacement: 'Break this into 2-3 shorter sentences for a more human touch.',
        description: 'Human writers tend to use shorter sentences with varied structure. Consider breaking this up.'
      });
    }
  }
  
  return {
    aiAnalyzed: text,
    aiPercentage,
    highlights,
    suggestions
  };
}

/**
 * Generates mock writing content
 */
export async function generateWriting({
  originalSample = '',
  referenceUrl = '',
  topic,
  length = '500 words',
  style = 'Academic',
  additionalInstructions = ''
}: GenerateWritingParams): Promise<GenerateWritingResult> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Generate a more realistic response based on the topic with varied content
  let intro = '';
  let mainPoints = '';
  let conclusion = '';
  
  switch (topic.toLowerCase().split(' ')[0]) {
    case 'climate':
    case 'environment':
      intro = 'Climate change presents one of the most pressing challenges of our time. Its impacts are far-reaching, affecting ecosystems, economies, and communities worldwide.';
      mainPoints = 'Rising global temperatures have led to more frequent and severe weather events, including hurricanes, floods, and wildfires. The melting of polar ice caps has contributed to rising sea levels, threatening coastal communities and island nations. Additionally, changing climate patterns have disrupted agricultural systems, potentially leading to food insecurity in vulnerable regions.';
      conclusion = 'Addressing climate change requires coordinated global action, involving policy reforms, technological innovation, and changes in individual behavior. While the challenges are significant, there are also opportunities for creating more sustainable and resilient societies.';
      break;
      
    case 'technology':
    case 'ai':
    case 'digital':
      intro = 'The rapid advancement of technology has transformed virtually every aspect of modern life, from how we communicate and work to how we learn and entertain ourselves.';
      mainPoints = 'Artificial intelligence and machine learning have enabled unprecedented automation and data analysis capabilities, revolutionizing industries from healthcare to finance. The proliferation of smartphones and high-speed internet has connected billions of people worldwide, creating new opportunities for collaboration and knowledge sharing. However, these technological changes also raise important questions about privacy, security, and digital inequality.';
      conclusion = 'As we continue to navigate the digital revolution, it is essential to develop frameworks that maximize the benefits of technology while mitigating potential risks. This will require thoughtful policy approaches, ethical guidelines, and ongoing dialogue among diverse stakeholders.';
      break;
      
    case 'health':
    case 'medical':
    case 'healthcare':
      intro = 'Healthcare systems worldwide face complex challenges, from addressing emerging infectious diseases to managing chronic conditions in aging populations.';
      mainPoints = 'Advances in medical research have led to groundbreaking treatments and improved patient outcomes for many conditions. Preventive healthcare approaches, including vaccination programs and public health campaigns, have proven highly effective in reducing disease burden. At the same time, disparities in healthcare access and quality remain significant challenges in many regions.';
      conclusion = 'Creating more effective, equitable, and sustainable healthcare systems will require integrated approaches that address social determinants of health, leverage technological innovations, and prioritize both treatment and prevention strategies.';
      break;
      
    default:
      intro = `The topic of ${topic} encompasses a rich and diverse array of perspectives, approaches, and implications that merit careful consideration and analysis.`;
      mainPoints = `When examining ${topic}, it is important to consider historical context, contemporary applications, and future possibilities. This multi-faceted approach allows for a more comprehensive understanding of the subject matter. By drawing on diverse sources of knowledge and experience, we can develop more nuanced insights about ${topic} and its significance.`;
      conclusion = `Further exploration of ${topic} promises to yield valuable insights with potential applications across various domains. By continuing to investigate this area with rigor and creativity, we can expand our collective understanding and identify new opportunities for innovation and impact.`;
  }
  
  // Adjust style based on the requested style
  if (style.toLowerCase() === 'casual' || style.toLowerCase() === 'conversational') {
    intro = intro.replace(/presents/g, 'is').replace(/numerous/g, 'many').replace(/individuals/g, 'people');
    mainPoints = mainPoints.replace(/additionally/g, 'also').replace(/however/g, 'but').replace(/furthermore/g, 'also');
    conclusion = conclusion.replace(/it is essential/g, 'we need').replace(/require/g, 'need').replace(/significant/g, 'big');
  } else if (style.toLowerCase() === 'academic' || style.toLowerCase() === 'formal') {
    intro = intro.replace(/big/g, 'substantial').replace(/shows/g, 'demonstrates').replace(/use/g, 'utilize');
    mainPoints = mainPoints.replace(/also/g, 'furthermore').replace(/but/g, 'however').replace(/get/g, 'obtain');
    conclusion = conclusion.replace(/need/g, 'necessitate').replace(/big/g, 'significant').replace(/look at/g, 'examine');
  }
  
  // Assemble the final text
  const generatedText = `
# ${topic}

## Introduction
${intro}

## Main Points
${mainPoints}

## Conclusion
${conclusion}

${additionalInstructions ? `\nNote: This content was prepared following these additional guidelines: ${additionalInstructions}` : ''}
`;

  return { generatedText };
}
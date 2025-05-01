/**
 * Type definitions for AI services
 */

export interface GrammarResult {
  corrected: string;
  highlights: Array<{
    type: "suggestion" | "error" | "ai";
    start: number;
    end: number;
    suggestion?: string;
    message?: string;
  }>;
  suggestions: Array<{
    id: string;
    type: "grammar" | "suggestion" | "ai" | "error";
    text: string;
    replacement: string;
    description: string;
  }>;
}

export interface ParaphraseResult {
  paraphrased: string;
  metrics?: {
    correctness: number;
    clarity: number;
    engagement: number;
    delivery: number;
  };
}

export interface HumanizedResult {
  humanized: string;
  metrics?: {
    correctness: number;
    clarity: number;
    engagement: number;
    delivery: number;
  };
}

export interface AICheckResult {
  aiAnalyzed: string;
  aiPercentage: number;
  highlights: Array<{
    id?: string;
    type: "ai";
    start: number;
    end: number;
    message?: string;
  }>;
  suggestions: Array<{
    id: string;
    type: "ai" | "error";
    text: string;
    replacement: string;
    description: string;
  }>;
  metrics?: {
    correctness: number;
    clarity: number;
    engagement: number;
    delivery: number;
  };
}

export interface GenerateWritingResult {
  generatedText: string;
}

export interface GenerateWritingParams {
  originalSample: string;
  referenceUrl?: string;
  topic: string;
  length?: string;
  style?: string;
  additionalInstructions?: string;
}
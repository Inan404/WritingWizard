import { createContext, useContext, useState, ReactNode } from "react";

export type WritingTool = "chat" | "grammar" | "paraphrase" | "ai-check" | "humanizer";

export type WritingStyle = "standard" | "fluency" | "formal" | "academic" | "custom";

export interface TextContent {
  original: string;
  modified: string;
  highlights: Array<{
    type: "suggestion" | "error" | "ai";
    start: number;
    end: number;
    suggestion?: string;
    message?: string;
  }>;
}

interface WritingContextType {
  activeTool: WritingTool;
  setActiveTool: (tool: WritingTool) => void;
  selectedStyle: WritingStyle;
  setSelectedStyle: (style: WritingStyle) => void;
  grammarText: TextContent;
  setGrammarText: (text: TextContent) => void;
  paraphraseText: {
    original: string;
    paraphrased: string;
  };
  setParaphraseText: (text: { original: string; paraphrased: string }) => void;
  aiCheckText: TextContent;
  setAiCheckText: (text: TextContent) => void;
  humanizerText: {
    original: string;
    humanized: string;
  };
  setHumanizerText: (text: { original: string; humanized: string }) => void;
  chatText: {
    sample: string;
    references: string;
    instructions: string;
    length: string;
    style: string;
    format: string;
  };
  setChatText: (text: {
    sample: string;
    references: string;
    instructions: string;
    length: string;
    style: string;
    format: string;
  }) => void;
  scoreMetrics: {
    correctness: number;
    clarity: number;
    engagement: number;
    delivery: number;
    aiPercentage?: number;
  };
  setScoreMetrics: (metrics: {
    correctness: number;
    clarity: number;
    engagement: number;
    delivery: number;
    aiPercentage?: number;
  }) => void;
  suggestions: Array<{
    id: string;
    type: "grammar" | "suggestion" | "ai" | "error";
    text: string;
    replacement: string;
    description: string;
  }>;
  setSuggestions: (suggestions: Array<{
    id: string;
    type: "grammar" | "suggestion" | "ai" | "error";
    text: string;
    replacement: string;
    description: string;
  }>) => void;
}

const defaultText = "Neural networks can recognize various representations of the same digit, such as the number three, despite differences in pixel values across images.";

const defaultWritingContext: WritingContextType = {
  activeTool: "grammar",
  setActiveTool: () => {},
  selectedStyle: "standard",
  setSelectedStyle: () => {},
  grammarText: {
    original: defaultText,
    modified: defaultText,
    highlights: []
  },
  setGrammarText: () => {},
  paraphraseText: {
    original: defaultText,
    paraphrased: ""
  },
  setParaphraseText: () => {},
  aiCheckText: {
    original: defaultText,
    modified: defaultText,
    highlights: []
  },
  setAiCheckText: () => {},
  humanizerText: {
    original: defaultText,
    humanized: ""
  },
  setHumanizerText: () => {},
  chatText: {
    sample: "",
    references: "",
    instructions: "Write a 500-word essay about neural networks in the style of my uploaded sample. Use academic tone and include recent research.",
    length: "500 words",
    style: "Academic", 
    format: "Essay"
  },
  setChatText: () => {},
  scoreMetrics: {
    correctness: 75,
    clarity: 60,
    engagement: 85,
    delivery: 70,
    aiPercentage: 70
  },
  setScoreMetrics: () => {},
  suggestions: [
    {
      id: "1",
      type: "error",
      text: "despite",
      replacement: ", despite",
      description: "Add a comma before 'despite' for clearer sentence structure"
    },
    {
      id: "2",
      type: "suggestion",
      text: "across",
      replacement: "in",
      description: "Consider replacing 'across' with 'in' for better clarity"
    },
    {
      id: "3",
      type: "error",
      text: "such as the number",
      replacement: "like digit",
      description: "You've repeated 'such as the number' in consecutive sentences"
    }
  ],
  setSuggestions: () => {}
};

const WritingContext = createContext<WritingContextType>(defaultWritingContext);

export function WritingProvider({ children }: { children: ReactNode }) {
  const [activeTool, setActiveTool] = useState<WritingTool>(defaultWritingContext.activeTool);
  const [selectedStyle, setSelectedStyleInternal] = useState<WritingStyle>(defaultWritingContext.selectedStyle);
  
  // Wrap setSelectedStyle to log changes
  const setSelectedStyle = (style: WritingStyle) => {
    console.log(`WritingContext: Setting style from ${selectedStyle} to ${style}`);
    setSelectedStyleInternal(style);
  };
  const [grammarText, setGrammarText] = useState<TextContent>(defaultWritingContext.grammarText);
  const [paraphraseText, setParaphraseText] = useState(defaultWritingContext.paraphraseText);
  const [aiCheckText, setAiCheckText] = useState<TextContent>(defaultWritingContext.aiCheckText);
  const [humanizerText, setHumanizerText] = useState(defaultWritingContext.humanizerText);
  const [chatText, setChatText] = useState(defaultWritingContext.chatText);
  const [scoreMetrics, setScoreMetrics] = useState(defaultWritingContext.scoreMetrics);
  const [suggestions, setSuggestions] = useState(defaultWritingContext.suggestions);

  return (
    <WritingContext.Provider
      value={{
        activeTool,
        setActiveTool,
        selectedStyle,
        setSelectedStyle,
        grammarText,
        setGrammarText,
        paraphraseText,
        setParaphraseText,
        aiCheckText,
        setAiCheckText,
        humanizerText,
        setHumanizerText,
        chatText,
        setChatText,
        scoreMetrics,
        setScoreMetrics,
        suggestions,
        setSuggestions
      }}
    >
      {children}
    </WritingContext.Provider>
  );
}

export const useWriting = () => useContext(WritingContext);

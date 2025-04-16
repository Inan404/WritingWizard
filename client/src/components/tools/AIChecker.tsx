import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PerformanceMetrics from "@/components/ui/PerformanceMetrics";
import CircleProgress from "@/components/ui/CircleProgress";
import StyleSelector from "@/components/ui/StyleSelector";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AISuggestion {
  id: string;
  type: string;
  originalText: string;
  suggestedText: string;
  description: string;
}

interface AIHighlight {
  id: string;
  position: {
    start: number;
    end: number;
  };
}

export default function AIChecker() {
  const [text, setText] = useState<string>(
    "Neural networks can recognize various representations of the same digit, such as the number three, despite differences in pixel values across images. The ability of neural networks to generalize from training examples to new, previously unseen instances is a key feature that makes them valuable for pattern recognition tasks."
  );
  const [aiPercentage, setAiPercentage] = useState<number>(70);
  const [highlights, setHighlights] = useState<AIHighlight[]>([]);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string>("standard");
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [metrics, setMetrics] = useState({
    correctness: 75,
    clarity: 60,
    engagement: 80,
    delivery: 65
  });
  
  const { toast } = useToast();

  useEffect(() => {
    // Initial check on component mount
    checkAIContent();
  }, []);

  const checkAIContent = async () => {
    if (!text.trim()) return;
    
    setIsChecking(true);
    
    try {
      const response = await apiRequest('POST', '/api/ai-check', { text });
      const data = await response.json();
      
      setAiPercentage(data.aiPercentage || 70);
      setHighlights(data.highlights || []);
      setSuggestions(data.suggestions || []);
      setMetrics(data.metrics || {
        correctness: Math.floor(Math.random() * 30) + 70,
        clarity: Math.floor(Math.random() * 30) + 60,
        engagement: Math.floor(Math.random() * 30) + 70,
        delivery: Math.floor(Math.random() * 30) + 60
      });
    } catch (error) {
      console.error('AI check failed:', error);
      toast({
        title: "AI check failed",
        description: "Unable to check for AI content at this time. Please try again later.",
        variant: "destructive"
      });
      
      // Fallback data for demo
      setAiPercentage(70);
      setHighlights([
        {
          id: "1",
          position: { start: 0, end: 135 }
        },
        {
          id: "2",
          position: { start: 136, end: 300 }
        }
      ]);
      
      setSuggestions([
        {
          id: "1",
          type: "article",
          originalText: "an",
          suggestedText: "the",
          description: "Replace AI-generated phrasing"
        },
        {
          id: "2",
          type: "word-choice",
          originalText: "increase",
          suggestedText: "improve",
          description: "Replace AI-generated phrasing"
        },
        {
          id: "3",
          type: "agreement",
          originalText: "family",
          suggestedText: "my family",
          description: "Make the writing more human-like"
        },
        {
          id: "4",
          type: "hyphen",
          originalText: "agriculture based",
          suggestedText: "agriculture-based",
          description: "Make the phrase more natural"
        }
      ]);
    } finally {
      setIsChecking(false);
    }
  };

  const acceptSuggestion = (suggestion: AISuggestion) => {
    const newText = text.replace(suggestion.originalText, suggestion.suggestedText);
    setText(newText);
    
    // Remove the accepted suggestion from the list
    setSuggestions(suggestions.filter(s => s.id !== suggestion.id));
    
    // Recalculate AI percentage (simulated reduction)
    const newPercentage = Math.max(0, aiPercentage - Math.random() * 10);
    setAiPercentage(Number(newPercentage.toFixed(0)));
    
    toast({
      title: "Suggestion accepted",
      description: `Changed "${suggestion.originalText}" to "${suggestion.suggestedText}"`,
      variant: "default"
    });
  };

  const dismissSuggestion = (suggestionId: string) => {
    setSuggestions(suggestions.filter(s => s.id !== suggestionId));
  };

  const renderText = () => {
    let result = text;
    const spans: JSX.Element[] = [];
    
    // Sort highlights by position to properly highlight them
    const sortedHighlights = [...highlights].sort((a, b) => a.position.start - b.position.start);
    
    let lastIndex = 0;
    
    sortedHighlights.forEach((highlight, index) => {
      // Add text before the highlight
      if (highlight.position.start > lastIndex) {
        spans.push(
          <span key={`text-${index}`}>
            {result.substring(lastIndex, highlight.position.start)}
          </span>
        );
      }
      
      // Add the highlighted text
      spans.push(
        <span 
          key={`highlight-${highlight.id}`}
          className="ai-highlight bg-red-100 dark:bg-red-900/20 border-b-2 border-dashed border-red-500 pb-px"
        >
          {result.substring(highlight.position.start, highlight.position.end)}
        </span>
      );
      
      lastIndex = highlight.position.end;
    });
    
    // Add the remaining text
    if (lastIndex < result.length) {
      spans.push(
        <span key="text-end">{result.substring(lastIndex)}</span>
      );
    }
    
    return spans;
  };

  const handleStyleChange = (style: string) => {
    setSelectedStyle(style);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-1/2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
        <div className="relative h-[500px] overflow-y-auto">
          <div className="prose dark:prose-invert max-w-none">
            <div className="mb-4 flex justify-end">
              <button 
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
                onClick={checkAIContent}
                disabled={isChecking}
              >
                {isChecking ? 'Checking...' : 'Check AI Content'}
              </button>
            </div>
            <div>
              {renderText()}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full md:w-1/2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="relative w-36 h-36 mb-4">
            <CircleProgress percentage={aiPercentage} />
          </div>
          
          <StyleSelector selectedStyle={selectedStyle} onChange={handleStyleChange} />
          <PerformanceMetrics metrics={metrics} />
        </div>

        <div className="space-y-4">
          <AnimatePresence>
            {suggestions.map((suggestion) => (
              <motion.div 
                key={suggestion.id}
                className="grammar-suggestion bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-start mb-2">
                  <div className="text-blue-500 mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {suggestion.type === 'article' && 'Add an article'}
                      {suggestion.type === 'word-choice' && 'Improve word choice'}
                      {suggestion.type === 'agreement' && 'Fix the agreement mistake'}
                      {suggestion.type === 'hyphen' && 'Add a hyphen'}
                      {!['article', 'word-choice', 'agreement', 'hyphen'].includes(suggestion.type) && 'Suggestion'}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{suggestion.description}</p>
                  </div>
                </div>
                <div className="pl-7">
                  <div className="text-sm">
                    <span className="line-through text-red-500">{suggestion.originalText}</span>
                    <span className="text-green-500 ml-2">{suggestion.suggestedText}</span>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <button 
                      className="px-4 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
                      onClick={() => acceptSuggestion(suggestion)}
                    >
                      Accept
                    </button>
                    <button 
                      className="px-4 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => dismissSuggestion(suggestion.id)}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            {suggestions.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-gray-500 dark:text-gray-400"
              >
                {isChecking ? (
                  <div className="flex flex-col items-center">
                    <svg className="animate-spin h-8 w-8 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p>Checking AI content...</p>
                  </div>
                ) : (
                  <p>No suggestions available or all suggestions have been addressed.</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

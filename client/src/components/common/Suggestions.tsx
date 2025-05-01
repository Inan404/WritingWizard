import { motion, AnimatePresence } from 'framer-motion';
import { useWriting } from '@/context/WritingContext';
import { AlertCircle, Lightbulb, RotateCw, Pen } from 'lucide-react';

interface SuggestionsProps {
  onAccept?: (id: string) => void;
  onDismiss?: (id: string) => void;
  type?: 'grammar' | 'paraphrase' | 'ai' | 'humanize';
  suggestions?: Array<{
    id: string;
    type: "grammar" | "suggestion" | "ai" | "error";
    text: string;
    replacement: string;
    description: string;
  }>;
}

export default function Suggestions({ 
  onAccept, 
  onDismiss,
  type = 'grammar',
  suggestions: propSuggestions
}: SuggestionsProps) {
  const { suggestions: contextSuggestions } = useWriting();
  
  // Use the suggestions from props if provided, otherwise use from context
  const suggestions = propSuggestions || contextSuggestions;
  
  // Filter suggestions based on type
  const filteredSuggestions = suggestions.filter(suggestion => {
    if (type === 'grammar' && (suggestion.type === 'grammar' || suggestion.type === 'error' || suggestion.type === 'suggestion')) {
      return true;
    }
    if (type === 'ai' && suggestion.type === 'ai') {
      return true;
    }
    // For other types, no filtering for now
    if (type === 'paraphrase' || type === 'humanize') {
      return true;
    }
    return false;
  });

  const handleAccept = (id: string) => {
    if (onAccept) {
      onAccept(id);
    }
  };

  const handleDismiss = (id: string) => {
    if (onDismiss) {
      onDismiss(id);
    }
  };

  const getIcon = (suggestionType: string) => {
    switch (suggestionType) {
      case 'grammar':
      case 'error':
        return <AlertCircle className="h-5 w-5 text-secondary" />;
      case 'suggestion':
        return <Lightbulb className="h-5 w-5 text-primary" />;
      case 'ai':
        return <RotateCw className="h-5 w-5 text-warning" />;
      default:
        return <Pen className="h-5 w-5 text-success" />;
    }
  };

  const getBorderColor = (suggestionType: string) => {
    switch (suggestionType) {
      case 'grammar':
      case 'error':
        return 'border-secondary';
      case 'suggestion':
        return 'border-primary';
      case 'ai':
        return 'border-warning';
      default:
        return 'border-success';
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <AnimatePresence>
        {filteredSuggestions.map((suggestion) => (
          <motion.div
            key={suggestion.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className={`bg-muted rounded-lg p-4 border-l-4 ${getBorderColor(suggestion.type)} animate-fade-in mb-4 shadow-sm`}
          >
            <div className="flex items-start">
              <div className="mr-3 mt-1 flex-shrink-0">
                {getIcon(suggestion.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium mb-2">
                  {suggestion.type === 'error' ? 'Grammar issue' : 
                   suggestion.type === 'suggestion' ? 'Word choice' : 
                   suggestion.type === 'ai' ? 'AI content detected' : 
                   'Fix the agreement mistake'}
                </p>
                <p className="text-sm text-muted-foreground mb-3 break-words">
                  {suggestion.description}
                </p>
                <div className="text-sm bg-card p-3 rounded mb-3 border border-border break-words overflow-hidden">
                  <span className={suggestion.type === 'error' ? 'text-secondary font-medium' : 
                               suggestion.type === 'suggestion' ? 'text-primary font-medium' : 
                               suggestion.type === 'ai' ? 'text-warning font-medium' : 
                               'text-success font-medium'}>
                    {suggestion.replacement}
                  </span>
                </div>
                <div className="flex space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 transition-colors duration-200 font-medium"
                    onClick={() => handleAccept(suggestion.id)}
                  >
                    Accept
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 bg-muted text-foreground text-sm rounded-md hover:bg-muted/80 transition-colors duration-200"
                    onClick={() => handleDismiss(suggestion.id)}
                  >
                    Dismiss
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

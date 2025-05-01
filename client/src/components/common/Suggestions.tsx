import { motion, AnimatePresence } from 'framer-motion';
import { useWriting } from '@/context/WritingContext';
import { AlertCircle, Lightbulb, RotateCw, Pen } from 'lucide-react';

interface SuggestionsProps {
  onAccept?: (id: string) => void;
  onDismiss?: (id: string) => void;
  type?: 'grammar' | 'paraphrase' | 'ai' | 'humanize';
}

export default function Suggestions({ 
  onAccept, 
  onDismiss,
  type = 'grammar'
}: SuggestionsProps) {
  const { suggestions } = useWriting();
  
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
  
  console.log(`Showing ${filteredSuggestions.length} suggestions for ${type} tool`);

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
    <div className="space-y-4">
      <AnimatePresence>
        {filteredSuggestions.map((suggestion) => (
          <motion.div
            key={suggestion.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className={`bg-muted rounded-lg p-3 border-l-4 ${getBorderColor(suggestion.type)} animate-fade-in`}
          >
            <div className="flex items-start">
              <div className="mr-3 mt-1">
                {getIcon(suggestion.type)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">
                  {suggestion.type === 'error' ? 'Missing comma' : 
                   suggestion.type === 'suggestion' ? 'Word choice' : 
                   suggestion.type === 'ai' ? 'AI content detected' : 
                   'Fix the agreement mistake'}
                </p>
                <p className="text-sm text-muted-foreground mb-2">
                  {suggestion.description}
                </p>
                <div className="text-sm bg-card p-2 rounded mb-2">
                  <span className={suggestion.type === 'error' ? 'text-secondary font-bold' : 
                               suggestion.type === 'suggestion' ? 'text-primary font-bold' : 
                               suggestion.type === 'ai' ? 'text-warning font-bold' : 
                               'text-success font-bold'}>
                    {suggestion.replacement}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-1 bg-primary text-white text-sm rounded-md hover:bg-primary/90 transition-colors duration-200"
                    onClick={() => handleAccept(suggestion.id)}
                  >
                    Accept
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-1 bg-muted text-foreground text-sm rounded-md hover:bg-muted/80 transition-colors duration-200"
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

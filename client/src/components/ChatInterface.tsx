import { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Clock, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAiTool, ApiMessage, MessageRole } from '@/hooks/useAiTool';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';

// Local UI message interface
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function ChatInterface() {
  // The first message is always from the assistant (welcome message)
  // But when we send to the API, we need to make sure we follow the system -> user -> assistant pattern
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial-message',
      role: 'assistant',
      content: 'Hello! I am your AI writing assistant. How can I help you with your writing needs today?',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const { mutate, isPending } = useAiTool();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = () => {
    if (!input.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    // Start with just the system message and current user input 
    // This is the simplest approach to ensure proper alternation
    const messagesToSend: ApiMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful, friendly AI writing assistant. Provide detailed and thoughtful responses to help users with their writing needs.'
      },
      {
        role: 'user',
        content: input
      }
    ];
    
    // This simplification may lose conversation history,
    // but it ensures we follow the exact pattern Perplexity requires: system → user
    
    console.log('Prepared messages for Perplexity API:', messagesToSend);
    
    // Send to AI API
    mutate(
      { 
        text: '', 
        mode: 'chat', 
        messages: messagesToSend 
      },
      {
        onSuccess: (response) => {
          const aiMessage: Message = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: typeof response === 'string' ? response : 'I encountered an issue processing your request.',
            timestamp: Date.now(),
          };
          
          setMessages(prev => [...prev, aiMessage]);
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error.message || 'Failed to get AI response',
            variant: 'destructive',
          });
          
          const errorMessage: Message = {
            id: `assistant-error-${Date.now()}`,
            role: 'assistant',
            content: 'I apologize, but I encountered an error processing your request. Please try again.',
            timestamp: Date.now(),
          };
          
          setMessages(prev => [...prev, errorMessage]);
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-240px)]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 mb-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}
              >
                <div className="flex items-center mb-1">
                  <span className="text-xs font-medium">
                    {message.role === 'user' ? 'You' : 'AI Assistant'}
                  </span>
                  <span className="text-xs ml-2 opacity-70 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTime(message.timestamp)}
                  </span>
                </div>
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </AnimatePresence>
      </div>
      
      <Card className="p-4 w-full">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="resize-none"
            rows={1}
          />
          <Button 
            onClick={handleSubmit} 
            disabled={isPending || !input.trim()}
            size="icon"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Helper function to format timestamp
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
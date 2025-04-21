import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWriting } from '@/context/WritingContext';
import { apiRequest } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Bot, Send, User } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function ChatGenerator() {
  const { chatText, setChatText } = useWriting();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I am your AI writing assistant. How can I help you with your writing needs today?',
      timestamp: Date.now()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const generateMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/generate-writing', { 
        originalSample: '',
        referenceUrl: '',
        topic: message,
        length: '500 words',
        style: 'Casual',
        additionalInstructions: 'Respond as an AI assistant'
      });
      return response.json();
    },
    onSuccess: (data) => {
      setIsLoading(false);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.generatedText,
          timestamp: Date.now()
        }
      ]);
    },
    onError: () => {
      setIsLoading(false);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: "I'm sorry, I encountered an error processing your request. Please try again.",
          timestamp: Date.now()
        }
      ]);
    }
  });

  // This function is called from WritingTools when the send button is clicked
  // It will be connected later. For now we'll use the scrolling chat view
  const handleSendMessage = (message: string) => {
    if (!message.trim()) return;
    
    // Add user message to chat
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'user',
        content: message,
        timestamp: Date.now()
      }
    ]);
    
    // Show typing indicator
    setIsLoading(true);
    
    // Call API to get response
    generateMutation.mutate(message);
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-290px)] bg-card rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">AI Writing Assistant</h2>
        <p className="text-sm text-muted-foreground">Chat with the AI to get help with your writing</p>
      </div>
      
      {/* Chat messages container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.map((message) => (
          <motion.div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div 
              className={`flex max-w-[80%] ${message.role === 'user' 
                ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-none' 
                : 'bg-muted text-foreground rounded-2xl rounded-tl-none'
              } px-4 py-3`}
            >
              <div>
                <div className="flex items-center mb-1">
                  <span className="mr-2">
                    {message.role === 'user' 
                      ? <User className="h-4 w-4" /> 
                      : <Bot className="h-4 w-4" />
                    }
                  </span>
                  <span className="text-xs opacity-70">
                    {message.role === 'user' ? 'You' : 'AI Assistant'} • {formatTime(message.timestamp)}
                  </span>
                </div>
                <div className="whitespace-pre-wrap">
                  {message.content.split('\n').map((paragraph, i) => (
                    <p key={i} className={i > 0 ? 'mt-2' : ''}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        
        {/* Typing indicator */}
        {isLoading && (
          <motion.div 
            className="flex justify-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="bg-muted text-foreground rounded-2xl rounded-tl-none px-4 py-3">
              <div className="flex items-center">
                <span className="text-xs flex items-center">
                  <Bot className="h-4 w-4 mr-2" />
                  <span className="typing-animation">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </span>
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Input box is now handled by the WritingTools component */}
      <style jsx>{`
        .typing-animation {
          display: inline-flex;
          align-items: center;
        }
        .dot {
          height: 6px;
          width: 6px;
          margin: 0 1px;
          background-color: currentColor;
          border-radius: 50%;
          display: inline-block;
          opacity: 0.7;
          animation: typing 1.4s infinite ease-in-out;
        }
        .dot:nth-child(1) { animation-delay: 0s; }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Bot, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';

// A very simplified chat implementation that works reliably

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function SimpleChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    role: 'assistant',
    content: 'Hello! I am your AI writing assistant. How can I help you with your writing needs today?'
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  async function handleSendMessage() {
    if (!input.trim() || isLoading) return;
    
    // Add user message to chat immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare messages for API (all previous messages plus new one)
      const apiMessages = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Call API with all messages for context
      const response = await fetch('/api/chat-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: 0, // Use 0 as special case for no persistence
          messages: apiMessages
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }
      
      const data = await response.json();
      
      // Add AI response to chat
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.aiResponse
      };
      
      // Short delay for better UX
      setTimeout(() => {
        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
      }, 500);
      
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again."
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] bg-card rounded-lg overflow-hidden border border-border shadow-sm">
      <div className="p-4 border-b border-border flex items-center">
        <Bot className="h-5 w-5 mr-2 text-primary" />
        <h2 className="text-lg font-semibold">AI Writing Assistant</h2>
      </div>
      
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div 
              className={`flex max-w-[80%] ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-none' 
                  : 'bg-muted text-card-foreground rounded-2xl rounded-tl-none'
              } px-4 py-3`}
            >
              <div className="flex flex-col">
                <div className="flex items-center mb-1 space-x-2">
                  {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  <span className="text-xs opacity-70">{message.role === 'user' ? 'You' : 'AI Assistant'}</span>
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
        
        {/* Loading indicator */}
        {isLoading && (
          <motion.div 
            className="flex justify-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="bg-muted text-card-foreground rounded-2xl rounded-tl-none px-4 py-3">
              <div className="flex items-center space-x-2">
                <Bot className="h-4 w-4" />
                <div className="flex items-center">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className="p-4 border-t border-border">
        <div className="flex space-x-2">
          <Input
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={isLoading || !input.trim()} 
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Note: CSS added directly to the component */}
    </div>
  );
}
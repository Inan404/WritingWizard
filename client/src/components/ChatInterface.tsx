import { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Clock, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAiTool, ApiMessage, MessageRole } from '@/hooks/useAiTool';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { useQuery, QueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { queryClient } from '@/lib/queryClient';

// Local UI message interface
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  sessionId: number;
}

interface ChatInterfaceProps {
  chatId?: number | null;
}

export function ChatInterface({ chatId = null }: ChatInterfaceProps) {
  // Initial message state with welcome message
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
  const messagesLoaded = useRef(false);
  const { user } = useAuth();
  
  const { mutate, isPending } = useAiTool();

  // Fetch chat messages if chatId exists AND user is authenticated
  const { data: chatMessages, isLoading: isLoadingMessages, refetch } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat-messages', chatId],
    queryFn: async () => {
      if (!chatId || !user) return [];
      console.log(`Fetching messages for chat ${chatId}`);
      try {
        const res = await fetch(`/api/chat-messages/${chatId}`);
        if (!res.ok) {
          console.error(`Error fetching chat messages: ${res.status} ${res.statusText}`);
          throw new Error('Failed to fetch chat messages');
        }
        const data = await res.json();
        console.log(`Got ${data.length} messages for chat ${chatId}:`, data);
        return data;
      } catch (error) {
        console.error('Chat messages fetch error:', error);
        throw error;
      }
    },
    enabled: !!chatId && !!user, // Only run query if chatId exists AND user is authenticated
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    staleTime: 0, // Consider data always stale
    gcTime: 0, // Don't cache data
  });

  // Load chat messages when they change or when authentication state changes
  useEffect(() => {
    // If user is not authenticated, clear messages and reset the loaded flag
    if (!user) {
      setMessages([]);
      messagesLoaded.current = false;
      return;
    }
    
    // If we have chat messages from the database
    if (chatMessages) {
      // Always process messages when:
      // 1. We haven't loaded messages yet (messagesLoaded.current is false)
      // 2. OR the number of messages has changed since last load
      // 3. OR chat ID has changed (this is handled in the dependency array)
      const shouldProcessMessages = !messagesLoaded.current || 
                                   (messages.length !== chatMessages.length && chatId !== null);
      
      if (shouldProcessMessages) {
        // Always force reset messages on chat ID change, even if array is empty
        console.log(`Processing ${chatMessages.length} messages for chat ${chatId}`);
        
        // Convert API messages to UI messages
        const uiMessages: Message[] = chatMessages.map(msg => ({
          id: `msg-${msg.id}`,
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
          timestamp: new Date(msg.createdAt || Date.now()).getTime(),
        }));
        
        // For debugging
        if (uiMessages.length > 0) {
          console.log(`Converted ${uiMessages.length} messages for rendering:`, uiMessages);
        } else {
          console.log(`No messages found for chat ${chatId}`);
        }
        
        // If we have messages, replace the current state
        if (uiMessages.length > 0) {
          setMessages(uiMessages);
        }
        // If no messages found but we have a chat ID, set an empty array
        else if (chatId !== null) {
          setMessages([]);
        }
        // Otherwise (no chat ID, no messages), use the default welcome message
        
        messagesLoaded.current = true;
      }
    }
  }, [chatMessages, messages.length, user, chatId]);

  // Reset messagesLoaded ref when chatId changes
  useEffect(() => {
    console.log(`Chat ID changed to ${chatId}, resetting messagesLoaded flag`);
    messagesLoaded.current = false;
    
    // When chatId changes and we have a new valid chatId, clear the default welcome message
    if (chatId !== null) {
      // Only clear initial welcome message if we're going to load actual messages
      const hasWelcomeMessageOnly = messages.length === 1 && messages[0].id === 'initial-message';
      if (hasWelcomeMessageOnly) {
        setMessages([]); // Clear welcome message so it doesn't appear before chat history loads
      }
      
      // Force refetch chat messages when chat ID changes
      setTimeout(() => {
        refetch();
        console.log(`Forced refetch for chat ID ${chatId}`);
      }, 100); // Small delay to allow React to process state updates first
    }
  }, [chatId, refetch, messages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async () => {
    if (!input.trim() || !user) return;
    
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    // Save user message to database if we have a chatId
    if (chatId) {
      try {
        // Save message to database
        await fetch(`/api/chat-sessions/${chatId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: 'user',
            content: input,
          }),
        });
        console.log(`Saved user message to chat session ${chatId}`);
      } catch (error) {
        console.error('Failed to save user message to database:', error);
        // Continue even if save fails
      }
    }
    
    // IMPORTANT: For Perplexity API, we must maintain strict message order:
    // 1. First message must be system (optional)
    // 2. Messages must alternate strictly between user and assistant roles
    // 3. Must end with a user message
    
    // First, add system message
    let messagesToSend: ApiMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful, friendly AI writing assistant. Provide detailed and thoughtful responses to help users with their writing needs.'
      }
    ];
    
    // Then, build conversation history from previous messages, ensuring alternating pattern
    if (messages.length > 0) {
      // Start with the most recent 10 messages to keep context but stay within token limits
      const recentMessages = [...messages].slice(-10);
      
      // Ensure we have alternating user/assistant pattern
      for (let i = 0; i < recentMessages.length; i++) {
        const msg = recentMessages[i];
        // Skip any assistant messages that would violate the alternating pattern
        if (i > 0 && recentMessages[i-1].role === msg.role) continue;
        
        messagesToSend.push({
          role: msg.role,
          content: msg.content
        });
      }
    }
    
    // Finally, add the current user message to ensure we end with a user message
    messagesToSend.push({
      role: 'user',
      content: input
    });
    
    console.log('Prepared messages for Perplexity API:', messagesToSend);
    
    // Send to AI API
    mutate(
      { 
        text: '', 
        mode: 'chat', 
        messages: messagesToSend,
        chatId: chatId,
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
          
          // Invalidate the chat messages query to ensure we have the latest data next time
          // This is particularly important when we have multiple devices or tabs accessing the chat
          if (chatId) {
            queryClient.invalidateQueries({ queryKey: ['/api/chat-messages', chatId] });
            console.log(`Invalidated cache for chat ${chatId} after new message`);
          }
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
            disabled={isPending || !input.trim() || !user}
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
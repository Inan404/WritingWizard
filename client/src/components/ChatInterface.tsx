/**
 * ChatInterface.tsx
 * 
 * This component is the AI chat interface that allows users to interact with the Perplexity AI model.
 * It displays message history, handles message sending, and manages the conversation state.
 * 
 * Features:
 * - Real-time chat with AI using Perplexity's Llama model
 * - Message history persistence through database
 * - Animated message transitions
 * - Loading states and error handling
 * 
 * Note: This component uses the useAiTool hook for API communication.
 */

import { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Clock, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAiTool, ApiMessage, MessageRole } from '@/hooks/useAiTool';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
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
  const [isPending, setIsPending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const messagesLoaded = useRef(false);
  const { user } = useAuth();
  // Using HTTP API for chat
  const { mutate } = useAiTool();
  // To track the current streaming message
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  // Fetch chat messages if chatId exists AND user is authenticated
  const { data: chatMessagesResponse, isLoading: isLoadingMessages, refetch } = useQuery<{ messages: ChatMessage[] }>({
    queryKey: ['/api/db/chat-sessions/messages', chatId],
    queryFn: async () => {
      if (!chatId || !user) return { messages: [] };
      console.log(`Fetching messages for chat ${chatId}`);
      try {
        // Use the correct endpoint with proper format - using the /api/db/ endpoint
        // which has the correct authentication checks
        const res = await fetch(`/api/db/chat-sessions/${chatId}/messages`);
        if (!res.ok) {
          console.error(`Error fetching chat messages: ${res.status} ${res.statusText}`);
          throw new Error('Failed to fetch chat messages');
        }
        const data = await res.json();
        console.log(`Got ${data.messages?.length || 0} messages for chat ${chatId}:`, data);
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
  
  // Extract actual messages array from response
  const chatMessages = chatMessagesResponse?.messages || [];

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
    
    // Mark as pending while processing
    setIsPending(true);
    
    // Add user message to UI
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
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
      // Include the previous 15 messages to maintain memory (as requested)
      const recentMessages = [...messages].slice(-30); // Get more than we need in case of filtering
      const processedMessages: Array<{role: 'user' | 'assistant', content: string}> = [];
      
      // Process messages to ensure proper alternating pattern
      let lastRole: 'user' | 'assistant' | null = null;
      
      // Go through messages in chronological order
      for (let i = 0; i < recentMessages.length; i++) {
        const msg = recentMessages[i];
        
        // Skip the welcome message (has special ID)
        if (msg.id === 'initial-message') continue;
        
        // Either the first message or a different role than the last message
        if (lastRole === null || msg.role !== lastRole) {
          processedMessages.push({
            role: msg.role,
            content: msg.content
          });
          lastRole = msg.role;
        }
        // Same role as previous - merge with the last message to maintain alternating pattern
        else if (msg.role === lastRole && processedMessages.length > 0) {
          const lastMsg = processedMessages[processedMessages.length - 1];
          lastMsg.content += '\n\n' + msg.content;
        }
      }
      
      // Take only the last 15 messages maximum (to stay within token limits)
      const limitedMessages = processedMessages.slice(-15);
      
      // Add them to our messagesToSend array
      messagesToSend.push(...limitedMessages);
      
      console.log(`Added ${limitedMessages.length} history messages to the context`);
    }
    
    // Finally, add the current user message to ensure we end with a user message
    messagesToSend.push({
      role: 'user',
      content: input
    });
    
    console.log('Prepared messages for chat:', messagesToSend);
    
    // Create a placeholder message for streaming
    const streamingId = `assistant-${Date.now()}`;
    setStreamingMessageId(streamingId);
    setStreamingContent('');
    
    // Add an empty assistant message to UI that will be filled as streaming progresses
    const initialStreamingMessage: Message = {
      id: streamingId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, initialStreamingMessage]);
    
    // Function to handle streaming updates
    const handleStreamUpdate = (text: string) => {
      setStreamingContent(prev => {
        // If this is the first update, just set it
        if (!prev) return text;
        // Otherwise append the new text
        return prev + text;
      });
      
      // Update the message in the messages array
      setMessages(prev => {
        return prev.map(msg => {
          if (msg.id === streamingId) {
            return {
              ...msg,
              content: text
            };
          }
          return msg;
        });
      });
    };
    
    // Send via HTTP REST API with streaming support
    mutate(
      { 
        text: '', 
        mode: 'chat', 
        messages: messagesToSend,
        chatId: chatId,
        onStreamUpdate: handleStreamUpdate, // Pass streaming callback
      },
      {
        onSuccess: (response) => {
          setIsPending(false);
          setStreamingMessageId(null);
          setStreamingContent(null);
          
          // Invalidate queries to refresh sidebar
          if (chatId) {
            queryClient.invalidateQueries({ queryKey: ['/api/db/chat-sessions/messages', chatId] });
            queryClient.invalidateQueries({ queryKey: ['/api/writing-chats'] });
          }
        },
        onError: (error) => {
          setIsPending(false);
          setStreamingMessageId(null);
          setStreamingContent(null);
          
          toast({
            title: 'Error',
            description: error.message || 'Failed to get AI response',
            variant: 'destructive',
          });
          
          // If we were in the middle of streaming, update the final message
          setMessages(prev => {
            return prev.map(msg => {
              if (msg.id === streamingId) {
                return {
                  ...msg,
                  content: 'I apologize, but I encountered an error processing your request. Please try again.'
                };
              }
              return msg;
            });
          });
        }
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
    <div className="flex flex-col h-full max-h-[calc(100vh-200px)] sm:max-h-[calc(100vh-240px)]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 mb-4 hover-scrollbar">
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
                className={`max-w-[95%] sm:max-w-[85%] md:max-w-[80%] rounded-lg p-2 sm:p-3 ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-foreground'
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
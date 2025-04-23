import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWriting } from '@/context/WritingContext';
import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Bot, User } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function ChatGenerator() {
  const { chatText } = useWriting();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState<number | null>(null);
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

  // Create a new chat session mutation
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/db/chat-sessions', {
        name: 'New Chat ' + new Date().toLocaleDateString()
      });
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Created new chat session with ID:', data.session.id);
      
      // Reset messages with just the welcome message
      const welcomeMessage = {
        id: '1',
        role: 'assistant' as const,
        content: 'Hello! I am your AI writing assistant. How can I help you with your writing needs today?',
        timestamp: Date.now()
      };
      
      // Clear messages and set new session ID
      setMessages([welcomeMessage]);
      setSessionId(data.session.id);
      
      // Save the welcome message
      if (data.session.id) {
        saveMessageMutation.mutate({
          sessionId: data.session.id,
          role: 'assistant',
          content: welcomeMessage.content
        });
      }
      
      // Invalidate the chat sessions query to update the sidebar
      queryClient.invalidateQueries({ queryKey: ['/api/writing-chats'] });
    },
    onError: (error) => {
      console.error('Failed to create chat session:', error);
      toast({
        title: 'Error',
        description: 'Failed to create chat session. Please try again.',
        variant: 'destructive'
      });
    }
  });
  
  // Save a chat message mutation
  const saveMessageMutation = useMutation({
    mutationFn: async ({ sessionId, role, content }: { sessionId: number, role: string, content: string }) => {
      const response = await apiRequest('POST', `/api/db/chat-sessions/${sessionId}/messages`, {
        role,
        content
      });
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Saved chat message:', data.message);
    },
    onError: (error) => {
      console.error('Failed to save chat message:', error);
    }
  });
  
  // Load existing chat messages for a session
  const loadChatMessagesMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await apiRequest('GET', `/api/db/chat-sessions/${sessionId}/messages`);
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Loaded messages for session:", data.messages.length);
      
      // Convert the messages to the format expected by the component
      const loadedMessages = data.messages.map((message: any) => ({
        id: message.id.toString(),
        role: message.role as 'user' | 'assistant',
        content: message.content,
        timestamp: new Date(message.timestamp).getTime()
      }));
      
      // Only reset messages if we actually loaded something
      if (loadedMessages.length > 0) {
        setMessages(loadedMessages);
      }
    },
    onError: (error) => {
      console.error("Failed to load chat messages:", error);
      toast({
        title: "Error",
        description: "Failed to load chat history. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Create a new session when component mounts if user is authenticated
  // or when forceNewChat is set to true
  useEffect(() => {
    const forceNewChat = sessionStorage.getItem('forceNewChat');
    const forceLoadChat = sessionStorage.getItem('forceLoadChat');
    const currentChatSessionId = sessionStorage.getItem('currentChatSessionId');
    
    if (forceNewChat === 'true') {
      // Clear the session ID and messages to start fresh
      setSessionId(null);
      setMessages([{
        id: '1',
        role: 'assistant' as const,
        content: 'Hello! I am your AI writing assistant. How can I help you with your writing needs today?',
        timestamp: Date.now()
      }]);
      
      // Remove the flags from session storage
      sessionStorage.removeItem('forceNewChat');
      sessionStorage.removeItem('forceLoadChat');
      sessionStorage.removeItem('currentChatSessionId');
      
      // Create a new session
      if (user) {
        createSessionMutation.mutate();
      }
    } 
    else if (forceLoadChat === 'true' && currentChatSessionId) {
      // Load existing chat
      const loadSessionId = parseInt(currentChatSessionId);
      setSessionId(loadSessionId);
      
      // Load messages for this session
      loadChatMessagesMutation.mutate(loadSessionId);
      
      // Remove the flags
      sessionStorage.removeItem('forceLoadChat');
      sessionStorage.removeItem('currentChatSessionId');
    } 
    else if (user && !sessionId && !sessionStorage.getItem('disableAutoCreate')) {
      // Check if this is the first load and we're not specifically trying to load an existing chat
      // Only auto-create new chat if we really want a new chat
      console.log("Auto-creating new chat session on component mount");
      createSessionMutation.mutate();
    }
  }, [user]);
  
  // Force a new check every second to detect session storage flags
  useEffect(() => {
    const checkFlags = () => {
      // Check for force new chat
      const forceNewChat = sessionStorage.getItem('forceNewChat');
      if (forceNewChat === 'true') {
        console.log("Force new chat detected - resetting chat state");
        // Reset all state
        setSessionId(null);
        setMessages([{
          id: '1',
          role: 'assistant' as const,
          content: 'Hello! I am your AI writing assistant. How can I help you with your writing needs today?',
          timestamp: Date.now()
        }]);
        
        // Remove the flag
        sessionStorage.removeItem('forceNewChat');
        sessionStorage.removeItem('forceLoadChat');
        sessionStorage.removeItem('currentChatSessionId');
        
        // Create a new session immediately
        if (user) {
          createSessionMutation.mutate();
        }
        
        return; // Don't process any more flags this interval
      }
      
      // Check for force load chat
      const forceLoadChat = sessionStorage.getItem('forceLoadChat');
      const currentChatSessionId = sessionStorage.getItem('currentChatSessionId');
      if (forceLoadChat === 'true' && currentChatSessionId) {
        console.log("Force load chat detected - loading session", currentChatSessionId);
        // Load existing chat
        const loadSessionId = parseInt(currentChatSessionId);
        
        // Only update if different from current session
        if (loadSessionId !== sessionId) {
          setSessionId(loadSessionId);
          
          // Load messages for this session
          loadChatMessagesMutation.mutate(loadSessionId);
        }
        
        // Remove the force load flag but keep the session ID
        sessionStorage.removeItem('forceLoadChat');
      }
    };
    
    // Run once immediately
    checkFlags();
    
    // And set interval to check more frequently (500ms for faster response)
    const interval = setInterval(checkFlags, 500);
    
    return () => clearInterval(interval);
  }, [loadChatMessagesMutation, user, sessionId, createSessionMutation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Listen for the custom forceNewChatEvent
  useEffect(() => {
    const forceNewChatHandler = () => {
      console.log("Received forceNewChatEvent - creating new chat");
      // Force the creation of a new chat session
      setSessionId(null);
      setMessages([{
        id: '1',
        role: 'assistant' as const,
        content: 'Hello! I am your AI writing assistant. How can I help you with your writing needs today?',
        timestamp: Date.now()
      }]);
      
      if (user) {
        createSessionMutation.mutate();
      }
    };
    
    // Add event listener
    document.addEventListener('forceNewChatEvent', forceNewChatHandler);
    
    // Remove event listener on cleanup
    return () => {
      document.removeEventListener('forceNewChatEvent', forceNewChatHandler);
    };
  }, [user, createSessionMutation]);

  const generateMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!sessionId) {
        throw new Error('No active chat session');
      }
      
      // Get all previous messages to maintain conversation context
      const previousMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Add the new user message
      const chatMessages = [
        ...previousMessages,
        { role: 'user' as const, content: message }
      ];
      
      // Use the dedicated AI chat endpoint
      const response = await apiRequest('POST', '/api/chat-generate', {
        sessionId: sessionId,
        messages: chatMessages
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      setIsLoading(false);
      const assistantResponse = {
        id: Date.now().toString(),
        role: 'assistant' as const,
        content: data.aiResponse || data.message?.content, // Accept either format
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, assistantResponse as Message]);
      
      // No need to save the assistant message as the API already does that
      
      // Invalidate the sidebar data to show updated chat list
      queryClient.invalidateQueries({ queryKey: ['/api/writing-chats'] });
    },
    onError: () => {
      setIsLoading(false);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant' as const,
          content: "I'm sorry, I encountered an error processing your request. Please try again.",
          timestamp: Date.now()
        }
      ]);
    }
  });

  // Expose handleSendMessage to window so WritingTools can access it
  useEffect(() => {
    // @ts-ignore
    window.handleChatMessage = (message: string) => {
      if (!message.trim()) return;
      
      const userMessageId = Date.now().toString();
      
      // Add user message to chat
      setMessages(prev => [
        ...prev,
        {
          id: userMessageId,
          role: 'user' as const,
          content: message,
          timestamp: Date.now()
        }
      ]);
      
      // Save message to database if we have a session
      if (sessionId) {
        saveMessageMutation.mutate({
          sessionId,
          role: 'user',
          content: message
        });
      }
      
      // Show typing indicator
      setIsLoading(true);
      
      // Call API to get response
      generateMutation.mutate(message);
    };

    return () => {
      // @ts-ignore
      delete window.handleChatMessage;
    };
  }, [generateMutation, sessionId, saveMessageMutation]);

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
              <div className="w-full">
                <div className="flex items-center mb-1">
                  <span className="mr-2 flex-shrink-0">
                    {message.role === 'user' 
                      ? <User className="h-4 w-4" /> 
                      : <Bot className="h-4 w-4" />
                    }
                  </span>
                  <span className="text-xs opacity-70">
                    {message.role === 'user' ? 'You' : 'AI Assistant'} • {formatTime(message.timestamp)}
                  </span>
                </div>
                <div className="whitespace-pre-wrap break-words overflow-hidden w-full">
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
      <style>
        {`
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
        `}
      </style>
    </div>
  );
}

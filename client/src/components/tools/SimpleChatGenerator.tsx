import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { User, Bot } from 'lucide-react';

// A simpler implementation of the chat generator with better handling of default chat

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function SimpleChatGenerator() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // State for tracking chat
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    role: 'assistant',
    content: 'Hello! I am your AI writing assistant. How can I help you with your writing needs today?',
    timestamp: Date.now()
  }]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Create a new chat session
  const createChatMutation = useMutation({
    mutationFn: async () => {
      const chatName = 'New Chat ' + new Date().toLocaleDateString();
      
      // First try with the db endpoint (try both endpoints in case one is working)
      try {
        console.log('Creating new chat session...');
        const response = await apiRequest('POST', '/api/db/chat-sessions', {
          name: chatName
        });
        return await response.json();
      } catch (error) {
        console.log('Trying fallback endpoint...');
        const response = await apiRequest('POST', '/api/chat-sessions', {
          name: chatName
        });
        return await response.json();
      }
    },
    onSuccess: (data) => {
      console.log('Chat session created:', data.session);
      // Set the session ID so we can use it for messages
      setSessionId(data.session.id);
      
      // Save the default welcome message if this is not just a reset of session
      if (isFirstLoad) {
        saveMessageMutation.mutate({
          sessionId: data.session.id,
          role: 'assistant',
          content: 'Hello! I am your AI writing assistant. How can I help you with your writing needs today?'
        });
        setIsFirstLoad(false);
      }
      
      // Refresh the chat list
      queryClient.invalidateQueries({ queryKey: ['/api/writing-chats'] });
    },
    onError: (error) => {
      console.error('Failed to create chat session:', error);
      toast({
        title: 'Error',
        description: 'Failed to create chat session',
        variant: 'destructive'
      });
    }
  });
  
  // Save a message to the chat
  const saveMessageMutation = useMutation({
    mutationFn: async ({ sessionId, role, content }: { sessionId: number, role: string, content: string }) => {
      try {
        console.log(`Saving ${role} message to session ${sessionId}`);
        // Try both endpoints
        try {
          const response = await apiRequest('POST', `/api/db/chat-sessions/${sessionId}/messages`, {
            role,
            content
          });
          return await response.json();
        } catch (dbError) {
          const response = await apiRequest('POST', `/api/chat-sessions/${sessionId}/messages`, {
            role,
            content
          });
          return await response.json();
        }
      } catch (error) {
        console.error('Error saving message:', error);
        throw error;
      }
    },
    onError: (error) => {
      console.error('Failed to save message:', error);
    }
  });
  
  // Generate AI response
  const generateResponseMutation = useMutation({
    mutationFn: async ({ sessionId, messages }: { sessionId: number, messages: any[] }) => {
      try {
        const response = await apiRequest('POST', '/api/chat-generate', {
          sessionId,
          messages
        });
        return await response.json();
      } catch (error) {
        console.error('Error generating response:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setIsLoading(false);
      
      const assistantResponse = {
        id: Date.now().toString(),
        role: 'assistant' as const,
        content: data.aiResponse || data.message?.content || "I'm not sure how to respond to that.",
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, assistantResponse]);
      
      // Scroll to bottom
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
      
      // Invalidate chat list to show updates
      queryClient.invalidateQueries({ queryKey: ['/api/writing-chats'] });
    },
    onError: (error) => {
      setIsLoading(false);
      console.error('Error generating response:', error);
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: Date.now()
      }]);
      
      toast({
        title: 'Error',
        description: 'Failed to generate AI response',
        variant: 'destructive'
      });
    }
  });
  
  // Handle new message
  function handleNewMessage(message: string) {
    if (!message.trim()) return;
    
    // Add user message to UI immediately
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: message,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Show loading indicator
    setIsLoading(true);
    
    // Scroll to bottom
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    
    // If we don't have a session ID yet, create one first
    if (!sessionId) {
      createChatMutation.mutate(undefined, {
        onSuccess: (data) => {
          const newSessionId = data.session.id;
          
          // Save user message
          saveMessageMutation.mutate({
            sessionId: newSessionId,
            role: 'user',
            content: message
          });
          
          // Get AI response with all messages
          const allMessages = messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }));
          
          // Add the user message for the API
          allMessages.push({
            role: 'user',
            content: message
          });
          
          // Generate response
          setTimeout(() => {
            generateResponseMutation.mutate({
              sessionId: newSessionId,
              messages: allMessages
            });
          }, 500); // Small delay for better UX
        }
      });
    } else {
      // We already have a session ID
      // Save user message
      saveMessageMutation.mutate({
        sessionId,
        role: 'user',
        content: message
      });
      
      // Get AI response with all messages
      const allMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Add the user message for the API
      allMessages.push({
        role: 'user',
        content: message
      });
      
      // Generate response
      setTimeout(() => {
        generateResponseMutation.mutate({
          sessionId,
          messages: allMessages
        });
      }, 500); // Small delay for better UX
    }
  }
  
  // Create session on first load
  useEffect(() => {
    if (user && !sessionId) {
      createChatMutation.mutate();
    }
  }, [user]);
  
  // Expose the handleNewMessage function to the window
  useEffect(() => {
    // @ts-ignore
    window.handleChatMessage = handleNewMessage;
    
    return () => {
      // @ts-ignore
      delete window.handleChatMessage;
    };
  }, [messages, sessionId]);
  
  // Load existing chat
  function loadChat(chatId: number) {
    setSessionId(chatId);
    
    // Load messages
    fetch(`/api/db/chat-sessions/${chatId}/messages`)
      .then(res => res.json())
      .then(data => {
        if (data.messages && data.messages.length > 0) {
          const formattedMessages = data.messages.map((msg: any) => ({
            id: msg.id.toString(),
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: new Date(msg.timestamp).getTime()
          }));
          setMessages(formattedMessages);
        } else {
          // Reset to welcome message if no messages
          setMessages([{
            id: '1',
            role: 'assistant',
            content: 'Hello! I am your AI writing assistant. How can I help you with your writing needs today?',
            timestamp: Date.now()
          }]);
        }
      })
      .catch(err => {
        console.error('Failed to load messages:', err);
        // Try fallback endpoint
        fetch(`/api/chat-sessions/${chatId}/messages`)
          .then(res => res.json())
          .then(data => {
            if (data.messages && data.messages.length > 0) {
              const formattedMessages = data.messages.map((msg: any) => ({
                id: msg.id.toString(),
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
                timestamp: new Date(msg.timestamp).getTime()
              }));
              setMessages(formattedMessages);
            }
          })
          .catch(fallbackErr => {
            console.error('Both endpoints failed to load messages:', fallbackErr);
            toast({
              title: 'Error',
              description: 'Failed to load chat messages',
              variant: 'destructive'
            });
          });
      });
  }
  
  // Handle "New Chat" button click
  function handleNewChat() {
    setSessionId(null);
    setMessages([{
      id: '1',
      role: 'assistant',
      content: 'Hello! I am your AI writing assistant. How can I help you with your writing needs today?',
      timestamp: Date.now()
    }]);
    createChatMutation.mutate();
  }
  
  // Listen for custom events
  useEffect(() => {
    // Listen for load chat event
    const handleLoadChat = (event: CustomEvent) => {
      const chatId = event.detail.chatId;
      if (chatId) {
        loadChat(chatId);
      }
    };
    
    // Listen for new chat event
    const handleForceNewChat = () => {
      handleNewChat();
    };
    
    // Add event listeners
    document.addEventListener('loadChatEvent', handleLoadChat as EventListener);
    document.addEventListener('forceNewChatEvent', handleForceNewChat);
    
    // Clean up
    return () => {
      document.removeEventListener('loadChatEvent', handleLoadChat as EventListener);
      document.removeEventListener('forceNewChatEvent', handleForceNewChat);
    };
  }, []);
  
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
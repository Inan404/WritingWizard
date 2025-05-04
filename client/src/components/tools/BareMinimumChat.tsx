import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Plus, Save } from 'lucide-react';

// Create a custom type for chat messages to ensure consistent structure
type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
};

// Props for our auto-saving chat component
interface BareMinimumChatProps {
  isDefaultChat?: boolean;
  defaultChatId?: number;
}

/**
 * A completely standalone chat component that doesn't rely on any external state management
 * or persistence. This is a last-resort solution to bypass the issues with chat persistence.
 */
export default function BareMinimumChat({ 
  isDefaultChat = false, 
  defaultChatId 
}: BareMinimumChatProps = {}) {
  // Create state for messages and input text
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-message',
      role: 'assistant',
      content: 'Hello! I am your AI writing assistant. How can I help you with your writing today?'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('Chat Session');
  const [chatSessionId, setChatSessionId] = useState<number | undefined>(defaultChatId);
  const [isSaving, setIsSaving] = useState(false);
  
  // Ref to auto-scroll the chat to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // If this is the default chat and we don't have a session ID yet, create one
  useEffect(() => {
    if (isDefaultChat && !chatSessionId) {
      console.log('Creating default chat session...');
      // Create a new chat session for the default chat
      const createDefaultSession = async () => {
        try {
          const currentDate = new Date();
          const formattedDate = `${currentDate.getMonth() + 1}/${currentDate.getDate()}/${currentDate.getFullYear()}`;
          
          const response = await fetch('/api/db/chat-sessions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              title: `Default Chat ${formattedDate}`,
              messages: []
            })
          });
          
          if (!response.ok) {
            throw new Error(`Failed to create session: ${response.status}`);
          }
          
          const result = await response.json();
          console.log('Created default chat session with ID:', result.sessionId);
          setChatSessionId(result.sessionId);
          
          // Also set the session title for display
          setSessionTitle(`Default Chat ${formattedDate}`);
          
          // Store the chat ID in sessionStorage so other components can access it
          sessionStorage.setItem('currentChatSessionId', result.sessionId.toString());
          
          // Trigger refresh of the sidebar
          const refreshEvent = new CustomEvent('refreshChatSidebar');
          window.dispatchEvent(refreshEvent);
        } catch (error) {
          console.error('Error creating default chat session:', error);
        }
      };
      
      createDefaultSession();
    }
  }, [isDefaultChat, chatSessionId]);
  
  // Auto-save messages for default chat
  const saveMessageToSession = async (messageToSave: ChatMessage) => {
    if (!isDefaultChat || !chatSessionId || messageToSave.id === 'welcome-message') {
      return;
    }
    
    try {
      setIsSaving(true);
      console.log(`Saving message to session ${chatSessionId}`);
      
      const response = await fetch(`/api/db/chat-sessions/${chatSessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: messageToSave.role,
          content: messageToSave.content
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save message: ${response.status}`);
      }
      
      console.log(`Message saved successfully to session ${chatSessionId}`);
      
      // After successfully saving a message, trigger a refresh of the sidebar
      // This ensures the chat appears in the sidebar immediately
      const refreshEvent = new CustomEvent('refreshChatSidebar');
      window.dispatchEvent(refreshEvent);
    } catch (error) {
      console.error('Error saving message to session:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle auto-scrolling
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Function to handle sending a message
  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    // Create message objects
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputText.trim()
    };

    // Clear input immediately for better UX
    setInputText('');
    
    // Add user message to UI and set loading state
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // Create chat session if this is the first message in the default chat
    if (isDefaultChat && !chatSessionId) {
      try {
        console.log('Creating default chat session for first message...');
        const currentDate = new Date();
        const formattedDate = `${currentDate.getMonth() + 1}/${currentDate.getDate()}/${currentDate.getFullYear()}`;
        const title = `Chat - ${formattedDate}`;
        
        const response = await fetch('/api/writing-chats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: title,
            inputText: userMessage.content
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to create session: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Created default chat session with ID:', result.chat.id);
        setChatSessionId(result.chat.id);
        setSessionTitle(title);
        
        // Store the chat ID in sessionStorage so other components can access it
        sessionStorage.setItem('currentChatSessionId', result.chat.id.toString());
        
        // Trigger refresh of the sidebar immediately
        const refreshEvent = new CustomEvent('refreshChatSidebar');
        window.dispatchEvent(refreshEvent);
        
        // No need to explicitly save the first message as it was included in the creation
      } catch (error) {
        console.error('Error creating default chat session:', error);
      }
    } 
    // Auto-save user message if this is the default chat and we already have a session
    else if (isDefaultChat && chatSessionId) {
      await saveMessageToSession(userMessage);
    }

    try {
      // Create a properly formatted message history for the API
      // This is essential to maintain conversation context
      const conversationHistory = messages
        .filter(msg => msg.role !== 'system') // Skip system messages for API
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      // Add the new user message to history
      conversationHistory.push({
        role: userMessage.role,
        content: userMessage.content
      });

      // Make the API call with proper conversation history
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mode: 'chat',
          text: userMessage.content,
          settings: {
            history: conversationHistory
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      // Create AI response object
      const aiMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response || "I apologize, but I couldn't generate a proper response."
      };
      
      // Add AI response to chat
      setMessages(prev => [...prev, aiMessage]);
      
      // Auto-save AI response if this is the default chat
      if (isDefaultChat) {
        await saveMessageToSession(aiMessage);
      }
    } catch (error) {
      console.error('Error in chat:', error);
      
      // Create error message object
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, there was an error processing your request. Please try again."
      };
      
      // Add error message to chat
      setMessages(prev => [...prev, errorMessage]);
      
      // We don't save error messages to the database
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChat = async () => {
    try {
      // Skip if we don't have any user messages
      const userMessages = messages.filter(m => m.role === 'user');
      if (userMessages.length === 0) {
        alert('Please have at least one conversation before saving');
        return;
      }
      
      // If this is the default chat, it's already being saved automatically
      if (isDefaultChat && chatSessionId) {
        alert('This chat is already being saved automatically as the default chat.');
        return;
      }
      
      // Make API call to save the chat session
      const response = await fetch('/api/db/chat-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: sessionTitle || `Chat ${new Date().toLocaleString()}`,
          // Filter out welcome message and format messages for the API
          messages: messages
            .filter(m => m.id !== 'welcome-message')
            .map(m => ({
              role: m.role,
              content: m.content
            }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to save chat: ${response.status}`);
      }

      const result = await response.json();
      setChatSessionId(result.sessionId);
      alert(`Chat session saved successfully! Session ID: ${result.sessionId}`);
    } catch (error) {
      console.error('Error saving chat:', error);
      alert('Failed to save chat session. Please try again.');
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
  };

  // Handle key press events (for Enter to send)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-240px)] border rounded-lg overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">AI Writing Assistant</h3>
          {isDefaultChat && chatSessionId && (
            <div className="flex items-center text-xs text-muted-foreground gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              Auto-saving
            </div>
          )}
          {isSaving && (
            <div className="flex items-center text-xs text-muted-foreground gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
              Saving...
            </div>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSaveChat}
          className="flex items-center gap-1"
        >
          <Save className="h-4 w-4" /> 
          {isDefaultChat && chatSessionId ? 'Already Saved' : 'Save Session'}
        </Button>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-card">
        {messages.map((message) => (
          <div 
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'
              }`}
            >
              <div className="whitespace-pre-wrap">
                {message.content.split('\n').map((line, i) => (
                  <p key={i} className={i > 0 ? 'mt-2' : ''}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="shrink-0">
            <Plus className="h-5 w-5" />
          </Button>
          <Input
            className="flex-1"
            placeholder="Type a message..."
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!inputText.trim() || isLoading}
            className="shrink-0"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
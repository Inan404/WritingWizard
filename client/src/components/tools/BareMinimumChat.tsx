import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Plus, Save } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

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
  // Initialize query client for cache invalidation
  const queryClient = useQueryClient();
  
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
          const sessionTitle = `Chat - ${formattedDate}`;
          
          // Use the correct endpoint and format that the sidebar expects
          const response = await fetch('/api/writing-chats', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              title: sessionTitle,
              inputText: 'Hi, I need help with my writing.'
            })
          });
          
          if (!response.ok) {
            const errorData = await response.text();
            console.error('Server response error:', response.status, errorData);
            throw new Error(`Failed to create session: ${response.status}. ${errorData}`);
          }
          
          const result = await response.json();
          if (!result || !result.chat || !result.chat.id) {
            console.error('Invalid response format:', result);
            throw new Error('Server returned invalid response format');
          }
          console.log('Created default chat session with ID:', result.chat.id);
          
          // Set proper session ID from response
          setChatSessionId(result.chat.id);
          
          // Set the session title for display
          setSessionTitle(sessionTitle);
          
          // Store the chat ID in sessionStorage so other components can access it
          sessionStorage.setItem('currentChatSessionId', result.chat.id.toString());
          
          // Invalidate the writing chats query to refresh the sidebar immediately
          queryClient.invalidateQueries({ queryKey: ['/api/writing-chats'] });
          
          console.log('Created new chat session and invalidated cache for refresh');
        } catch (error) {
          console.error('Error creating default chat session:', error);
        }
      };
      
      createDefaultSession();
    }
  }, [isDefaultChat, chatSessionId]);
  
  // Auto-save messages for default chat
  const saveMessageToSession = async (messageToSave: ChatMessage) => {
    // Skip system messages and welcome message, and don't try to save if we don't have a real session ID
    if (!isDefaultChat || !chatSessionId || messageToSave.id === 'welcome-message' || 
        messageToSave.role === 'system' || chatSessionId.toString().startsWith('temp-')) {
      return;
    }
    
    try {
      setIsSaving(true);
      console.log(`Saving message to session ${chatSessionId}`);
      
      // First check if still authenticated
      const authCheckResponse = await fetch('/api/user');
      if (!authCheckResponse.ok) {
        console.warn('Not authenticated, cannot save message');
        // Add notification only once
        if (!messages.some(msg => msg.id === 'auth-notice')) {
          setMessages(prev => [
            ...prev,
            {
              id: 'auth-notice',
              role: 'system',
              content: "Note: You're not logged in. This chat will work normally but changes won't be saved to your account."
            }
          ]);
        }
        return;
      }
      
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
        // If it's an auth error, notify the user
        if (response.status === 401 || response.status === 403) {
          // Add notification only once
          if (!messages.some(msg => msg.id === 'auth-notice')) {
            setMessages(prev => [
              ...prev,
              {
                id: 'auth-notice',
                role: 'system',
                content: "Note: You're not logged in. This chat will work normally but changes won't be saved to your account."
              }
            ]);
          }
          return;
        }
        throw new Error(`Failed to save message: ${response.status}`);
      }
      
      console.log(`Message saved successfully to session ${chatSessionId}`);
      
      // After successfully saving a message, invalidate the query to refresh the sidebar
      // This ensures the chat appears in the sidebar immediately
      queryClient.invalidateQueries({ queryKey: ['/api/writing-chats'] });
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
        
        // First check if the user is authenticated
        const authCheckResponse = await fetch('/api/user');
        if (!authCheckResponse.ok) {
          console.warn('User not authenticated, continuing in local-only mode');
          // Continue with local-only chat
          const tempId = Date.now(); // Use a number for the temporary ID
          setChatSessionId(tempId);
          setSessionTitle(title);
          
          // Add an informational message about local-only mode
          setMessages(prev => [
            ...prev,
            {
              id: 'auth-notice',
              role: 'system',
              content: "Note: You're not logged in. This chat will work normally but won't be saved to your account."
            }
          ]);
          
          return; // Skip server-side creation
        }
        
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
          const errorData = await response.text();
          console.error('Server response error:', response.status, errorData);
          
          if (response.status === 401) {
            // Authentication error - fallback to local-only mode
            const tempId = Date.now(); // Use a number for the temporary ID
            setChatSessionId(tempId);
            setSessionTitle(title);
            
            // Add an informational message about local-only mode
            setMessages(prev => [
              ...prev,
              {
                id: 'auth-notice',
                role: 'system',
                content: "Note: You're not logged in. This chat will work normally but won't be saved to your account."
              }
            ]);
            
            return; // Skip further error handling
          }
          
          throw new Error(`Failed to create session: ${response.status}. ${errorData}`);
        }
        
        const result = await response.json();
        if (!result || !result.chat || !result.chat.id) {
          console.error('Invalid response format:', result);
          throw new Error('Server returned invalid response format');
        }
        console.log('Created default chat session with ID:', result.chat.id);
        setChatSessionId(result.chat.id);
        setSessionTitle(title);
        
        // Store the chat ID in sessionStorage so other components can access it
        sessionStorage.setItem('currentChatSessionId', result.chat.id.toString());
        
        // Invalidate the writing chats query to refresh the sidebar immediately
        queryClient.invalidateQueries({ queryKey: ['/api/writing-chats'] });
        
        // No need to explicitly save the first message as it was included in the creation
      } catch (error) {
        console.error('Error creating default chat session:', error);
        
        // Fallback to local-only mode on any error
        const tempId = Date.now(); // Use a number for the temporary ID
        setChatSessionId(tempId);
        // Use the date for the title if it wasn't defined in catch block
        const currentDate = new Date();
        const fallbackTitle = `Chat - ${currentDate.getMonth() + 1}/${currentDate.getDate()}/${currentDate.getFullYear()}`;
        setSessionTitle(fallbackTitle);
        
        // Add an informational message about error
        setMessages(prev => [
          ...prev,
          {
            id: 'error-notice',
            role: 'system',
            content: "There was an error saving this chat. You can continue chatting, but this conversation may not be saved."
          }
        ]);
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
      
      // Use first user message as input text for the writing chat
      const firstUserMessage = userMessages[0].content;
      
      // Make API call to save the chat session using the writing-chats endpoint
      // which is what the sidebar expects and displays
      const response = await fetch('/api/writing-chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: sessionTitle || `Chat ${new Date().toLocaleString()}`,
          inputText: firstUserMessage
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Server response error:', response.status, errorData);
        throw new Error(`Failed to save chat: ${response.status}. ${errorData}`);
      }

      const result = await response.json();
      if (!result || !result.chat || !result.chat.id) {
        console.error('Invalid response format:', result);
        throw new Error('Server returned invalid response format');
      }
      console.log('Chat saved successfully:', result);
      
      // Set the chat session ID from the result
      setChatSessionId(result.chat.id);
      
      // Save all other messages to the session
      const remainingMessages = messages
        .filter(m => m.id !== 'welcome-message')
        .slice(1); // Skip the first message as it was already saved
        
      for (const msg of remainingMessages) {
        await fetch(`/api/db/chat-sessions/${result.chat.id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            role: msg.role,
            content: msg.content
          })
        });
      }
      
      // Invalidate the writing chats query to refresh the sidebar
      queryClient.invalidateQueries({ queryKey: ['/api/writing-chats'] });
      
      alert(`Chat session saved successfully! Session ID: ${result.chat.id}`);
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-card show-scrollbar">
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
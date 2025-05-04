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

/**
 * A completely standalone chat component that doesn't rely on any external state management
 * or persistence. This is a last-resort solution to bypass the issues with chat persistence.
 */
export default function BareMinimumChat() {
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
  
  // Ref to auto-scroll the chat to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      
      // Add AI response to chat
      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response || "I apologize, but I couldn't generate a proper response."
      }]);
    } catch (error) {
      console.error('Error in chat:', error);
      
      // Add error message to chat
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, there was an error processing your request. Please try again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChat = async () => {
    try {
      // Make API call to save the chat session
      const response = await fetch('/api/db/chat-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: sessionTitle,
          messages: messages.filter(m => m.id !== 'welcome-message') // Skip welcome message
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to save chat: ${response.status}`);
      }

      alert('Chat session saved successfully!');
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
        <h3 className="font-medium">AI Writing Assistant</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSaveChat}
          className="flex items-center gap-1"
        >
          <Save className="h-4 w-4" /> Save Session
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
}
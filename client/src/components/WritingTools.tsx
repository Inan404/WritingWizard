import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import GrammarChecker from "./tools/GrammarChecker";
import Paraphraser from "./tools/Paraphraser";
import AIChecker from "./tools/AIChecker";
import Humanizer from "./tools/Humanizer";
import { SimpleChatGenerator } from "./tools/SimpleChatGenerator";
import { useWriting, WritingTool } from "@/context/WritingContext";
import { Mic, Plus, Send } from "lucide-react";

export default function WritingTools() {
  const { activeTool, setActiveTool } = useWriting();
  const [promptText, setPromptText] = useState("");
  const [currentTool, setCurrentTool] = useState<WritingTool>(activeTool);
  
  // Simple useEffect to check for any tool change
  useEffect(() => {
    // If we're switching to a chat tool, check if we have a session ID to load
    if (activeTool === 'chat') {
      const sessionId = sessionStorage.getItem('currentChatSessionId');
      const forceLoad = sessionStorage.getItem('forceLoadChat');
      
      if (sessionId && forceLoad === 'true') {
        console.log(`Switching to chat with ID ${sessionId}`);
      }
    }
  }, [activeTool]);
  
  // Check if there's a forceNewChat flag to prioritize the chat tool
  useEffect(() => {
    const forceNewChat = sessionStorage.getItem('forceNewChat');
    if (forceNewChat === 'true') {
      console.log("Force new chat detected in WritingTools - setting active tool to chat");
      setCurrentTool('chat');
      setActiveTool('chat');
    }
    
    // Listen for custom event to force tab change to chat
    const handleForceChatTabChange = (e: CustomEvent) => {
      console.log("Force chat tab change event detected with ID:", e.detail);
      
      // Set tool to chat with high priority
      setTimeout(() => {
        // Do this with a higher priority than other state updates
        console.log("FORCE switching to chat tab!");
        setCurrentTool('chat');
        setActiveTool('chat');
        
        // Set a flag to indicate we've explicitly switched tabs via chat selection
        sessionStorage.setItem('forcedChatTabSwitch', 'true');
        
        // Force a re-render by updating a session storage item
        sessionStorage.setItem('lastChatTabForceTime', Date.now().toString());
      }, 0);
    };
    
    window.addEventListener('forceChatTabChange', handleForceChatTabChange as EventListener);
    
    return () => {
      window.removeEventListener('forceChatTabChange', handleForceChatTabChange as EventListener);
    };
  }, [setActiveTool]);
  
  // Update local state when context changes
  useEffect(() => {
    // Check if we've forced a chat tab switch - this takes priority over activeTool
    const forcedChatTabSwitch = sessionStorage.getItem('forcedChatTabSwitch');
    if (forcedChatTabSwitch === 'true') {
      console.log("Forced chat tab switch detected - prioritizing chat tab over context change");
      setCurrentTool('chat'); // Always set to chat if forced
      // Clear the flag to prevent continuous override
      sessionStorage.removeItem('forcedChatTabSwitch');
      
      // Save the current tool to session storage so other components can access it
      sessionStorage.setItem('currentTool', 'chat');
    } else {
      // Normal update from context
      setCurrentTool(activeTool);
      console.log("Active tool updated in useEffect:", activeTool);
      
      // Save the current tool to session storage so other components can access it
      sessionStorage.setItem('currentTool', activeTool);
    }
  }, [activeTool]);

  const handleTabChange = (tab: WritingTool) => {
    console.log("Tab changed to:", tab);
    
    // If switching to chat, check if there's a forceNewChat flag
    if (tab === 'chat') {
      const forceNewChat = sessionStorage.getItem('forceNewChat');
      if (forceNewChat === 'true') {
        console.log("Detected forceNewChat flag in tab change - will create a new chat");
      }
    }
    
    setActiveTool(tab);
    setCurrentTool(tab); // Set local state immediately
  };

  // Function to render the active tool component
  const renderTool = () => {
    // Check if we need to force the chat tab due to a chat selection
    const currentChatId = sessionStorage.getItem('currentChatSessionId');
    const forceLoadChat = sessionStorage.getItem('forceLoadChat');
    
    // If we have a chat ID and it's set to force load, always render the chat component
    if (currentChatId && forceLoadChat === 'true') {
      console.log("Force rendering chat component due to chat ID selection:", currentChatId);
      return <SimpleChatGenerator />;
    }
    
    // Normal rendering based on currentTool state
    console.log("Rendering tool:", currentTool);
    switch (currentTool) {
      case "grammar":
        return <GrammarChecker />;
      case "paraphrase":
        return <Paraphraser />;
      case "ai-check":
        return <AIChecker />;
      case "humanizer":
        return <Humanizer />;
      case "chat":
        return <SimpleChatGenerator />;
      default:
        return <GrammarChecker />;
    }
  };

  return (
    <div className="flex-1 container mx-auto py-4 px-4 md:px-6">
      {/* Feature Navigation Tabs */}
      <div className="flex justify-center mb-6">
        <div className="bg-muted rounded-full p-1 inline-flex">
          <button 
            onClick={() => handleTabChange("chat")} 
            className={`tab-btn ${currentTool === "chat" ? "tab-active" : ""}`}
          >
            Chat
          </button>
          <button 
            onClick={() => handleTabChange("grammar")} 
            className={`tab-btn ${currentTool === "grammar" ? "tab-active" : ""}`}
          >
            Grammar check
          </button>
          <button 
            onClick={() => handleTabChange("paraphrase")} 
            className={`tab-btn ${currentTool === "paraphrase" ? "tab-active" : ""}`}
          >
            Paraphrase
          </button>
          <button 
            onClick={() => handleTabChange("ai-check")} 
            className={`tab-btn ${currentTool === "ai-check" ? "tab-active" : ""}`}
          >
            AI check
          </button>
          <button 
            onClick={() => handleTabChange("humanizer")} 
            className={`tab-btn ${currentTool === "humanizer" ? "tab-active" : ""}`}
          >
            Humanizer
          </button>
        </div>
      </div>

      {/* Feature Content Area */}
      <div className="mb-20">
        {renderTool()}
      </div>
      
      {/* Chat Input Component - Show for Chat tab or when a chat is forced loaded */}
      {(currentTool === "chat" || (sessionStorage.getItem('currentChatSessionId') && sessionStorage.getItem('forceLoadChat') === 'true')) && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-full max-w-3xl px-4">
          <motion.div 
            className="relative bg-card rounded-full shadow-lg"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <button className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <Plus className="h-5 w-5" />
            </button>
            <input 
              type="text" 
              placeholder="Type a message..." 
              className="w-full pl-12 pr-14 py-3 border-0 focus:ring-0 rounded-full bg-card"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && promptText.trim()) {
                  // Keep a local copy of the message text
                  const messageText = promptText.trim();
                  
                  // Clear input immediately for better UX
                  setPromptText('');
                  
                  // Send message via global function
                  console.log('Sending message:', messageText);
                  
                  // Ensure we have a valid chat session
                  if (!sessionStorage.getItem('currentChatSessionId')) {
                    console.log('No active chat session - creating one first');
                    // Create a custom event to notify we need a new chat
                    const forceNewChatEvent = new CustomEvent('forceNewChatEvent');
                    document.dispatchEvent(forceNewChatEvent);
                    
                    // Wait a moment for the chat to be created then send message
                    setTimeout(() => {
                      // @ts-ignore
                      if (window.handleChatMessage) {
                        // @ts-ignore
                        window.handleChatMessage(messageText);
                      }
                    }, 300);
                  } else {
                    // Send message directly if we already have a session
                    // @ts-ignore
                    if (window.handleChatMessage) {
                      // @ts-ignore
                      window.handleChatMessage(messageText);
                    }
                  }
                }
              }}
            />
            <button 
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-primary hover:text-primary/80"
              onClick={() => {
                if (promptText.trim()) {
                  // Keep a local copy of the message text
                  const messageText = promptText.trim();
                  
                  // Clear input immediately for better UX
                  setPromptText('');
                  
                  // Send message via global function
                  console.log('Sending message:', messageText);
                  
                  // Ensure we have a valid chat session
                  if (!sessionStorage.getItem('currentChatSessionId')) {
                    console.log('No active chat session - creating one first');
                    // Create a custom event to notify we need a new chat
                    const forceNewChatEvent = new CustomEvent('forceNewChatEvent');
                    document.dispatchEvent(forceNewChatEvent);
                    
                    // Wait a moment for the chat to be created then send message
                    setTimeout(() => {
                      // @ts-ignore
                      if (window.handleChatMessage) {
                        // @ts-ignore
                        window.handleChatMessage(messageText);
                      }
                    }, 300);
                  } else {
                    // Send message directly if we already have a session
                    // @ts-ignore
                    if (window.handleChatMessage) {
                      // @ts-ignore
                      window.handleChatMessage(messageText);
                    }
                  }
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

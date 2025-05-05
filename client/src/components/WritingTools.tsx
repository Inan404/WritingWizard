import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import GrammarCheckerSimple from "./tools/GrammarCheckerSimple";
import Paraphraser from "./tools/Paraphraser";
import AIChecker from "./tools/AIChecker";
import Humanizer from "./tools/Humanizer";
import BareMinimumChat from "./tools/BareMinimumChat";
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
      // Pass the chat ID as a prop - this is for an existing chat session
      return <BareMinimumChat isDefaultChat={false} defaultChatId={Number(currentChatId)} />;
    }
    
    // Normal rendering based on currentTool state
    console.log("Rendering tool:", currentTool);
    switch (currentTool) {
      case "grammar":
        return <GrammarCheckerSimple />;
      case "paraphrase":
        return <Paraphraser />;
      case "ai-check":
        return <AIChecker />;
      case "humanizer":
        return <Humanizer />;
      case "chat":
        return <BareMinimumChat isDefaultChat={true} />;
      default:
        return <GrammarCheckerSimple />;
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
      
      {/* We removed the input component here as it's now integrated within SimpleChat */}
    </div>
  );
}

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import GrammarChecker from "./tools/GrammarChecker";
import Paraphraser from "./tools/Paraphraser";
import AIChecker from "./tools/AIChecker";
import Humanizer from "./tools/Humanizer";
import ChatGenerator from "./tools/ChatGenerator";
import { useWriting, WritingTool } from "@/context/WritingContext";
import { Mic, Plus } from "lucide-react";

export default function WritingTools() {
  const { activeTool, setActiveTool } = useWriting();
  const [promptText, setPromptText] = useState("");
  const [currentTool, setCurrentTool] = useState<WritingTool>(activeTool);

  // Update local state when context changes
  useEffect(() => {
    setCurrentTool(activeTool);
    console.log("Active tool updated in useEffect:", activeTool);
  }, [activeTool]);

  const handleTabChange = (tab: WritingTool) => {
    console.log("Tab changed to:", tab);
    setActiveTool(tab);
    setCurrentTool(tab); // Set local state immediately
  };

  // Function to render the active tool component
  const renderTool = () => {
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
        return <ChatGenerator />;
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

      {/* Debug info */}
      <div className="text-xs text-muted-foreground mb-2">
        <pre>Context activeTool: {activeTool}</pre>
        <pre>Local currentTool: {currentTool}</pre>
      </div>

      {/* Feature Content Area */}
      <div className="mb-20">
        {renderTool()}
      </div>

      {/* Chat Input Component */}
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
            placeholder="Ask anything..." 
            className="w-full pl-12 pr-14 py-3 border-0 focus:ring-0 rounded-full bg-card"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
          />
          <button className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <Mic className="h-5 w-5" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}

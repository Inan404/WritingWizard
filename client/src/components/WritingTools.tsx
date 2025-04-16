import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

  // Animation variants
  const tabVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
  };

  const handleTabChange = (tab: WritingTool) => {
    setActiveTool(tab);
  };

  return (
    <div className="flex-1 container mx-auto py-4 px-4 md:px-6">
      {/* Feature Navigation Tabs */}
      <motion.div 
        className="flex justify-center mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-muted rounded-full p-1 inline-flex">
          <button 
            onClick={() => handleTabChange("chat")} 
            className={`tab-btn ${activeTool === "chat" ? "tab-active" : ""}`}
          >
            Chat
          </button>
          <button 
            onClick={() => handleTabChange("grammar")} 
            className={`tab-btn ${activeTool === "grammar" ? "tab-active" : ""}`}
          >
            Grammar check
          </button>
          <button 
            onClick={() => handleTabChange("paraphrase")} 
            className={`tab-btn ${activeTool === "paraphrase" ? "tab-active" : ""}`}
          >
            Paraphrase
          </button>
          <button 
            onClick={() => handleTabChange("ai-check")} 
            className={`tab-btn ${activeTool === "ai-check" ? "tab-active" : ""}`}
          >
            AI check
          </button>
          <button 
            onClick={() => handleTabChange("humanizer")} 
            className={`tab-btn ${activeTool === "humanizer" ? "tab-active" : ""}`}
          >
            Humanizer
          </button>
        </div>
      </motion.div>

      {/* Feature Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTool}
          variants={tabVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {activeTool === "grammar" && <GrammarChecker />}
          {activeTool === "paraphrase" && <Paraphraser />}
          {activeTool === "ai-check" && <AIChecker />}
          {activeTool === "humanizer" && <Humanizer />}
          {activeTool === "chat" && <ChatGenerator />}
        </motion.div>
      </AnimatePresence>

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

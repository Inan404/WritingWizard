import { useState } from "react";
import Header from "@/components/Header";
import ToolTab from "@/components/ui/ToolTab";
import GrammarChecker from "@/components/tools/GrammarChecker";
import Paraphraser from "@/components/tools/Paraphraser";
import AIChecker from "@/components/tools/AIChecker";
import Humanizer from "@/components/tools/Humanizer";
import ChatGenerator from "@/components/tools/ChatGenerator";
import { motion } from "framer-motion";

type Tool = 'chat' | 'grammar' | 'paraphrase' | 'ai-check' | 'humanizer';

export default function Dashboard() {
  const [activeTool, setActiveTool] = useState<Tool>('grammar');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 transition-colors duration-200 dark:bg-gray-900 dark:text-gray-100">
      <Header />
      
      <main className="flex-1 p-4 max-w-7xl mx-auto w-full">
        {/* Tool Tabs */}
        <motion.div 
          className="flex justify-center mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-full p-1 shadow-sm flex">
            <ToolTab 
              name="chat" 
              label="Chat" 
              isActive={activeTool === 'chat'} 
              onClick={() => setActiveTool('chat')} 
            />
            <ToolTab 
              name="grammar" 
              label="Grammar check" 
              isActive={activeTool === 'grammar'} 
              onClick={() => setActiveTool('grammar')} 
            />
            <ToolTab 
              name="paraphrase" 
              label="Paraphrase" 
              isActive={activeTool === 'paraphrase'} 
              onClick={() => setActiveTool('paraphrase')} 
            />
            <ToolTab 
              name="ai-check" 
              label="AI check" 
              isActive={activeTool === 'ai-check'} 
              onClick={() => setActiveTool('ai-check')} 
            />
            <ToolTab 
              name="humanizer" 
              label="Humanizer" 
              isActive={activeTool === 'humanizer'} 
              onClick={() => setActiveTool('humanizer')} 
            />
          </div>
        </motion.div>

        {/* Tool Content */}
        <motion.div
          key={activeTool}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {activeTool === 'grammar' && <GrammarChecker />}
          {activeTool === 'paraphrase' && <Paraphraser />}
          {activeTool === 'ai-check' && <AIChecker />}
          {activeTool === 'humanizer' && <Humanizer />}
          {activeTool === 'chat' && <ChatGenerator />}
        </motion.div>

        {/* Chat Input */}
        <div className="mt-8 relative w-full max-w-2xl mx-auto">
          <div className="relative">
            <button className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
            <input
              type="text"
              placeholder="Ask anything..."
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full py-3 pl-12 pr-12 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-gray-200"
            />
            <button className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

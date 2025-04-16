import { useEffect } from "react";
import MainHeader from "@/components/MainHeader";
import WritingTools from "@/components/WritingTools";
import { motion } from "framer-motion";
import { useWriting } from "@/context/WritingContext";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

interface WritingChat {
  id: number;
  rawText: string;
  grammarResult: string | null;
  paraphraseResult: string | null;
  aiCheckResult: string | null;
  humanizeResult: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function Dashboard() {
  const { setActiveTool } = useWriting();

  // Fetch writing chats
  const { data: writingChatsData } = useQuery<{ chats: WritingChat[] }>({
    queryKey: ['/api/writing-chats'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleToolSelect = (tool: "chat" | "grammar" | "paraphrase" | "ai-check" | "humanizer") => {
    setActiveTool(tool);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <MainHeader />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <motion.aside 
          className="w-64 border-r border-border p-4 hidden md:block overflow-y-auto"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-lg font-bold text-primary mb-4">Dashboard</div>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Reading</h3>
              <div className="text-sm text-muted-foreground">
                <p className="mb-1">Previous 7 days</p>
                <ul className="space-y-2">
                  <li onClick={() => handleToolSelect("grammar")} className="cursor-pointer hover:text-primary">Introduction to Human Analysis</li>
                  <li onClick={() => handleToolSelect("grammar")} className="cursor-pointer hover:text-primary">Introduction to Neural Networks</li>
                </ul>
                
                <p className="mt-3 mb-1">Previous month</p>
                <ul className="space-y-2">
                  <li onClick={() => handleToolSelect("grammar")} className="cursor-pointer hover:text-primary">Introduction to Human Cognition</li>
                </ul>
                
                <p className="mt-3 mb-1">January</p>
                <ul className="space-y-2">
                  <li onClick={() => handleToolSelect("grammar")} className="cursor-pointer hover:text-primary">Introduction to Human Psychology</li>
                  <li onClick={() => handleToolSelect("grammar")} className="cursor-pointer hover:text-primary">Introduction to Human Behavior</li>
                </ul>
                
                <button className="text-primary mt-3">View more</button>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Writing</h3>
              <div className="text-sm text-muted-foreground">
                <p className="mb-1">Previous 7 days</p>
                <motion.ul 
                  className="space-y-2"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {writingChatsData && writingChatsData.chats.length > 0 ? (
                    writingChatsData.chats.slice(0, 3).map((chat) => (
                      <motion.li 
                        key={chat.id} 
                        onClick={() => handleToolSelect("grammar")} 
                        className="cursor-pointer hover:text-primary truncate"
                        variants={itemVariants}
                      >
                        {chat.name || `Chat ${chat.id}`}
                      </motion.li>
                    ))
                  ) : (
                    <motion.li variants={itemVariants}>Introduction to Human Analysis</motion.li>
                  )}
                  <motion.li 
                    onClick={() => handleToolSelect("grammar")} 
                    className="cursor-pointer hover:text-primary"
                    variants={itemVariants}
                  >
                    Introduction to Neural Networks
                  </motion.li>
                </motion.ul>
                
                <p className="mt-3 mb-1">Previous month</p>
                <ul className="space-y-2">
                  <li onClick={() => handleToolSelect("grammar")} className="cursor-pointer hover:text-primary">Introduction to Human Cognition</li>
                </ul>
                
                <p className="mt-3 mb-1">January</p>
                <ul className="space-y-2">
                  <li onClick={() => handleToolSelect("grammar")} className="cursor-pointer hover:text-primary">Introduction to Human Machine Learning</li>
                  <li onClick={() => handleToolSelect("grammar")} className="cursor-pointer hover:text-primary">Introduction to Human Analytics</li>
                </ul>
                
                <button className="text-primary mt-3">View more</button>
              </div>
            </div>
          </div>
          
          <div className="mt-auto pt-4 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Privacy</span>
              <span>Terms & Condition</span>
            </div>
          </div>
        </motion.aside>
        
        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <WritingTools />
        </div>
      </div>
    </div>
  );
}

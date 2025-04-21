import { useEffect, useState } from "react";
import MainHeader from "@/components/MainHeader";
import WritingTools from "@/components/WritingTools";
import { motion, AnimatePresence } from "framer-motion";
import { useWriting } from "@/context/WritingContext";
import { useQuery } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/context/ThemeContext";

interface WritingChat {
  id: number;
  name?: string;
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
  const { user } = useAuth();
  const { theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch writing chats
  const { data: writingChatsData } = useQuery<{ chats: WritingChat[] }>({
    queryKey: ['/api/writing-chats'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleToolSelect = (tool: "chat" | "grammar" | "paraphrase" | "ai-check" | "humanizer") => {
    setActiveTool(tool);
    if (windowWidth < 768) {
      setSidebarOpen(false);
    }
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
      
      {/* Mobile Sidebar Toggle */}
      <div className="md:hidden p-2 border-b border-border flex items-center justify-between">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mr-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-medium">{user?.username || 'User'}'s Dashboard</span>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black z-20 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>
        
        {/* Sidebar: Desktop (always visible) & Mobile (conditional) */}
        <AnimatePresence>
          {(sidebarOpen || windowWidth >= 768) && (
            <motion.aside 
              className={`${sidebarOpen ? 'fixed z-30 left-0 top-0 h-full' : 'hidden'} w-64 bg-background border-r border-border p-4 md:relative md:block overflow-y-auto`}
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-bold text-primary">Dashboard</div>
                {sidebarOpen && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSidebarOpen(false)} 
                    className="md:hidden"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                )}
              </div>
              
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
                      {writingChatsData && writingChatsData.chats && writingChatsData.chats.length > 0 ? (
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
                        <motion.li variants={itemVariants}>
                          Sample Essay on Climate Change
                        </motion.li>
                      )}
                    </motion.ul>
                    
                    <p className="mt-3 mb-1">Previous month</p>
                    <ul className="space-y-2">
                      <li onClick={() => handleToolSelect("grammar")} className="cursor-pointer hover:text-primary">
                        Introduction to Human Cognition
                      </li>
                    </ul>
                    
                    <p className="mt-3 mb-1">January</p>
                    <ul className="space-y-2">
                      <li onClick={() => handleToolSelect("grammar")} className="cursor-pointer hover:text-primary">
                        Research Paper on Artificial Intelligence
                      </li>
                    </ul>
                    
                    <button className="text-primary mt-3">View more</button>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-4 text-xs text-muted-foreground border-t border-border">
                <div className="flex justify-between">
                  <span className="hover:text-primary cursor-pointer">Privacy</span>
                  <span className="hover:text-primary cursor-pointer">Terms</span>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
        
        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <WritingTools />
        </div>
      </div>
    </div>
  );
}

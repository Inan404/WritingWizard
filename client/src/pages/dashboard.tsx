import { useState, useEffect } from "react";
import MainHeader from "@/components/MainHeader";
import WritingTools from "@/components/WritingTools";
import { useWriting } from "@/context/WritingContext";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Menu, X, Star, StarOff, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/ui/theme-provider";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface WritingChat {
  id: number;
  name?: string;
  title?: string;
  inputText?: string;
  rawText?: string;
  grammarResult: string | null;
  paraphraseResult: string | null;
  aiCheckResult: string | null;
  humanizeResult: string | null;
  isFavorite?: boolean;
  userId?: number;
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

  // Fetch writing chats from authenticated endpoint
  const { data: writingChatsData, isLoading } = useQuery<{ chats: WritingChat[] }>({
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

  const formatDate = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch (e) {
      return "Recently";
    }
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
              className={`${sidebarOpen ? 'fixed z-30 left-0 top-0 h-full' : 'hidden'} w-64 bg-background border-r border-border md:relative md:block overflow-y-auto`}
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.3 }}
            >
              <ScrollArea className="h-full">
                <div className="p-4">
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

                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-sm">MY DOCUMENTS</h3>
                    <Button variant="ghost" size="sm" className="h-8 px-2">
                      <span className="sr-only">New Document</span>
                      <span className="text-xs">+</span>
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center mb-2">
                        <Star className="h-4 w-4 mr-1 text-warning" />
                        <h4 className="text-xs font-medium uppercase">Favorites</h4>
                      </div>
                      <div className="pl-1">
                        <motion.ul 
                          className="space-y-2"
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          {writingChatsData?.chats?.filter(chat => chat.isFavorite)?.map((chat) => (
                            <motion.li 
                              key={`fav-${chat.id}`} 
                              onClick={() => handleToolSelect("grammar")} 
                              className="group cursor-pointer text-sm hover:text-primary flex items-center"
                              variants={itemVariants}
                            >
                              <FileText className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{chat.title || chat.name || `Document ${chat.id}`}</span>
                            </motion.li>
                          ))}
                          {(!writingChatsData?.chats || !writingChatsData.chats.some(chat => chat.isFavorite)) && (
                            <motion.li 
                              variants={itemVariants}
                              className="text-xs text-muted-foreground italic"
                            >
                              No favorites yet
                            </motion.li>
                          )}
                        </motion.ul>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center mb-2">
                        <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                        <h4 className="text-xs font-medium uppercase">Recent</h4>
                      </div>
                      <div className="pl-1">
                        <motion.ul 
                          className="space-y-2"
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          {isLoading ? (
                            <motion.li variants={itemVariants} className="text-xs text-muted-foreground">
                              Loading documents...
                            </motion.li>
                          ) : writingChatsData?.chats && writingChatsData.chats.length > 0 ? (
                            writingChatsData.chats.slice(0, 5).map((chat) => (
                              <motion.li 
                                key={`rec-${chat.id}`} 
                                onClick={() => handleToolSelect("grammar")} 
                                className="group cursor-pointer text-sm hover:text-primary"
                                variants={itemVariants}
                              >
                                <div className="flex items-center">
                                  <FileText className="h-3 w-3 mr-1 flex-shrink-0" />
                                  <span className="truncate">{chat.title || chat.name || `Document ${chat.id}`}</span>
                                </div>
                                <div className="text-xs text-muted-foreground ml-4">
                                  {formatDate(chat.updatedAt)}
                                </div>
                              </motion.li>
                            ))
                          ) : (
                            <motion.li variants={itemVariants} className="text-xs text-muted-foreground italic">
                              No recent documents
                            </motion.li>
                          )}
                        </motion.ul>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center mb-2">
                        <h4 className="text-xs font-medium uppercase">All Documents</h4>
                      </div>
                      <div className="pl-1">
                        <motion.ul 
                          className="space-y-2"
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          {isLoading ? (
                            <motion.li variants={itemVariants} className="text-xs text-muted-foreground">
                              Loading documents...
                            </motion.li>
                          ) : writingChatsData?.chats && writingChatsData.chats.length > 0 ? (
                            writingChatsData.chats.map((chat) => (
                              <motion.li 
                                key={`all-${chat.id}`} 
                                onClick={() => handleToolSelect("grammar")} 
                                className="group cursor-pointer text-sm hover:text-primary flex items-center justify-between"
                                variants={itemVariants}
                              >
                                <div className="flex items-center">
                                  <FileText className="h-3 w-3 mr-1 flex-shrink-0" />
                                  <span className="truncate">{chat.title || chat.name || `Document ${chat.id}`}</span>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  {chat.isFavorite ? <StarOff className="h-3 w-3" /> : <Star className="h-3 w-3" />}
                                </Button>
                              </motion.li>
                            ))
                          ) : (
                            <motion.li variants={itemVariants} className="text-xs text-muted-foreground italic">
                              No documents found
                            </motion.li>
                          )}
                        </motion.ul>
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="flex justify-between text-xs text-muted-foreground mb-4">
                    <Link href="/privacy" className="hover:text-primary">Privacy</Link>
                    <Link href="/terms" className="hover:text-primary">Terms</Link>
                    <Link href="/help" className="hover:text-primary">Help</Link>
                  </div>
                </div>
              </ScrollArea>
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

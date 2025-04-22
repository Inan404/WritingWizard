import { useState, useEffect } from "react";
import MainHeader from "@/components/MainHeader";
import WritingTools from "@/components/WritingTools";
import { useWriting } from "@/context/WritingContext";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Menu, X, Star, PlusCircle, Clock, FileText, Pencil, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/ui/theme-provider";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

interface WritingChat {
  id: number;
  title?: string;
  inputText?: string;
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

  const formatDate = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch (e) {
      return "Recently";
    }
  };

  const handleCreateNewDocument = () => {
    // TODO: Implement creating a new document
    console.log("Create new document");
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
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-4">
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

                <Button
                  onClick={handleCreateNewDocument}
                  className="mx-3 mb-4"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Document
                </Button>
                
                <div className="overflow-y-auto flex-1 px-3 pb-4">
                  {/* FAVORITES section */}
                  <div className="mb-4">
                    <div className="flex items-center mb-2 text-xs font-semibold text-muted-foreground">
                      <Star className="h-4 w-4 mr-1 text-yellow-400" />
                      <span className="uppercase">FAVORITES</span>
                    </div>
                    
                    {isLoading ? (
                      <div className="text-xs italic text-muted-foreground px-2">Loading...</div>
                    ) : writingChatsData?.chats?.filter(chat => chat.isFavorite)?.length > 0 ? (
                      <ul>
                        {writingChatsData.chats
                          .filter(chat => chat.isFavorite)
                          .map(chat => (
                            <li 
                              key={`fav-${chat.id}`}
                              onClick={() => handleToolSelect("grammar")}
                              className="cursor-pointer text-sm hover:bg-muted p-2 rounded-md mb-1 transition-colors flex items-center"
                            >
                              <FileText className="h-4 w-4 mr-2 text-primary/70" />
                              <span className="truncate">{chat.title || `Document ${chat.id}`}</span>
                            </li>
                          ))
                        }
                      </ul>
                    ) : (
                      <div className="text-sm italic text-muted-foreground px-2">No favorites yet</div>
                    )}
                  </div>
                  
                  {/* RECENT section */}
                  <div className="mb-4">
                    <div className="flex items-center mb-2 text-xs font-semibold text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      <span className="uppercase">RECENT</span>
                    </div>
                    
                    {isLoading ? (
                      <div className="text-xs italic text-muted-foreground px-2">Loading...</div>
                    ) : writingChatsData?.chats?.length > 0 ? (
                      <ul>
                        {writingChatsData.chats
                          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                          .slice(0, 5)
                          .map(chat => (
                            <li 
                              key={`recent-${chat.id}`}
                              onClick={() => handleToolSelect("grammar")}
                              className="cursor-pointer text-sm hover:bg-muted p-2 rounded-md mb-1 transition-colors"
                            >
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span className="truncate">{chat.title || `Document ${chat.id}`}</span>
                              </div>
                              <div className="text-xs text-muted-foreground ml-6 mt-1">
                                {formatDate(chat.updatedAt)}
                              </div>
                            </li>
                          ))
                        }
                      </ul>
                    ) : (
                      <div className="text-sm italic text-muted-foreground px-2">No recent documents</div>
                    )}
                  </div>
                  
                  {/* ALL DOCUMENTS section */}
                  <div>
                    <div className="flex items-center mb-2 text-xs font-semibold text-muted-foreground">
                      <span className="uppercase">ALL DOCUMENTS</span>
                    </div>
                    
                    {isLoading ? (
                      <div className="text-xs italic text-muted-foreground px-2">Loading...</div>
                    ) : writingChatsData?.chats?.length > 0 ? (
                      <ul>
                        {writingChatsData.chats.map(chat => (
                          <li 
                            key={`all-${chat.id}`}
                            onClick={() => handleToolSelect("grammar")}
                            className="cursor-pointer text-sm hover:bg-muted p-2 rounded-md mb-1 transition-colors group flex items-center justify-between"
                          >
                            <div className="flex items-center flex-1 truncate">
                              <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-muted-foreground" />
                              <span className="truncate">{chat.title || `Document ${chat.id}`}</span>
                            </div>
                            {chat.isFavorite && <Star className="h-3 w-3 text-yellow-400 ml-1 flex-shrink-0" />}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm italic text-muted-foreground px-2">No documents found</div>
                    )}
                  </div>
                </div>
                
                <div className="mt-auto border-t border-border p-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-4">
                    <Link href="/privacy" className="hover:text-primary">Privacy</Link>
                    <Link href="/terms" className="hover:text-primary">Terms</Link>
                    <Link href="/help" className="hover:text-primary">Help</Link>
                  </div>
                  <Button variant="outline" size="sm" className="w-full flex items-center">
                    <Settings className="h-3 w-3 mr-2" />
                    Settings
                  </Button>
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

import { useState, useEffect } from "react";
import MainHeader from "@/components/MainHeader";
import WritingTools from "@/components/WritingTools";
import { useWriting } from "@/context/WritingContext";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Menu, X, Star, PlusCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/ui/theme-provider";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Separator } from "@/components/ui/separator";

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

// Sample document titles
const sampleTitles = [
  "Essay on Climate Change",
  "Research on Artificial Intelligence",
  "Analysis of Economic Trends",
  "Book Review: 1984",
  "Comparative Study of Programming Languages",
  "Understanding Blockchain Technology",
  "The Impact of Social Media on Society",
  "Principles of Machine Learning"
];

// Function to generate a random title
const generateRandomTitle = () => {
  return sampleTitles[Math.floor(Math.random() * sampleTitles.length)];
};

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
  const { data: writingChatsData, isLoading, refetch } = useQuery<{ chats: WritingChat[] }>({
    queryKey: ['/api/writing-chats'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleToolSelect = (tool: "chat" | "grammar" | "paraphrase" | "ai-check" | "humanizer") => {
    setActiveTool(tool);
    if (windowWidth < 768) {
      setSidebarOpen(false);
    }
  };

  // Sample data for demonstration
  const dummyChats = Array(5).fill(null).map((_, index) => ({
    id: index + 1,
    title: generateRandomTitle(),
    createdAt: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30).toISOString(),
    updatedAt: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24).toISOString(),
    isFavorite: Math.random() > 0.7,
    grammarResult: null,
    paraphraseResult: null,
    aiCheckResult: null,
    humanizeResult: null
  }));

  // Use actual data if available, otherwise use dummy data
  const chats = (writingChatsData?.chats && writingChatsData.chats.length > 0) 
    ? writingChatsData.chats 
    : dummyChats;

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
              <div className="flex flex-col h-full p-4">
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

                <div className="flex justify-between items-center my-4">
                  <h3 className="font-semibold text-sm">MY DOCUMENTS</h3>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={handleCreateNewDocument}
                    className="h-6 w-6 rounded-full hover:bg-muted"
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-6 flex-1">
                  {/* Favorites section */}
                  <div>
                    <div className="flex items-center mb-2 text-xs font-semibold text-muted-foreground">
                      <Star className="h-4 w-4 mr-1 text-yellow-400" />
                      <span className="uppercase">FAVORITES</span>
                    </div>
                    
                    {isLoading ? (
                      <div className="text-xs italic text-muted-foreground">Loading...</div>
                    ) : chats.filter(chat => chat.isFavorite).length > 0 ? (
                      <ul className="space-y-2">
                        {chats
                          .filter(chat => chat.isFavorite)
                          .map(chat => (
                            <li 
                              key={`fav-${chat.id}`}
                              onClick={() => handleToolSelect("grammar")}
                              className="cursor-pointer text-sm hover:bg-muted p-1 px-2 rounded transition-colors"
                            >
                              {chat.title || `Chat ${chat.id}`}
                            </li>
                          ))
                        }
                      </ul>
                    ) : (
                      <div className="text-sm italic text-muted-foreground">No favorites yet</div>
                    )}
                  </div>
                  
                  {/* Recent section */}
                  <div>
                    <div className="flex items-center mb-2 text-xs font-semibold text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      <span className="uppercase">RECENT</span>
                    </div>
                    
                    {isLoading ? (
                      <div className="text-xs italic text-muted-foreground">Loading...</div>
                    ) : chats.length > 0 ? (
                      <ul className="space-y-2">
                        {chats
                          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                          .slice(0, 5)
                          .map(chat => (
                            <li 
                              key={`recent-${chat.id}`}
                              onClick={() => handleToolSelect("grammar")}
                              className="cursor-pointer text-sm hover:bg-muted p-1 px-2 rounded transition-colors"
                            >
                              {chat.title || `Chat ${chat.id}`}
                            </li>
                          ))
                        }
                      </ul>
                    ) : (
                      <div className="text-sm italic text-muted-foreground">No recent documents</div>
                    )}
                  </div>
                  
                  {/* All Documents section */}
                  <div>
                    <div className="flex items-center mb-2 text-xs font-semibold text-muted-foreground">
                      <span className="uppercase">ALL DOCUMENTS</span>
                    </div>
                    
                    {isLoading ? (
                      <div className="text-xs italic text-muted-foreground">Loading...</div>
                    ) : chats.length > 0 ? (
                      <ul className="space-y-2">
                        {chats.map(chat => (
                          <li 
                            key={`all-${chat.id}`}
                            onClick={() => handleToolSelect("grammar")}
                            className="cursor-pointer text-sm hover:bg-muted p-1 px-2 rounded transition-colors flex items-center justify-between"
                          >
                            <span className="truncate">{chat.title || `Chat ${chat.id}`}</span>
                            {chat.isFavorite && <Star className="h-3 w-3 text-yellow-400 ml-1 flex-shrink-0" />}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm italic text-muted-foreground">No documents found</div>
                    )}
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="flex justify-between text-xs text-muted-foreground py-2">
                  <Link href="/privacy" className="hover:text-primary">Privacy</Link>
                  <Link href="/terms" className="hover:text-primary">Terms</Link>
                  <Link href="/help" className="hover:text-primary">Help</Link>
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

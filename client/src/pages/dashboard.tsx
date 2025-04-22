import { useState, useEffect } from "react";
import MainHeader from "@/components/MainHeader";
import WritingTools from "@/components/WritingTools";
import { useWriting } from "@/context/WritingContext";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Menu, X, Star, PlusCircle, Clock, FileText, Pencil, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/ui/theme-provider";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
  const queryClient = useQueryClient();
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
  
  // Safely handle the chat data
  const chats = writingChatsData?.chats || [];

  // Import context hooks
  const { 
    setGrammarText, 
    setParaphraseText, 
    setAiCheckText, 
    setHumanizerText,
    setChatText
  } = useWriting();
  
  const handleToolSelect = (tool: "chat" | "grammar" | "paraphrase" | "ai-check" | "humanizer", chatId?: number) => {
    setActiveTool(tool);
    
    // If chatId is provided, load that specific entry
    if (chatId) {
      // Find the chat in the data
      const selectedChat = chats.find(chat => chat.id === chatId);
      if (selectedChat) {
        console.log(`Loading chat ID: ${chatId}`);
        
        // Load chat data based on the tool being selected
        if (tool === "grammar" && selectedChat.inputText) {
          try {
            // Store the entry ID in session storage
            sessionStorage.setItem('currentGrammarEntryId', chatId.toString());
            
            if (selectedChat.grammarResult) {
              const parsedResult = JSON.parse(selectedChat.grammarResult);
              
              // Update the grammar checker with this content
              setGrammarText({
                original: selectedChat.inputText,
                modified: parsedResult.corrected || selectedChat.inputText,
                highlights: parsedResult.highlights || []
              });
            } else {
              // Just set the input text if no result exists yet
              setGrammarText({
                original: selectedChat.inputText,
                modified: selectedChat.inputText,
                highlights: []
              });
            }
          } catch (err) {
            console.error("Failed to parse grammar result:", err);
          }
        } 
        else if (tool === "paraphrase" && selectedChat.inputText) {
          try {
            // Store the entry ID in session storage
            sessionStorage.setItem('currentParaphraseEntryId', chatId.toString());
            
            if (selectedChat.paraphraseResult) {
              const parsedResult = JSON.parse(selectedChat.paraphraseResult);
              
              // Update the paraphraser with this content
              setParaphraseText({
                original: selectedChat.inputText,
                paraphrased: parsedResult.paraphrased || ""
              });
            } else {
              // Just set the input text if no result exists yet
              setParaphraseText({
                original: selectedChat.inputText,
                paraphrased: ""
              });
            }
          } catch (err) {
            console.error("Failed to parse paraphrase result:", err);
          }
        }
        else if (tool === "ai-check" && selectedChat.inputText) {
          try {
            // Store the entry ID in session storage
            sessionStorage.setItem('currentAICheckEntryId', chatId.toString());
            
            if (selectedChat.aiCheckResult) {
              const parsedResult = JSON.parse(selectedChat.aiCheckResult);
              
              // Update the AI checker with this content
              setAiCheckText({
                original: selectedChat.inputText,
                modified: selectedChat.inputText,
                highlights: parsedResult.highlights || []
              });
            } else {
              // Just set the input text if no result exists yet
              setAiCheckText({
                original: selectedChat.inputText,
                modified: selectedChat.inputText,
                highlights: []
              });
            }
          } catch (err) {
            console.error("Failed to parse AI check result:", err);
          }
        }
        else if (tool === "humanizer" && selectedChat.inputText) {
          try {
            // Store the entry ID in session storage
            sessionStorage.setItem('currentHumanizerEntryId', chatId.toString());
            
            if (selectedChat.humanizeResult) {
              const parsedResult = JSON.parse(selectedChat.humanizeResult);
              
              // Update the humanizer with this content
              setHumanizerText({
                original: selectedChat.inputText,
                humanized: parsedResult.humanized || ""
              });
            } else {
              // Just set the input text if no result exists yet
              setHumanizerText({
                original: selectedChat.inputText,
                humanized: ""
              });
            }
          } catch (err) {
            console.error("Failed to parse humanizer result:", err);
          }
        }
        else if (tool === "chat") {
          // For chat, we don't have a specific format yet, but we'll set it up later
          // This would normally load a chat conversation from the chat sessions
        }
      }
    }
    
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

  const handleCreateNewChat = async () => {
    try {
      // Set active tool to chat
      setActiveTool("chat");
      
      // Create a new chat session
      const response = await apiRequest('POST', '/api/db/chat-sessions', {
        name: 'New Chat ' + new Date().toLocaleDateString()
      });
      
      const data = await response.json();
      console.log("Created new chat session with ID:", data.session.id);
      
      // Reset the session in the ChatGenerator component
      // This will force ChatGenerator to re-render with a new session
      sessionStorage.setItem('forceNewChat', 'true');
      
      // Invalidate the chat sessions query to update the sidebar
      queryClient.invalidateQueries({ queryKey: ['/api/writing-chats'] });
      
      // Close sidebar on mobile
      if (windowWidth < 768) {
        setSidebarOpen(false);
      }
    } catch (error) {
      console.error("Error creating new chat:", error);
      toast({
        title: "Error",
        description: "Failed to create new chat. Please try again.",
        variant: "destructive"
      });
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
                  onClick={handleCreateNewChat}
                  className="mx-3 mb-4"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Chat
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
                    ) : chats.filter(chat => chat.isFavorite)?.length > 0 ? (
                      <ul>
                        {chats
                          .filter(chat => chat.isFavorite)
                          .map(chat => (
                            <li 
                              key={`fav-${chat.id}`}
                              onClick={() => handleToolSelect("chat", chat.id)}
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
                  
                  {/* CHAT section */}
                  <div className="mb-4">
                    <div className="flex items-center mb-2 text-xs font-semibold text-muted-foreground">
                      <FileText className="h-4 w-4 mr-1" />
                      <span className="uppercase">CHAT</span>
                    </div>
                    
                    {isLoading ? (
                      <div className="text-xs italic text-muted-foreground px-2">Loading...</div>
                    ) : chats.filter(chat => !chat.grammarResult && !chat.paraphraseResult && !chat.aiCheckResult && !chat.humanizeResult)?.length > 0 ? (
                      <ul>
                        {chats
                          .filter(chat => !chat.grammarResult && !chat.paraphraseResult && !chat.aiCheckResult && !chat.humanizeResult)
                          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                          .map(chat => (
                            <li 
                              key={`chat-${chat.id}`}
                              onClick={() => handleToolSelect("chat", chat.id)}
                              className="cursor-pointer text-sm hover:bg-muted p-2 rounded-md mb-1 transition-colors"
                            >
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span className="truncate">{chat.title || `Chat ${chat.id}`}</span>
                              </div>
                              <div className="text-xs text-muted-foreground ml-6 mt-1">
                                {formatDate(chat.updatedAt)}
                              </div>
                            </li>
                          ))
                        }
                      </ul>
                    ) : (
                      <div className="text-sm italic text-muted-foreground px-2">No chats yet</div>
                    )}
                  </div>
                  
                  {/* No Grammar section needed - per user request: only keep records for the chat tab */}
                  
                  {/* No AI Check section needed - per user request: only keep records for the chat tab */}
                  
                  {/* No Paraphrase section needed - per user request: only keep records for the chat tab */}
                  
                  {/* No Humanize section needed - per user request: only keep records for the chat tab */}
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

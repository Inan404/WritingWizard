import { useState, useEffect } from "react";
import MainHeader from "@/components/MainHeader";
import WritingTools from "@/components/WritingTools";
import { useWriting } from "@/context/WritingContext";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Menu, X, Star, PlusCircle, Clock, FileText, Pencil, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/ui/theme-provider";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [deleteChatDialogOpen, setDeleteChatDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<number | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch writing chats from authenticated endpoint with refetch on focus
  const { data: writingChatsData, isLoading, refetch } = useQuery<{ chats: WritingChat[] }>({
    queryKey: ['/api/writing-chats'],
    staleTime: 0, // Always refetch on mount
    gcTime: 0, // Don't cache the data (gcTime is the new name for cacheTime in v5)
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Refetch every 5 seconds
  });
  
  // Safely handle the chat data
  const chats = writingChatsData?.chats || [];
  
  // Add debugging to check what's coming back from the API
  useEffect(() => {
    if (writingChatsData) {
      console.log("Writing chats data received:", writingChatsData);
    }
  }, [writingChatsData]);

  // Import context hooks
  const { 
    setGrammarText, 
    setParaphraseText, 
    setAiCheckText, 
    setHumanizerText,
    setChatText
  } = useWriting();
  
  const handleToolSelect = (tool: "chat" | "grammar" | "paraphrase" | "ai-check" | "humanizer", chatId?: number) => {
    // If chatId is provided, always switch to the chat tab regardless of which tool was requested
    if (chatId) {
      // Override the tool parameter to "chat" when a chat entry is selected
      tool = "chat";
    }
    
    // Set the active tool so the correct tab is shown
    setActiveTool(tool);
    
    // If chatId is provided, load that specific entry
    if (chatId) {
      // Find the chat in the data
      const selectedChat = chats.find(chat => chat.id === chatId);
      if (selectedChat) {
        console.log(`Loading chat ID: ${chatId}`);
        
        // Set a small delay to ensure the UI updates with the correct tab first
        setTimeout(() => {
          // Since we're always in chat tab now, we need to handle the chat data
          // For chat, we need to set sessionStorage to force the ChatGenerator to load this session
          // The order is very important here!
          sessionStorage.removeItem('forceNewChat'); // Make sure we're not triggering a new chat
          sessionStorage.setItem('currentChatSessionId', chatId.toString());
          sessionStorage.setItem('forceLoadChat', 'true');
          
          // Keep the original code for loading other tools' data as a fallback
          if (false && selectedChat.inputText) { // Disabled this branch since we always use chat tab now
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
          else if (false && tool === "paraphrase" && selectedChat.inputText) { // Disabled this branch since we always use chat tab now
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
          else if (false && tool === "ai-check" && selectedChat.inputText) { // Disabled this branch since we always use chat tab now
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
          else if (false && tool === "humanizer" && selectedChat.inputText) { // Disabled this branch since we always use chat tab now
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
          // We already set up the chat session storage at the beginning of the function 
          // so there's no need for an "else if (tool === 'chat')" condition here
        }, 20); // Small delay to ensure the UI has time to switch tabs
      }
    }
    
    // Close sidebar on mobile
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
      console.log("handleCreateNewChat called - direct switch to chat tab");
      
      // First, clear all session storage flags to avoid conflicts
      sessionStorage.removeItem('currentChatSessionId');
      sessionStorage.removeItem('forceLoadChat');
      sessionStorage.removeItem('forceNewChat');
      sessionStorage.removeItem('lastCreatedChatId');
      
      // CRITICAL FIX: Direct navigation to chat tab
      // This must be executed before anything else
      setActiveTool("chat");
      
      // Create a new chat session first
      const response = await apiRequest('POST', '/api/db/chat-sessions', {
        name: 'New Chat ' + new Date().toLocaleString()
      });
      
      const data = await response.json();
      const newChatId = data.session.id;
      console.log("Created new chat session with ID:", newChatId);
      
      // Clear all previous session data
      sessionStorage.removeItem('currentChatSessionId');
      sessionStorage.removeItem('forceLoadChat');
      
      // Set the current chat ID and force load flag
      sessionStorage.setItem('currentChatSessionId', newChatId.toString());
      sessionStorage.setItem('forceLoadChat', 'true');
      
      // Set active tool to chat again to ensure we're in chat mode
      setActiveTool("chat");
      
      // Add an event to force tab change
      const chatTabChangeEvent = new CustomEvent('forceChatTabChange', { detail: newChatId });
      window.dispatchEvent(chatTabChangeEvent);
      
      // Force refetch to update the sidebar
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/writing-chats'] });
      
      // Close sidebar on mobile
      if (windowWidth < 768) {
        setSidebarOpen(false);
      }
      
      // Show success message
      toast({
        title: "New Chat Started",
        description: "Your conversation has begun. Type a message to get started!",
        variant: "default"
      });
    } catch (error) {
      console.error("Error creating new chat:", error);
      toast({
        title: "Error",
        description: "Failed to create new chat. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleToggleFavorite = async (chatId: number) => {
    try {
      console.log(`Toggling favorite for chat ${chatId}`);
      
      // Find the current chat and its favorite status
      const chat = chats.find(c => c.id === chatId);
      if (!chat) {
        throw new Error("Chat not found");
      }
      
      // Call the API to toggle the favorite status
      const response = await apiRequest('PATCH', `/api/db/chat-sessions/${chatId}/favorite`);
      
      if (response.ok) {
        // Immediately update the local state for instant feedback
        const updatedChats = chats.map(c => 
          c.id === chatId ? { ...c, isFavorite: !c.isFavorite } : c
        );
        
        // Update the query cache for immediate UI update
        queryClient.setQueryData(['/api/writing-chats'], { 
          chats: updatedChats,
          timestamp: Date.now()
        });
        
        // Then refetch to ensure consistency with server
        await refetch();
        queryClient.invalidateQueries({ queryKey: ['/api/writing-chats'] });
        
        // Show success message
        toast({
          title: "Favorite Updated",
          description: `Chat ${!chat.isFavorite ? "added to" : "removed from"} favorites.`,
          variant: "default"
        });
      } else {
        // Show error
        const errorData = await response.json().catch(() => ({}));
        console.error("API error response:", errorData);
        
        toast({
          title: "Error",
          description: errorData.error || "Failed to update favorite status. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error updating favorite status:", error);
      toast({
        title: "Error",
        description: "Failed to update favorite status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteChat = async () => {
    if (!chatToDelete) return;
    
    try {
      // Call the API to delete the chat
      const response = await apiRequest('DELETE', `/api/db/chat-sessions/${chatToDelete}`);
      
      if (response.ok) {
        // If current chat is being deleted, clear the session storage
        const currentChatId = sessionStorage.getItem('currentChatSessionId');
        if (currentChatId === chatToDelete.toString()) {
          sessionStorage.removeItem('currentChatSessionId');
          sessionStorage.removeItem('forceLoadChat');
          
          // If we're in the chat tab, create a new chat
          if (window.location.pathname.includes('/chat')) {
            await handleCreateNewChat();
          }
        }
        
        // Remove the chat from the client-side cache and refetch
        await refetch();
        queryClient.invalidateQueries({ queryKey: ['/api/writing-chats'] });
        
        // Show success message
        toast({
          title: "Chat Deleted",
          description: "The chat has been successfully deleted.",
          variant: "default"
        });
      } else {
        // Show error
        toast({
          title: "Error",
          description: "Failed to delete chat. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
      toast({
        title: "Error",
        description: "Failed to delete chat. Please try again.",
        variant: "destructive"
      });
    } finally {
      // Reset state
      setChatToDelete(null);
      setDeleteChatDialogOpen(false);
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
              <div className="flex flex-col h-full overflow-hidden">
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
                              <span className="truncate">{chat.title || `Chat ${chat.id}`}</span>
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
                    ) : chats.length > 0 ? (
                      <ul>
                        {chats
                          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                          .map(chat => (
                            <li 
                              key={`chat-${chat.id}`}
                              className="text-sm hover:bg-muted p-2 rounded-md mb-1 transition-colors group"
                            >
                              <div className="flex items-center justify-between" onClick={() => handleToolSelect("chat", chat.id)}>
                                <div className="flex items-center flex-1 cursor-pointer">
                                  <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                                  <span className="truncate">{chat.title || `Chat ${chat.id}`}</span>
                                </div>
                                <div className="flex items-center">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 mr-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleFavorite(chat.id);
                                    }}
                                  >
                                    {chat.isFavorite ? (
                                      <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                                    ) : (
                                      <Star className="h-3.5 w-3.5 text-muted-foreground hover:text-yellow-400" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setChatToDelete(chat.id);
                                      setDeleteChatDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                  </Button>
                                </div>
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
      
      {/* Delete Chat Confirmation Dialog */}
      <AlertDialog open={deleteChatDialogOpen} onOpenChange={setDeleteChatDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setChatToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteChat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AiTool } from '@/components/AiTool';
import { Button } from '@/components/ui/button';
import { Menu, FileText, Star, PlusCircle, Trash2, User, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface WritingChat {
  id: number;
  title: string;
  inputText: string | null;
  grammarResult: string | null;
  paraphraseResult: string | null;
  aiCheckResult: string | null;
  humanizeResult: string | null;
  isFavorite: boolean;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

// New dark theme styling
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('chat');
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);
  const [deleteChatDialogOpen, setDeleteChatDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<number | null>(null);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);

  // Fetch all chats
  const { data: chatData = { chats: [] }, isLoading } = useQuery({
    queryKey: ['/api/writing-chats'],
    queryFn: async () => {
      const res = await fetch('/api/writing-chats');
      if (!res.ok) {
        throw new Error('Failed to fetch writing chats');
      }
      const data = await res.json();
      console.log("Fetched writing chats:", data);
      return data;
    }
  });
  
  // Extract chats from response
  const chats = chatData.chats || [];

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check for hash in URL to set active tab
  useEffect(() => {
    const hash = location.split('#')[1];
    if (hash && ['chat', 'grammar', 'paraphrase', 'humanize', 'ai-check'].includes(hash)) {
      setActiveTab(hash);
    }
  }, [location]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    window.history.pushState(null, '', `#${value}`);
  };

  const handleToolSelect = (tool: string, chatId?: number) => {
    handleTabChange(tool);
    if (chatId) {
      setActiveChatId(chatId);
    }
    // Close sidebar on mobile after selection
    if (windowWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleCreateNewChat = async () => {
    console.log("Creating new chat...");
    try {
      const now = new Date();
      const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
      
      console.log("Sending request to create new chat with date:", formattedDate);
      
      const res = await fetch('/api/writing-chats', { // Corrected endpoint URL - removed "db" prefix
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `New Chat ${formattedDate}`,
          inputText: "Hi, I need help with my writing.",
        }),
      });

      if (!res.ok) {
        console.error("Failed to create new chat. Status:", res.status);
        const errorText = await res.text();
        console.error("Error response:", errorText);
        throw new Error(`Failed to create new chat: ${res.status} ${errorText}`);
      }

      const data = await res.json();
      console.log("Created new chat successfully:", data);
      const newChat = data.chat;
      
      // Refetch the chat list
      queryClient.invalidateQueries({ queryKey: ['/api/writing-chats'] });
      
      // Set active tab to chat and navigate to it
      handleToolSelect('chat', newChat.id);
      
      toast({
        title: 'Success',
        description: 'New chat created!',
      });
    } catch (error) {
      console.error("Error creating new chat:", error);
      toast({
        title: 'Error',
        description: 'Failed to create new chat',
        variant: 'destructive',
      });
    }
  };

  const handleToggleFavorite = async (chatId: number) => {
    try {
      const chatToUpdate = chats.find((c: any) => c.id === chatId);
      if (!chatToUpdate) return;

      console.log("Attempting to toggle favorite for chat:", chatId, "Current state:", chatToUpdate.isFavorite);

      // Use correct API endpoint path
      let res = await fetch(`/api/chat-sessions/${chatId}/favorite`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isFavorite: !chatToUpdate.isFavorite,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update favorite status');
      }

      // Refetch the chat list
      queryClient.invalidateQueries({ queryKey: ['/api/writing-chats'] });
      
      toast({
        title: 'Success',
        description: chatToUpdate.isFavorite 
          ? 'Removed from favorites' 
          : 'Added to favorites',
      });
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast({
        title: 'Error',
        description: 'Failed to update favorite status',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteChat = async () => {
    if (!chatToDelete) return;
    
    try {
      console.log("Attempting to delete chat:", chatToDelete);
      const res = await fetch(`/api/chat-sessions/${chatToDelete}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete chat');
      }

      // Refetch the chat list
      queryClient.invalidateQueries({ queryKey: ['/api/writing-chats'] });
      
      toast({
        title: 'Success',
        description: 'Chat deleted successfully',
      });
      
      // If the deleted chat was active, reset activeChatId
      if (chatToDelete === activeChatId) {
        setActiveChatId(null);
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
      toast({
        title: 'Error',
        description: 'Failed to delete chat',
        variant: 'destructive',
      });
    } finally {
      setDeleteChatDialogOpen(false);
      setChatToDelete(null);
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };

  const tabMapping = {
    'chat': 'Chat',
    'grammar': 'Grammar check',
    'paraphrase': 'Paraphrase',
    'humanize': 'Humanizer',
    'ai-check': 'AI check'
  };

  // Map tabs to their display names
  const getTabName = (tabKey: string) => {
    return tabMapping[tabKey as keyof typeof tabMapping] || tabKey;
  };

  return (
    <div className="min-h-screen bg-[#040b14] text-white">
      {/* Top navigation bar */}
      <header className="py-4 px-6 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white" 
            onClick={() => {
              console.log("Toggle sidebar from", sidebarOpen, "to", !sidebarOpen);
              setSidebarOpen(!sidebarOpen);
            }}
          >
            {windowWidth >= 768 && sidebarOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
          <h1 className="text-lg font-medium">{user?.username || 'User'}'s Dashboard</h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/avatar.png" alt={user?.username || 'User'} />
                <AvatarFallback className="bg-primary text-white">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex h-[calc(100vh-65px)]">
        {/* Sidebar Overlay (Mobile) */}
        <AnimatePresence>
          {sidebarOpen && windowWidth < 768 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-20 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <AnimatePresence>
          {(sidebarOpen || windowWidth >= 768) && (
            <motion.div
              initial={{ x: windowWidth < 768 ? -300 : 0, opacity: windowWidth < 768 ? 0 : 1 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className={`${
                windowWidth < 768 
                  ? 'fixed left-0 top-[65px] z-30 h-[calc(100vh-65px)]' 
                  : sidebarOpen ? 'block' : 'hidden'
              } w-64 flex-shrink-0 border-r border-gray-800 bg-[#0a101f] overflow-y-auto`}
            >
              <div className="flex flex-col h-full py-4">
                {/* Mobile close button */}
                {windowWidth < 768 && (
                  <div className="flex justify-end px-3 mb-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-gray-400 hover:text-white"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </Button>
                  </div>
                )}
                
                <Button
                  onClick={handleCreateNewChat}
                  className="mx-3 mb-4 bg-blue-600 hover:bg-blue-700"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Chat
                </Button>
                
                <div className="overflow-y-auto flex-1 px-3 pb-4">
                  {/* FAVORITES section */}
                  <div className="mb-4">
                    <div className="flex items-center mb-2 text-xs font-semibold text-gray-400">
                      <Star className="h-4 w-4 mr-1 text-yellow-400" />
                      <span className="uppercase">FAVORITES</span>
                    </div>
                    
                    {isLoading ? (
                      <div className="text-xs italic text-gray-500 px-2">Loading...</div>
                    ) : chats.filter((chat: WritingChat) => chat.isFavorite)?.length > 0 ? (
                      <ul>
                        {chats
                          .filter((chat: WritingChat) => chat.isFavorite)
                          .map((chat: WritingChat) => (
                            <li 
                              key={`fav-${chat.id}`}
                              onClick={() => handleToolSelect("chat", chat.id)}
                              className="cursor-pointer text-sm hover:bg-gray-800 p-2 rounded-md mb-1 transition-colors flex items-center"
                            >
                              <FileText className="h-4 w-4 mr-2 text-blue-400" />
                              <span className="truncate">{chat.title || `Chat ${chat.id}`}</span>
                            </li>
                          ))
                        }
                      </ul>
                    ) : (
                      <div className="text-sm italic text-gray-500 px-2">No favorites yet</div>
                    )}
                  </div>
                  
                  {/* CHAT section */}
                  <div className="mb-4">
                    <div className="flex items-center mb-2 text-xs font-semibold text-gray-400">
                      <FileText className="h-4 w-4 mr-1" />
                      <span className="uppercase">CHAT</span>
                    </div>
                    
                    {isLoading ? (
                      <div className="text-xs italic text-gray-500 px-2">Loading...</div>
                    ) : chats.length > 0 ? (
                      <ul>
                        {chats
                          .sort((a: WritingChat, b: WritingChat) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                          .map((chat: WritingChat) => (
                            <li 
                              key={`chat-${chat.id}`}
                              className="text-sm hover:bg-gray-800 p-2 rounded-md mb-1 transition-colors group"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center flex-1 cursor-pointer" onClick={() => handleToolSelect("chat", chat.id)}>
                                  <FileText className="h-4 w-4 mr-2 text-gray-400" />
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
                                      <Star className="h-3.5 w-3.5 text-gray-500 hover:text-yellow-400" />
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
                                    <Trash2 className="h-3.5 w-3.5 text-gray-500 hover:text-red-400" />
                                  </Button>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 ml-6 mt-1">
                                {formatDate(chat.updatedAt)}
                              </div>
                            </li>
                          ))
                        }
                      </ul>
                    ) : (
                      <div className="text-sm italic text-gray-500 px-2">No chats yet</div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Tab navigation */}
          <div className="flex justify-center mb-12">
            <div className="bg-[#111827] rounded-full p-1 flex">
              {Object.entries(tabMapping).map(([key, label]) => (
                <Button
                  key={key}
                  variant="ghost"
                  className={`px-6 py-2 rounded-full transition-colors ${
                    activeTab === key
                      ? 'bg-[#1d4ed8] text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  onClick={() => handleTabChange(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Content area with animation */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto"
          >
            <div className={activeTab === 'chat' ? 'block' : 'hidden'}>
              <h2 className="text-3xl font-bold mb-2">AI Writing Assistant</h2>
              <p className="text-gray-400 mb-8">Chat with the AI to get help with your writing</p>
              <AiTool mode="chat" chatId={activeChatId} />
            </div>
            
            <div className={activeTab === 'grammar' ? 'block' : 'hidden'}>
              <AiTool mode="grammar" />
            </div>
            
            <div className={activeTab === 'paraphrase' ? 'block' : 'hidden'}>
              <AiTool mode="paraphrase" />
            </div>
            
            <div className={activeTab === 'humanize' ? 'block' : 'hidden'}>
              <AiTool mode="humanize" />
            </div>
            
            <div className={activeTab === 'ai-check' ? 'block' : 'hidden'}>
              <AiTool mode="ai-check" />
            </div>
          </motion.div>
        </main>
      </div>

      {/* Delete Chat Confirmation Dialog */}
      <Dialog open={deleteChatDialogOpen} onOpenChange={setDeleteChatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this chat? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteChatDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteChat}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AiTool } from '@/components/AiTool';
import { Button } from '@/components/ui/button';
import { User, LogOut } from 'lucide-react';
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

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('chat');
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
  };

  const handleCreateNewChat = async () => {
    console.log("Creating new chat...");
    try {
      const now = new Date();
      const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
      
      console.log("Sending request to create new chat with date:", formattedDate);
      
      const res = await fetch('/api/writing-chats', {
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
      <header className="py-2 sm:py-4 px-3 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-800 gap-2">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <h1 className="text-base sm:text-lg font-medium truncate">{user?.username || 'User'}'s Dashboard</h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
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

      <div className="h-[calc(100vh-65px)] sm:h-[calc(100vh-72px)]">
        {/* Main content */}
        <main className="w-full px-3 py-4 sm:p-6 overflow-y-auto hover-scrollbar">
          {/* Tab navigation */}
          <div className="flex justify-center mb-8 sm:mb-12 overflow-x-auto hover-scrollbar">
            <div className="bg-[#111827] rounded-full p-1 flex flex-nowrap">
              {Object.entries(tabMapping).map(([key, label]) => (
                <Button
                  key={key}
                  variant={activeTab === key ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleTabChange(key)}
                  className={`
                    rounded-full px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap
                    ${activeTab === key ? "bg-primary text-primary-foreground" : "text-gray-400 hover:text-white"}
                  `}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Tool content area */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto"
            >
              <div className={activeTab === 'chat' ? 'block' : 'hidden'}>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">AI Writing Assistant</h2>
                <p className="text-gray-400 mb-4 sm:mb-8">Chat with the AI to get help with your writing</p>
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
                <AiTool mode="aicheck" />
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Delete chat confirmation dialog */}
      <Dialog open={deleteChatDialogOpen} onOpenChange={setDeleteChatDialogOpen}>
        <DialogContent className="bg-[#111827] border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete this chat? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteChatDialogOpen(false)}
              className="border-gray-600 text-white hover:bg-gray-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteChat}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
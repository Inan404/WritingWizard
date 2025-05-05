import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Star, History, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface WritingSidebarProps {
  activeTab: string;
}

interface ChatSession {
  id: number;
  title: string;
  isFavorite: boolean;
  createdAt: string;
}

export default function WritingSidebar({ activeTab }: WritingSidebarProps) {
  const { toast } = useToast();
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Fetch writing chats
  const { data: writingChats, isLoading, isError } = useQuery<{ chats: ChatSession[] }>({
    queryKey: ['/api/writing-chats'],
    queryFn: async () => {
      const res = await fetch('/api/writing-chats');
      if (!res.ok) {
        throw new Error('Failed to fetch writing chats');
      }
      return res.json();
    }
  });

  const createNewChat = async () => {
    if (isCreatingNew) return;

    setIsCreatingNew(true);
    try {
      const now = new Date();
      const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
      
      const res = await fetch('/api/db/writing-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `New Chat ${formattedDate}`,
          inputText: 'Hello! I am your AI writing assistant. How can I help you with your writing needs today?'
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create new chat');
      }

      toast({
        title: 'Success',
        description: 'New chat created!',
      });

      // Force a refresh of the chat list
      setTimeout(() => {
        window.location.hash = 'chat';
      }, 300);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create new chat',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingNew(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <Button
        onClick={createNewChat}
        className="w-full"
        disabled={isCreatingNew}
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        New Chat
      </Button>

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Recent Chats
        </h3>
      </div>

      <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-250px)]">
        {isLoading ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : isError ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Failed to load chats
          </div>
        ) : !writingChats?.chats || writingChats.chats.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No chats found. Create a new one!
          </div>
        ) : (
          writingChats.chats
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 10)
            .map((chat) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={`cursor-pointer hover:bg-accent transition-colors ${chat.isFavorite ? 'border-primary/30' : ''}`}>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <div className="flex items-center">
                        <MessageSquare className="h-3 w-3 mr-2 text-muted-foreground" />
                        <span className="truncate max-w-[180px]">{chat.title}</span>
                      </div>
                      {chat.isFavorite && <Star className="h-3 w-3 fill-primary text-primary" />}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </motion.div>
            ))
        )}
      </div>

      {activeTab !== 'chat' && (
        <div className="mt-auto pt-4">
          <div className="text-xs text-muted-foreground mb-2">
            Current Tool
          </div>
          <Badge variant="outline" className="text-xs">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </Badge>
        </div>
      )}
    </div>
  );
}
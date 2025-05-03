import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AiTool } from '@/components/AiTool';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import WritingSidebar from '../components/WritingSidebar';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  Check, 
  Repeat, 
  Bot, 
  ScrollText,
  Menu
} from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('chat');
  const [location] = useLocation();
  const isMobile = useMediaQuery('(max-width: 768px)');

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

  return (
    <div className="container py-6 px-4 md:py-10 md:px-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">AI Writing Assistant</h1>
        
        {isMobile ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <div className="py-4">
                <WritingSidebar activeTab={activeTab} />
              </div>
            </SheetContent>
          </Sheet>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {!isMobile && (
          <div className="hidden md:block">
            <WritingSidebar activeTab={activeTab} />
          </div>
        )}

        <div className="md:col-span-3">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full mb-8">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden md:inline">Chat</span>
              </TabsTrigger>
              <TabsTrigger value="grammar" className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                <span className="hidden md:inline">Grammar</span>
              </TabsTrigger>
              <TabsTrigger value="paraphrase" className="flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                <span className="hidden md:inline">Paraphrase</span>
              </TabsTrigger>
              <TabsTrigger value="humanize" className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                <span className="hidden md:inline">Humanize</span>
              </TabsTrigger>
              <TabsTrigger value="ai-check" className="flex items-center gap-2">
                <ScrollText className="h-4 w-4" />
                <span className="hidden md:inline">AI Check</span>
              </TabsTrigger>
            </TabsList>

            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <TabsContent value="chat" className="mt-0">
                <AiTool mode="chat" />
              </TabsContent>
              <TabsContent value="grammar" className="mt-0">
                <AiTool mode="grammar" />
              </TabsContent>
              <TabsContent value="paraphrase" className="mt-0">
                <AiTool mode="paraphrase" />
              </TabsContent>
              <TabsContent value="humanize" className="mt-0">
                <AiTool mode="humanize" />
              </TabsContent>
              <TabsContent value="ai-check" className="mt-0">
                <AiTool mode="ai-check" />
              </TabsContent>
            </motion.div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
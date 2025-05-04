import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { AiTool } from '@/components/AiTool';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

// New dark theme styling
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('chat');
  const [location] = useLocation();
  const username = 'inan404'; // This would normally come from an auth hook

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
          <Button variant="ghost" size="icon" className="text-white">
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-medium">{username}'s Dashboard</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="p-6">
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
            <AiTool mode="chat" />
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
  );
}
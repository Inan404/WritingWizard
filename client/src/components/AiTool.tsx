// Import core mode type from the hooks
import { Mode } from '@/hooks/useAiTool';

// Import individual tool components 
// For chat functionality
import { ChatInterface } from './ChatInterface';

// Import individual writing tools
import GrammarChecker from './tools/GrammarChecker';
import Paraphraser from './tools/Paraphraser';
import Humanizer from './tools/Humanizer';
import AIChecker from './tools/AIChecker';

interface AiToolProps {
  mode: Mode;
  defaultText?: string;
  chatId?: number | null;
}

export function AiTool({ mode, defaultText = '', chatId = null }: AiToolProps) {
  // Render different components based on mode
  switch (mode) {
    case 'chat':
      return <ChatInterface chatId={chatId} />;
    case 'grammar':
      return <GrammarChecker defaultText={defaultText} />;
    case 'paraphrase':
      return <Paraphraser defaultText={defaultText} />;
    case 'humanize':
      return <Humanizer defaultText={defaultText} />;
    case 'aicheck':
      return <AIChecker defaultText={defaultText} />;
    default:
      return <div>Unknown mode: {mode}</div>;
  }
}
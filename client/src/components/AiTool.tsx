import { Mode } from '@/hooks/useAiTool';
import { ChatInterface } from './ChatInterface';

// Using the components from the tools directory
// These are the cleaned-up, latest versions of our tool components
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
import { Mode } from '@/hooks/useAiTool';
import { ChatInterface } from './ChatInterface';
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
      return <GrammarChecker />;
    case 'paraphrase':
      return <Paraphraser />;
    case 'humanize':
      return <Humanizer />;
    case 'aicheck':
      return <AIChecker />;
    default:
      return <div>Unknown mode: {mode}</div>;
  }
}
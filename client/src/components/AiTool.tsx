import { Mode } from '@/hooks/useAiTool';
import { ChatInterface } from './ChatInterface';
import { GrammarChecker } from './GrammarChecker';
import { ParaphraseComponent } from './ParaphraseComponent';
import { HumanizerComponent } from './HumanizerComponent';
import { AICheckComponent } from './AICheckComponent';

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
      return <ParaphraseComponent />;
    case 'humanize':
      return <HumanizerComponent />;
    case 'aicheck':
      return <AICheckComponent defaultText={defaultText} />;
    default:
      return <div>Unknown mode: {mode}</div>;
  }
}
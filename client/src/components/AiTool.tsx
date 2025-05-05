/**
 * AiTool.tsx
 * 
 * This is the primary component hub for all AI writing tools in the application.
 * It serves as a container that renders the appropriate tool based on the 'mode' prop.
 * This file is actively used in the DashboardPage to switch between different AI tools.
 * 
 * Currently supported modes:
 * - chat: AI writing assistant chat interface
 * - grammar: Grammar check and correction tool
 * - paraphrase: Text rewriting with different styles
 * - humanize: Making AI-generated text sound more human
 * - aicheck: Detecting AI-generated content
 * 
 * IMPORTANT: This is the main hub component being used in the application. 
 * The /components/tools/ directory contains older versions that are not used.
 */

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
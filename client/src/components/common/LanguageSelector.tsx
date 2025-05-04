import { motion } from 'framer-motion';
import { useWriting, SupportedLanguage } from '@/context/WritingContext';

interface LanguageSelectorProps {
  onSelectLanguage?: (language: SupportedLanguage) => void;
}

// Language name display mapping
const languageNames: Record<SupportedLanguage, string> = {
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'fr-FR': 'French',
  'de-DE': 'German',
  'es-ES': 'Spanish',
  'it-IT': 'Italian',
  'nl-NL': 'Dutch',
  'pt-PT': 'Portuguese',
  'ru-RU': 'Russian',
  'zh-CN': 'Chinese',
  'pl-PL': 'Polish'
};

export default function LanguageSelector({ onSelectLanguage }: LanguageSelectorProps) {
  const { selectedLanguage, setSelectedLanguage } = useWriting();
  
  const handleLanguageSelect = (language: SupportedLanguage) => {
    console.log(`LanguageSelector: Setting language to ${language}, current language is ${selectedLanguage}`);
    setSelectedLanguage(language);
    if (onSelectLanguage) {
      console.log(`LanguageSelector: Calling onSelectLanguage with ${language}`);
      onSelectLanguage(language);
    }
  };

  // Prepare language options for the UI
  // We'll show the most common languages first as buttons, the rest in a dropdown
  const mainLanguages: SupportedLanguage[] = ['en-US', 'en-GB', 'fr-FR', 'de-DE', 'es-ES'];
  
  const buttonVariants = {
    selected: { 
      backgroundColor: 'hsl(var(--primary))', 
      color: 'hsl(var(--primary-foreground))',
      scale: 1
    },
    unselected: { 
      backgroundColor: 'hsl(var(--muted))', 
      color: 'hsl(var(--foreground))',
      scale: 1
    },
    hover: {
      scale: 1.05
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center mb-2">
        <h3 className="text-sm font-medium mr-2">Language:</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {mainLanguages.map(language => (
          <motion.button
            key={language}
            className="px-4 py-1 rounded-full text-sm font-medium"
            initial="unselected"
            animate={selectedLanguage === language ? "selected" : "unselected"}
            whileHover="hover"
            variants={buttonVariants}
            onClick={() => handleLanguageSelect(language)}
          >
            {languageNames[language]}
          </motion.button>
        ))}
        <select 
          className="px-3 py-1 rounded-full text-sm bg-muted text-foreground border-0"
          value={!mainLanguages.includes(selectedLanguage) ? selectedLanguage : ''}
          onChange={(e) => handleLanguageSelect(e.target.value as SupportedLanguage)}
        >
          <option value="" disabled>More languages...</option>
          {Object.entries(languageNames)
            .filter(([code]) => !mainLanguages.includes(code as SupportedLanguage))
            .map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))
          }
        </select>
      </div>
    </div>
  );
}
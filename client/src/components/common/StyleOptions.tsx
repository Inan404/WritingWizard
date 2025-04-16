import { motion } from 'framer-motion';
import { useWriting, WritingStyle } from '@/context/WritingContext';

interface StyleOptionsProps {
  onSelectStyle?: (style: WritingStyle) => void;
  showDocTypes?: boolean;
}

export default function StyleOptions({ 
  onSelectStyle,
  showDocTypes = false
}: StyleOptionsProps) {
  const { selectedStyle, setSelectedStyle } = useWriting();
  
  const handleStyleSelect = (style: WritingStyle) => {
    setSelectedStyle(style);
    if (onSelectStyle) {
      onSelectStyle(style);
    }
  };

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
      {showDocTypes && (
        <div className="flex flex-wrap gap-2 mb-4">
          <motion.button
            className="px-4 py-1 rounded-full text-sm font-medium"
            initial="selected"
            animate="selected"
            whileHover="hover"
            variants={buttonVariants}
          >
            Document type
          </motion.button>
          <motion.button
            className="px-4 py-1 rounded-full text-sm"
            initial="unselected"
            animate="unselected"
            whileHover="hover"
            variants={buttonVariants}
          >
            Formality
          </motion.button>
          <motion.button
            className="px-4 py-1 rounded-full text-sm"
            initial="unselected"
            animate="unselected"
            whileHover="hover"
            variants={buttonVariants}
          >
            Goals
          </motion.button>
          <motion.button
            className="px-4 py-1 rounded-full text-sm"
            initial="unselected"
            animate="unselected"
            whileHover="hover"
            variants={buttonVariants}
          >
            Domain
          </motion.button>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2">
        <motion.button
          className="px-4 py-1 rounded-full text-sm font-medium"
          initial="unselected"
          animate={selectedStyle === "standard" ? "selected" : "unselected"}
          whileHover="hover"
          variants={buttonVariants}
          onClick={() => handleStyleSelect("standard")}
        >
          Standard
        </motion.button>
        <motion.button
          className="px-4 py-1 rounded-full text-sm"
          initial="unselected"
          animate={selectedStyle === "fluency" ? "selected" : "unselected"}
          whileHover="hover"
          variants={buttonVariants}
          onClick={() => handleStyleSelect("fluency")}
        >
          Fluency
        </motion.button>
        <motion.button
          className="px-4 py-1 rounded-full text-sm"
          initial="unselected"
          animate={selectedStyle === "formal" ? "selected" : "unselected"}
          whileHover="hover"
          variants={buttonVariants}
          onClick={() => handleStyleSelect("formal")}
        >
          Formal
        </motion.button>
        <motion.button
          className="px-4 py-1 rounded-full text-sm"
          initial="unselected"
          animate={selectedStyle === "academic" ? "selected" : "unselected"}
          whileHover="hover"
          variants={buttonVariants}
          onClick={() => handleStyleSelect("academic")}
        >
          Academic
        </motion.button>
        <motion.button
          className="px-4 py-1 rounded-full text-sm"
          initial="unselected"
          animate={selectedStyle === "custom" ? "selected" : "unselected"}
          whileHover="hover"
          variants={buttonVariants}
          onClick={() => handleStyleSelect("custom")}
        >
          Custom
        </motion.button>
      </div>
    </div>
  );
}

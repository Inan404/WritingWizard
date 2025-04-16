import { motion } from "framer-motion";

interface ToolTabProps {
  name: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export default function ToolTab({ name, label, isActive, onClick }: ToolTabProps) {
  return (
    <motion.button
      className={`px-6 py-2 rounded-full ${
        isActive 
          ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700' 
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
      onClick={onClick}
      whileHover={{ scale: isActive ? 1 : 1.05 }}
      whileTap={{ scale: 0.95 }}
      data-tab={name}
    >
      {label}
    </motion.button>
  );
}

import { motion } from "framer-motion";

interface StyleSelectorProps {
  selectedStyle: string;
  onChange: (style: string) => void;
}

export default function StyleSelector({ selectedStyle, onChange }: StyleSelectorProps) {
  const styles = [
    { id: "standard", label: "Standard" },
    { id: "fluency", label: "Fluency" },
    { id: "formal", label: "Formal" },
    { id: "academic", label: "Academic" },
    { id: "custom", label: "Custom" }
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {styles.map((style) => (
        <motion.button
          key={style.id}
          className={`px-4 py-1.5 rounded-full text-sm font-medium ${
            selectedStyle === style.id
              ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
          onClick={() => onChange(style.id)}
          whileHover={{ scale: selectedStyle === style.id ? 1 : 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {style.label}
        </motion.button>
      ))}
    </div>
  );
}

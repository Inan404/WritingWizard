import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ui/theme-provider";
import { motion } from "framer-motion";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  console.log("Current theme:", theme);
  
  const toggleTheme = () => {
    console.log("Toggling theme from", theme);
    const newTheme = theme === "dark" ? "light" : "dark";
    console.log("Setting theme to", newTheme);
    setTheme(newTheme);
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        className="h-9 w-9 rounded-full"
      >
        {theme === "dark" ? (
          <Sun className="h-5 w-5 text-yellow-400" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </Button>
    </motion.div>
  );
}

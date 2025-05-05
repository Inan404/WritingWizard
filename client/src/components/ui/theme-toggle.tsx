import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/ui/theme-provider"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  return (
    <motion.div
      whileTap={{ scale: 0.9 }}
    >
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={toggleTheme}
        className="rounded-full focus-visible:ring-0 focus-visible:ring-offset-0"
      >
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: theme === "dark" ? 180 : 0 }}
          transition={{ duration: 0.5 }}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </motion.div>
        <span className="sr-only">Toggle theme</span>
      </Button>
    </motion.div>
  )
}
import { useTheme } from "@/context/ThemeContext";
import { Moon, Sun, FileText, Pen } from "lucide-react";
import { motion } from "framer-motion";

interface MainHeaderProps {
  userName?: string;
  userImage?: string;
}

export default function MainHeader({ 
  userName = "User",
  userImage = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
}: MainHeaderProps) {
  const { toggleTheme, theme } = useTheme();

  return (
    <header className="bg-card shadow-sm py-2 px-4 sticky top-0 z-10">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <button className="p-2 text-muted-foreground hover:text-primary transition-colors">
            <FileText className="h-5 w-5" />
          </button>
          
          <div className="flex space-x-1 overflow-x-auto py-2 no-scrollbar">
            <div className="flex items-center space-x-2 px-3 py-1 bg-muted rounded-md">
              <svg className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 18H17V16H7V18Z" fill="currentColor" />
                <path d="M17 14H7V12H17V14Z" fill="currentColor" />
                <path d="M7 10H11V8H7V10Z" fill="currentColor" />
                <path d="M20.1 5.1L16.9 2C16.4 1.6 15.8 1.4 15.2 1.4H8.3C7.7 1.4 7.1 1.7 6.7 2.1C6.3 2.5 6 3.1 6 3.8V20.3C6 20.9 6.3 21.6 6.7 22C7.1 22.4 7.7 22.7 8.3 22.7H19.7C20.3 22.7 20.9 22.4 21.3 22C21.7 21.6 22 20.9 22 20.3V7.5C22 6.7 21.5 5.5 20.1 5.1ZM17.2 7H14V3.8H15.2C15.4 3.8 15.6 3.9 15.8 4L20 7.9V20.2H8V3.8H12V8H16.1C16.6 8 17.1 7.5 17.2 7Z" fill="currentColor" />
              </svg>
              <span className="text-sm whitespace-nowrap">Introduction to...</span>
            </div>
            
            <div className="flex items-center space-x-2 px-3 py-1 bg-muted rounded-md">
              <svg className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.54 6.42C22.4212 5.94541 22.1793 5.51057 21.8387 5.15941C21.498 4.80824 21.0708 4.55318 20.6 4.42C18.88 4 12 4 12 4C12 4 5.12001 4 3.40001 4.46C2.92925 4.59318 2.50198 4.84824 2.16134 5.19941C1.5 5.55057 1.37827 5.98541 1.26001 6.46C0.979949 8.20556 0.839988 9.97631 0.840012 11.75C0.837421 13.537 0.977384 15.3213 1.26001 17.08C1.38087 17.5398 1.6209 17.9581 1.95378 18.2945C2.28666 18.6308 2.70294 18.8738 3.16001 19C4.88001 19.46 12 19.46 12 19.46C12 19.46 18.88 19.46 20.6 19C21.0708 18.8668 21.498 18.6118 21.8387 18.2606C22.1793 17.9094 22.4212 17.4746 22.54 17C22.8171 15.2676 22.9575 13.5103 22.96 11.75C22.9626 9.96295 22.8226 8.1787 22.54 6.42Z" fill="currentColor" />
                <path d="M9.75 15.02L15.5 11.75L9.75 8.48001V15.02Z" fill="white" />
              </svg>
              <span className="text-sm whitespace-nowrap">Introduction to...</span>
            </div>
            
            <div className="flex items-center space-x-2 px-3 py-1 bg-muted rounded-md">
              <svg className="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 18H17V16H7V18Z" fill="currentColor" />
                <path d="M17 14H7V12H17V14Z" fill="currentColor" />
                <path d="M7 10H11V8H7V10Z" fill="currentColor" />
                <path d="M19.5 3H4.5C3.4 3 2.5 3.9 2.5 5V19C2.5 20.1 3.4 21 4.5 21H19.5C20.6 21 21.5 20.1 21.5 19V5C21.5 3.9 20.6 3 19.5 3ZM19.5 19H4.5V5H19.5V19Z" fill="currentColor" />
              </svg>
              <span className="text-sm whitespace-nowrap">Introduction to...</span>
            </div>
            
            <div className="flex items-center space-x-2 px-3 py-1 bg-muted rounded-md">
              <svg className="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 18H17V16H7V18Z" fill="currentColor" />
                <path d="M17 14H7V12H17V14Z" fill="currentColor" />
                <path d="M7 10H11V8H7V10Z" fill="currentColor" />
                <path d="M19.5 3H4.5C3.4 3 2.5 3.9 2.5 5V19C2.5 20.1 3.4 21 4.5 21H19.5C20.6 21 21.5 20.1 21.5 19V5C21.5 3.9 20.6 3 19.5 3ZM19.5 19H4.5V5H19.5V19Z" fill="currentColor" />
              </svg>
              <span className="text-sm whitespace-nowrap">Introduction to...</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-muted transition-colors duration-300"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5 text-yellow-400" />
            ) : (
              <Moon className="h-5 w-5 text-muted-foreground" />
            )}
          </motion.button>
          
          <button className="p-2 rounded-full hover:bg-muted transition-colors duration-300">
            <Pen className="h-5 w-5 text-muted-foreground" />
          </button>
          
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="h-8 w-8 rounded-full overflow-hidden"
          >
            <img src={userImage} alt={userName} className="h-full w-full object-cover" />
          </motion.div>
        </div>
      </div>
    </header>
  );
}

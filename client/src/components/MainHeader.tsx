import { useAuth } from "@/hooks/use-auth";
import { FileText, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface MainHeaderProps {
  userImage?: string;
}

export default function MainHeader({ 
  userImage = "https://github.com/shadcn.png" 
}: MainHeaderProps) {
  const { user, logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="bg-card shadow-sm py-2 px-4 sticky top-0 z-10">
      <div className="container mx-auto flex justify-end items-center">
        {/* Simplified header with right-aligned elements */}
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          
          <Link href="/dashboard" className="hidden sm:block">
            <Button variant="outline" size="sm" className="rounded-full">
              Dashboard
            </Button>
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="h-8 w-8 rounded-full overflow-hidden cursor-pointer"
              >
                <Avatar>
                  <AvatarImage src={userImage} alt={user?.username || "User"} />
                  <AvatarFallback>{user?.username?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
              </motion.div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="font-medium">
                {user?.username || "User"}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard">Dashboard</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

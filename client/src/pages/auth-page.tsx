import { useState } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PenLine, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ui/theme-provider";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const { theme, setTheme } = useTheme();
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    username: "",
    password: "",
    passwordConfirm: "",
  });
  const [activeTab, setActiveTab] = useState("login");

  // Redirect if user is already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginForm);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match
    if (registerForm.password !== registerForm.passwordConfirm) {
      alert("Passwords do not match");
      return;
    }
    
    // Remove passwordConfirm from the data sent to the server
    const { passwordConfirm, ...registerData } = registerForm;
    registerMutation.mutate(registerData);
  };

  const updateLoginForm = (field: string, value: string) => {
    setLoginForm({ ...loginForm, [field]: value });
  };

  const updateRegisterForm = (field: string, value: string) => {
    setRegisterForm({ ...registerForm, [field]: value });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Hero section */}
      <div className="bg-primary text-primary-foreground p-8 md:w-1/2 flex flex-col justify-center items-center">
        <div className="max-w-md mx-auto">
          <div className="mb-6">
            <PenLine size={64} />
          </div>
          <h1 className="text-4xl font-bold mb-4">Writing Assistant</h1>
          <p className="text-xl mb-6">
            Enhance your writing with AI-powered tools for grammar checking,
            paraphrasing, AI detection, and more.
          </p>
          <ul className="space-y-2">
            <li className="flex items-center">
              <span className="mr-2">✓</span> Grammar and style checks
            </li>
            <li className="flex items-center">
              <span className="mr-2">✓</span> Smart paraphrasing
            </li>
            <li className="flex items-center">
              <span className="mr-2">✓</span> AI detection tools
            </li>
            <li className="flex items-center">
              <span className="mr-2">✓</span> Text humanizing features
            </li>
            <li className="flex items-center">
              <span className="mr-2">✓</span> Cloud syncing across devices
            </li>
          </ul>
        </div>
      </div>

      {/* Auth forms */}
      <div className="p-8 md:w-1/2 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="flex justify-end mb-2">
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            {/* Login Form */}
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Login</CardTitle>
                  <CardDescription>
                    Sign in to your account to access your writing tools
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleLoginSubmit}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-username">Username</Label>
                      <Input 
                        id="login-username" 
                        value={loginForm.username}
                        onChange={(e) => updateLoginForm("username", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input 
                        id="login-password" 
                        type="password" 
                        value={loginForm.password}
                        onChange={(e) => updateLoginForm("password", e.target.value)}
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <span className="flex items-center">
                          <PenLine className="mr-2 h-4 w-4 animate-spin" />
                          Logging in...
                        </span>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
            
            {/* Register Form */}
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Register</CardTitle>
                  <CardDescription>
                    Create a new account to get started
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleRegisterSubmit}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-username">Username</Label>
                      <Input 
                        id="register-username" 
                        value={registerForm.username}
                        onChange={(e) => updateRegisterForm("username", e.target.value)}
                        required
                      />
                    </div>
                    {/* Email field removed */}
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input 
                        id="register-password" 
                        type="password" 
                        value={registerForm.password}
                        onChange={(e) => updateRegisterForm("password", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password-confirm">Confirm Password</Label>
                      <Input 
                        id="register-password-confirm" 
                        type="password" 
                        value={registerForm.passwordConfirm}
                        onChange={(e) => updateRegisterForm("passwordConfirm", e.target.value)}
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <span className="flex items-center">
                          <PenLine className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </span>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
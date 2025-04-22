import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./components/ui/theme-provider";
import { WritingProvider } from "./context/WritingContext";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="light">
    <WritingProvider>
      <App />
    </WritingProvider>
  </ThemeProvider>
);
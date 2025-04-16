import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./context/ThemeContext";
import { WritingProvider } from "./context/WritingContext";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <WritingProvider>
      <App />
    </WritingProvider>
  </ThemeProvider>
);

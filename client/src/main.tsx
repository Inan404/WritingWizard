import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { WritingProvider } from "./context/WritingContext";

createRoot(document.getElementById("root")!).render(
  <WritingProvider>
    <App />
  </WritingProvider>
);
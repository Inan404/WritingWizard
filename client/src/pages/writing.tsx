import { Helmet } from "react-helmet";
import Dashboard from "@/components/Dashboard";

export default function Writing() {
  return (
    <>
      <Helmet>
        <title>Writing Assistant</title>
        <meta name="description" content="AI-powered writing assistant with grammar checking, paraphrasing, humanizing, and more" />
      </Helmet>
      <Dashboard />
    </>
  );
}

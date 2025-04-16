import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import StyleSelector from "@/components/ui/StyleSelector";
import PerformanceMetrics from "@/components/ui/PerformanceMetrics";
import ResizablePanel from "@/components/ui/ResizablePanel";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Humanizer() {
  const [inputText, setInputText] = useState<string>(
    "Neural networks can recognize various representations of the same digit, such as the number three, despite differences in pixel values across images."
  );
  const [outputText, setOutputText] = useState<string>("");
  const [selectedStyle, setSelectedStyle] = useState<string>("standard");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [metrics, setMetrics] = useState({
    correctness: 75,
    clarity: 60,
    engagement: 80,
    delivery: 65
  });

  const { toast } = useToast();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Initial humanize on component mount
    humanizeText();
  }, []);

  const humanizeText = async () => {
    if (!inputText.trim()) return;
    
    setIsLoading(true);
    
    try {
      const response = await apiRequest('POST', '/api/humanize', { 
        text: inputText,
        style: selectedStyle
      });
      
      const data = await response.json();
      setOutputText(data.humanizedText || '');
      setMetrics(data.metrics || {
        correctness: Math.floor(Math.random() * 20) + 70,
        clarity: Math.floor(Math.random() * 20) + 60,
        engagement: Math.floor(Math.random() * 20) + 70,
        delivery: Math.floor(Math.random() * 20) + 60
      });
      
      toast({
        title: "Text humanized",
        description: "Your text has been successfully humanized.",
        variant: "default"
      });
    } catch (error) {
      console.error('Text humanization failed:', error);
      toast({
        title: "Humanization failed",
        description: "Unable to humanize text at this time. Please try again later.",
        variant: "destructive"
      });
      
      // Fallback output for demo
      setOutputText(
        "Neural networks can identify different versions of the same digit, like 3, despite pixel variations across images.\n\nThese networks actually manage to recognize different ways the same digit can be written, such as the number 3, even when the pixel values change from one image to another."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleStyleChange = (style: string) => {
    setSelectedStyle(style);
    humanizeText();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outputText);
    toast({
      title: "Copied to clipboard",
      description: "The humanized text has been copied to your clipboard.",
      variant: "default"
    });
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <ResizablePanel className="w-full md:w-1/2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm relative">
        <div className="h-[500px] overflow-y-auto">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={handleInputChange}
            className="w-full h-full p-2 bg-transparent resize-none focus:outline-none text-gray-900 dark:text-gray-100"
            placeholder="Enter text to humanize..."
          />
        </div>
      </ResizablePanel>

      <div className="w-full md:w-1/2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
        <div className="mb-6">
          <StyleSelector selectedStyle={selectedStyle} onChange={handleStyleChange} />
          <PerformanceMetrics metrics={metrics} />
        </div>

        <div className="h-[350px] overflow-y-auto mb-4 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 z-10">
              <div className="flex flex-col items-center">
                <svg className="animate-spin h-8 w-8 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-sm text-gray-600 dark:text-gray-400">Humanizing your text...</p>
              </div>
            </div>
          )}
          
          <div className="prose dark:prose-invert max-w-none">
            {outputText.split('\n').map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex space-x-3">
            <motion.button 
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCopy}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </motion.button>
            <motion.button 
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.465a5 5 0 001.897-7.72m-3.732 10.65a9 9 0 0110.653-14.21" />
              </svg>
            </motion.button>
            <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905a3.61 3.61 0 01-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
              </svg>
            </button>
          </div>
          <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>
        </div>

        <motion.button
          className="mt-4 w-full py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={humanizeText}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Humanize Text
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}

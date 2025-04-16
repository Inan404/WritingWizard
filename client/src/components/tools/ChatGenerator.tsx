import { useState } from "react";
import { motion } from "framer-motion";
import FileUploader from "@/components/ui/FileUploader";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ChatGenerator() {
  const [originalSample, setOriginalSample] = useState<string>("");
  const [referenceUrl, setReferenceUrl] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [length, setLength] = useState<string>("medium");
  const [style, setStyle] = useState<string>("conversational");
  const [additionalInstructions, setAdditionalInstructions] = useState<string>("");
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showOutput, setShowOutput] = useState<boolean>(false);
  
  const { toast } = useToast();

  const handleOriginalSampleUpload = (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if (e.target && typeof e.target.result === 'string') {
          setOriginalSample(e.target.result);
        }
      };
      
      reader.readAsText(file);
    }
  };

  const handleReferenceUpload = (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if (e.target && typeof e.target.result === 'string') {
          // Handle reference material upload
          toast({
            title: "Reference material uploaded",
            description: `File "${file.name}" has been uploaded.`,
            variant: "default"
          });
        }
      };
      
      reader.readAsText(file);
    }
  };

  const generateWriting = async () => {
    if (!originalSample.trim()) {
      toast({
        title: "Missing original sample",
        description: "Please provide an original writing sample for analysis.",
        variant: "destructive"
      });
      return;
    }
    
    if (!topic.trim()) {
      toast({
        title: "Missing topic",
        description: "Please specify a writing topic.",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const response = await apiRequest('POST', '/api/generate-writing', {
        originalSample,
        referenceUrl,
        topic,
        length,
        style,
        additionalInstructions
      });
      
      const data = await response.json();
      setGeneratedContent(data.generatedText || '');
      setShowOutput(true);
      
      toast({
        title: "Writing generated",
        description: "Your writing has been successfully generated based on your style.",
        variant: "default"
      });
    } catch (error) {
      console.error('Writing generation failed:', error);
      toast({
        title: "Generation failed",
        description: "Unable to generate writing at this time. Please try again later.",
        variant: "destructive"
      });
      
      // Fallback output for demo
      setGeneratedContent(
        "Your generated content will appear here... Once the AI has analyzed your writing style and reference materials, it will create content that matches your style preferences and follows your instructions."
      );
      setShowOutput(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyOutput = () => {
    navigator.clipboard.writeText(generatedContent);
    toast({
      title: "Copied to clipboard",
      description: "The generated writing has been copied to your clipboard.",
      variant: "default"
    });
  };

  const handleDownloadOutput = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `generated-${topic.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast({
      title: "Download started",
      description: "Your generated writing is being downloaded.",
      variant: "default"
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Original Writing Sample Upload */}
      <motion.div 
        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Original Writing Sample</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Upload your original writing sample that the AI will analyze to understand your writing style.
        </p>
        
        <FileUploader onFilesSelected={handleOriginalSampleUpload} />
        
        <div className="mt-4">
          <textarea
            value={originalSample}
            onChange={(e) => setOriginalSample(e.target.value)}
            placeholder="Or paste your original writing sample here..."
            className="w-full h-32 px-3 py-2 text-gray-700 dark:text-gray-200 border rounded-lg focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 resize-none"
          ></textarea>
        </div>
      </motion.div>
      
      {/* Reference Materials Upload */}
      <motion.div 
        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Reference Materials</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Upload files or provide links to materials that the AI should analyze to generate content.
        </p>
        
        <FileUploader onFilesSelected={handleReferenceUpload} />
        
        <div className="mt-4">
          <input
            type="text"
            value={referenceUrl}
            onChange={(e) => setReferenceUrl(e.target.value)}
            placeholder="Paste URL to reference material..."
            className="w-full px-3 py-2 text-gray-700 dark:text-gray-200 border rounded-lg focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
      </motion.div>
      
      {/* Instructions */}
      <motion.div 
        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm md:col-span-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Writing Instructions</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Provide detailed instructions for the AI to generate content based on your style and reference materials.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Writing Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter the main topic or title..."
              className="w-full px-3 py-2 text-gray-700 dark:text-gray-200 border rounded-lg focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Length</label>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="length-short"
                  name="length"
                  value="short"
                  checked={length === "short"}
                  onChange={() => setLength("short")}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="length-short" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Short (250 words)</label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="length-medium"
                  name="length"
                  value="medium"
                  checked={length === "medium"}
                  onChange={() => setLength("medium")}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="length-medium" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Medium (500 words)</label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="length-long"
                  name="length"
                  value="long"
                  checked={length === "long"}
                  onChange={() => setLength("long")}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="length-long" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Long (1000+ words)</label>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Style</label>
            <select 
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full px-3 py-2 text-gray-700 dark:text-gray-200 border rounded-lg focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="formal">Formal</option>
              <option value="conversational">Conversational</option>
              <option value="academic">Academic</option>
              <option value="creative">Creative</option>
              <option value="technical">Technical</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Additional Instructions</label>
            <textarea
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              placeholder="Provide any additional details, specific requirements, or formatting guidelines..."
              className="w-full h-32 px-3 py-2 text-gray-700 dark:text-gray-200 border rounded-lg focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 resize-none"
            ></textarea>
          </div>
        </div>
        
        <div className="mt-6">
          <motion.button
            className="w-full py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={generateWriting}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Writing
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
      
      {/* Generated Output */}
      {showOutput && (
        <motion.div 
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm md:col-span-2"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Generated Writing</h2>
            <div className="flex space-x-2">
              <motion.button 
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" 
                title="Copy to clipboard"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleCopyOutput}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </motion.button>
              <motion.button 
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" 
                title="Download as document"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleDownloadOutput}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </motion.button>
            </div>
          </div>
          <div className="prose dark:prose-invert max-w-none">
            {generatedContent ? (
              generatedContent.split('\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-10">
                Your generated content will appear here...
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

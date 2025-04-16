import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { motion } from "framer-motion";

export default function Header() {
  const [documents] = useState([
    { id: 1, name: "Introduction to human rights", type: "document" },
    { id: 2, name: "Introduction to history", type: "video" },
    { id: 3, name: "Introduction to economics", type: "document" },
    { id: 4, name: "Introduction to psychology", type: "document" },
    { id: 5, name: "Introduction to sociology", type: "document" }
  ]);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm px-4 py-2 flex items-center space-x-4 overflow-x-auto">
      <div className="flex-shrink-0 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v10m2 2v-6m0 0V4m0 0h-6m6 0v6m0 0H9" />
        </svg>
      </div>
      
      <motion.div 
        className="flex space-x-2 overflow-x-auto pb-1"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, staggerChildren: 0.1 }}
      >
        {documents.map((doc) => (
          <motion.div
            key={doc.id}
            className={`px-3 py-1 flex items-center rounded-md ${
              doc.type === 'video' 
                ? 'bg-red-100 dark:bg-red-900/30' 
                : 'bg-blue-100 dark:bg-blue-900/30'
            } text-sm cursor-pointer`}
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.2 }}
          >
            {doc.type === 'video' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {doc.type === 'document' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            <span>{doc.name}</span>
          </motion.div>
        ))}
      </motion.div>
      
      <div className="ml-auto flex items-center space-x-2">
        <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="Document viewer">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </button>
        <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="Edit">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        
        <ThemeToggle />
        
        <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden cursor-pointer">
          <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&h=100&q=80" alt="User avatar" className="w-full h-full object-cover" />
        </div>
      </div>
    </header>
  );
}

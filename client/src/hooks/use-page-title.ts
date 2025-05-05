import { useEffect } from 'react';

/**
 * Hook to set the page title dynamically
 * @param title The title for the current page
 * @param suffix Optional suffix to append to the title (default: "WriteCraft AI")
 */
export const usePageTitle = (title: string, suffix: string = "WriteCraft AI") => {
  useEffect(() => {
    // Previous title
    const prevTitle = document.title;
    
    // Update the document title
    document.title = suffix ? `${title} | ${suffix}` : title;
    
    // Cleanup function to reset the title when component unmounts
    return () => {
      document.title = prevTitle;
    };
  }, [title, suffix]);
};
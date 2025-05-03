import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    
    // Set initial value
    setMatches(mediaQuery.matches);
    
    // Create listener function
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };
    
    // Add listener for subsequent changes
    mediaQuery.addEventListener('change', handler);
    
    // Clean up on unmount
    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }, [query]);

  return matches;
}
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UseWritingToolsOptions {
  endpoint: string;
  transformResult?: (data: any) => any;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export default function useWritingTools<T>({
  endpoint,
  transformResult = (data) => data,
  onSuccess,
  onError
}: UseWritingToolsOptions) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const { toast } = useToast();
  
  const processText = async (text: string, options?: Record<string, any>) => {
    if (!text.trim()) {
      toast({
        title: "Empty text",
        description: "Please enter some text to process.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('POST', endpoint, { 
        text,
        ...options
      });
      
      const data = await response.json();
      const transformedResult = transformResult(data);
      
      setResult(transformedResult);
      
      if (onSuccess) {
        onSuccess(transformedResult);
      }
      
      toast({
        title: "Processing complete",
        description: "Your text has been successfully processed.",
        variant: "default"
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      
      if (onError) {
        onError(error);
      }
      
      toast({
        title: "Processing failed",
        description: error.message || "Failed to process your text. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    processText,
    isLoading,
    result,
    error
  };
}

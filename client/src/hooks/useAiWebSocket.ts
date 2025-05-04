import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/hooks/use-toast';

export interface WebSocketAiToolOptions {
  toolType: 'grammar-check' | 'paraphrase' | 'humanize' | 'ai-check';
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  resultMessageType: string;
}

export function useAiWebSocket(options: WebSocketAiToolOptions) {
  const { toolType, onSuccess, onError, resultMessageType } = options;
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const pendingMessageIdRef = useRef<string | null>(null);
  const { toast } = useToast();
  
  // Track if we've shown a connection error toast
  const hasShownErrorToastRef = useRef(false);
  
  // Set up WebSocket
  const { isConnected, sendMessage, addMessageHandler } = useWebSocket({
    onOpen: () => {
      console.log(`WebSocket connected, ready for ${toolType}`);
      // Reset error flag when connected
      hasShownErrorToastRef.current = false;
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
      
      // Only show toast once
      if (!hasShownErrorToastRef.current) {
        toast({
          title: 'Connection Info',
          description: 'Using standard mode instead of real-time mode.',
          duration: 3000,
        });
        hasShownErrorToastRef.current = true;
      }
    }
  });
  
  // Set up WebSocket message handlers
  useEffect(() => {
    // Handler for processing message
    const processingHandler = (data: any) => {
      console.log(`AI is processing ${toolType} request...`);
      setIsProcessing(true);
      
      // Store the message ID so we can match the response later
      pendingMessageIdRef.current = data.messageId;
    };
    
    // Handler for result message
    const resultHandler = (data: any) => {
      if (data.messageId !== pendingMessageIdRef.current) return;
      
      console.log(`Received ${toolType} result via WebSocket`);
      setIsProcessing(false);
      pendingMessageIdRef.current = null;
      
      // Store the result
      setResult(data.result);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(data.result);
      }
    };
    
    // Handler for error message
    const errorHandler = (data: any) => {
      console.error('WebSocket error:', data.error);
      setIsProcessing(false);
      pendingMessageIdRef.current = null;
      
      toast({
        title: 'Error',
        description: data.error || `Failed to process ${toolType} request`,
        variant: 'destructive',
      });
      
      // Call error callback if provided
      if (onError) {
        onError(new Error(data.error || `Failed to process ${toolType} request`));
      }
    };
    
    // Register handlers
    const removeProcessingHandler = addMessageHandler('processing', processingHandler);
    const removeResultHandler = addMessageHandler(resultMessageType, resultHandler);
    const removeErrorHandler = addMessageHandler('error', errorHandler);
    
    // Clean up handlers when component unmounts
    return () => {
      removeProcessingHandler();
      removeResultHandler();
      removeErrorHandler();
    };
  }, [toolType, resultMessageType, addMessageHandler, toast, onSuccess, onError]);
  
  // Function to process text
  const processText = (text: string, options: Record<string, any> = {}) => {
    if (!text.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please enter some text to process.',
        variant: 'destructive',
      });
      return false;
    }
    
    // Reset result
    setResult(null);
    
    // Check if WebSocket is connected
    if (isConnected) {
      // Send via WebSocket
      const messageId = `${toolType}-${Date.now()}`;
      
      const sent = sendMessage({
        type: toolType,
        text: text,
        messageId: messageId,
        ...options
      });
      
      return sent;
    } else {
      // WebSocket not connected - no need for toast here as we'll use HTTP fallback
      console.log('WebSocket not connected, should try HTTP fallback');
      return false;
    }
  };
  
  return {
    processText,
    isProcessing,
    result,
    isConnected
  };
}
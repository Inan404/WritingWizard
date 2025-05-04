import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

type MessageHandler = (data: any) => void;

interface UseWebSocketOptions {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (data: any) => void;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  pingInterval?: number; // Time between pings in ms, default: 15000 (15 seconds)
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const messageHandlersRef = useRef<Record<string, MessageHandler[]>>({});
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownErrorRef = useRef<boolean>(false);
  
  const {
    onOpen,
    onClose,
    onError,
    onMessage,
    reconnectDelay = 1500,
    maxReconnectAttempts = 5,
    pingInterval = 25000 // Ping every 25 seconds by default
  } = options;
  
  // Ref for the ping interval
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize WebSocket connection
  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log("WebSocket already connected");
      return;
    }
    
    if (isConnecting) {
      console.log("WebSocket connection in progress");
      return;
    }
    
    setIsConnecting(true);
    
    try {
      // Determine the appropriate WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log(`Connecting to WebSocket at ${wsUrl}`);
      
      // Create the WebSocket connection
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      
      // Set up event handlers
      socket.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0;
        hasShownErrorRef.current = false;
        
        // Start ping interval to keep the connection alive
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        
        pingIntervalRef.current = setInterval(() => {
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            try {
              socketRef.current.send(JSON.stringify({ type: 'ping', time: Date.now() }));
            } catch (error) {
              console.error('Error sending ping:', error);
            }
          }
        }, pingInterval);
        
        if (onOpen) {
          onOpen();
        }
      };
      
      socket.onclose = (e) => {
        console.log(`WebSocket closed with code ${e.code}. Reason: ${e.reason}`);
        setIsConnected(false);
        setIsConnecting(false);
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        if (onClose) {
          onClose();
        }
        
        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          
          // Exponential backoff: base delay × 2^attempts (with max of 30 seconds)
          const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
          console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts}) in ${delay}ms...`);
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.error(`Failed to reconnect after ${maxReconnectAttempts} attempts`);
        }
      };
      
      socket.onerror = (e) => {
        console.error('WebSocket error:', e);
        
        // Mark the connection as not connected on error
        // This will let components know to use the HTTP fallback
        setIsConnected(false);
        
        // Clear ping interval on error
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        if (onError && !hasShownErrorRef.current) {
          onError(e);
          hasShownErrorRef.current = true;
        }
      };
      
      socket.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          console.log('WebSocket message received:', data.type);
          
          // Call the general onMessage handler if provided
          if (onMessage) {
            onMessage(data);
          }
          
          // Call specific message type handlers
          if (data.type && messageHandlersRef.current[data.type]) {
            messageHandlersRef.current[data.type].forEach(handler => {
              try {
                handler(data);
              } catch (handlerError) {
                console.error(`Error in handler for message type ${data.type}:`, handlerError);
              }
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setIsConnecting(false);
    }
  }, [isConnecting, onOpen, onClose, onError, onMessage, reconnectDelay, maxReconnectAttempts, pingInterval]);
  
  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    reconnectAttemptsRef.current = 0;
    hasShownErrorRef.current = false;
  }, []);
  
  // Send message through WebSocket
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const messageString = JSON.stringify(message);
      socketRef.current.send(messageString);
      return true;
    } else {
      console.warn('WebSocket not connected. Cannot send message:', message);
      
      // If we're not connected or connecting, try to connect
      if (!isConnected && !isConnecting) {
        connect();
      }
      
      return false;
    }
  }, [isConnected, isConnecting, connect]);
  
  // Add message handler for specific message types
  const addMessageHandler = useCallback((type: string, handler: MessageHandler) => {
    if (!messageHandlersRef.current[type]) {
      messageHandlersRef.current[type] = [];
    }
    
    messageHandlersRef.current[type].push(handler);
    
    // Return a function to remove this handler
    return () => {
      messageHandlersRef.current[type] = messageHandlersRef.current[type]
        .filter(h => h !== handler);
    };
  }, []);
  
  // Initialize connection when component mounts
  useEffect(() => {
    connect();
    
    // Clean up on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);
  
  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    sendMessage,
    addMessageHandler
  };
}
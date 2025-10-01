'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/use-toast';

export interface WebSocketMessage {
  type: 'notification' | 'notification_update' | 'system_message' | 'ping' | 'pong';
  data: any;
  timestamp: string;
  userId?: string;
}

export interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface WebSocketHookReturn {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  sendMessage: (message: WebSocketMessage) => void;
  disconnect: () => void;
  reconnect: () => void;
  lastMessage: WebSocketMessage | null;
}

// Updated URL handling with environment detection
const getWebSocketUrl = () => {
  // Check if we have a custom API URL or default to localhost:8080
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (apiUrl) {
    // If API URL is provided, replace http/https with ws/wss
    return apiUrl.replace(/^https?:/, window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '/ws/notifications';
  }
  
  // Default to localhost:8080 for backend
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${wsProtocol}://localhost:8080/ws/notifications`;
};

// Helper function to get the API base URL for HTTP requests
const getApiBaseUrl = () => {
  // Check if we have a custom API URL or default to localhost:8080
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (apiUrl) {
    // If API URL is provided and already has protocol, use it as is
    if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
      return apiUrl;
    }
    // If no protocol, add current page's protocol
    return `${window.location.protocol}//${apiUrl}`;
  }
  
  // Default to localhost:8080 for backend
  const httpProtocol = window.location.protocol === 'https:' ? 'https' : 'http';
  return `${httpProtocol}://localhost:8080`;
};

export const useWebSocket = (options: UseWebSocketOptions = {}): WebSocketHookReturn => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const isConnectingRef = useRef(false);
  const normalCloseRef = useRef(false); // Track if the close was normal/intentional

  // Clear any existing timeouts when component unmounts
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      
      // Clear all timeouts and intervals
      if (connectDebounceRef.current) clearTimeout(connectDebounceRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      
      // Close WebSocket connection if it exists
      if (wsRef.current) {
        normalCloseRef.current = true; // Mark as normal close to prevent reconnect attempts
        
        try {
          // Only close if not already closing or closed
          if (wsRef.current.readyState !== WebSocket.CLOSING && 
              wsRef.current.readyState !== WebSocket.CLOSED) {
            wsRef.current.close(1000, 'Component unmounted');
          }
        } catch (err) {
          console.error('Error closing WebSocket:', err);
        }
        wsRef.current = null;
      }
    };
  }, []);

  const connect = useCallback(() => {
    // Check if WebSocket is disabled via environment variable
    if (process.env.NEXT_PUBLIC_DISABLE_WEBSOCKET === 'true') {
      console.log('WebSocket connections disabled via environment variable');
      setConnectionStatus('disconnected');
      return;
    }

    // Don't connect if user is not authenticated or component is unmounting
    if (!user?.id || !mountedRef.current) return;
    
    // Prevent multiple simultaneous connection attempts with better debouncing
    if (isConnectingRef.current || connectionStatus === 'connecting') {
      console.log('Connection already in progress, skipping...');
      return;
    }
    
    // Clear any existing timeouts
    if (connectDebounceRef.current) {
      clearTimeout(connectDebounceRef.current);
    }
    
    // Debounce connection attempts with a shorter delay (1 second instead of 3)
    connectDebounceRef.current = setTimeout(() => {
      if (!mountedRef.current || isConnectingRef.current) return;

      try {
        isConnectingRef.current = true;
        setConnectionStatus('connecting');
        
        // Close existing connection gracefully
        if (wsRef.current) {
          try {
            if (wsRef.current.readyState !== WebSocket.CLOSED) {
              normalCloseRef.current = true; // Mark as intentional close
              wsRef.current.close(1000, 'Reconnecting');
            }
          } catch (closeErr) {
            console.error('Error closing previous connection:', closeErr);
          }
          wsRef.current = null;
        }

        const token = localStorage.getItem('auth_token');
        if (!token) {
          console.warn('No auth token available for WebSocket connection');
          setConnectionStatus('error');
          isConnectingRef.current = false;
          return;
        }

        // Use dynamic WebSocket URL with environment detection
        const baseWsUrl = getWebSocketUrl();
        const wsUrl = `${baseWsUrl}?userId=${user.id}&token=${token}`;
        
        // Log connection attempt (hiding token)
        console.log('Attempting WebSocket connection to:', wsUrl.replace(/token=[^&]+/, 'token=***'));
        
        // Skip the status check and directly attempt connection for simplicity
        // This avoids another potential point of failure
        wsRef.current = new WebSocket(wsUrl);
        
        // Reset the normal close flag since we're making a new connection
        normalCloseRef.current = false;
        
        // Add connection timeout
        const connectionTimeout = setTimeout(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
            console.warn('WebSocket connection timeout');
            wsRef.current.close();
            isConnectingRef.current = false;
            setConnectionStatus('error');
          }
        }, 10000); // 10 second timeout

        wsRef.current.onopen = () => {
          if (!mountedRef.current) return;
          
          clearTimeout(connectionTimeout);
          isConnectingRef.current = false;
          setConnectionStatus('connected');
          reconnectAttemptsRef.current = 0;
          
          console.log('WebSocket connected successfully');
          onConnect?.();
    
          // DELAY the initial ping by 1 second to ensure the connection is fully established
          setTimeout(() => {
            if (mountedRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              console.log('Sending delayed initial ping...');
              try {
                wsRef.current.send(JSON.stringify({
                  type: 'ping',
                  timestamp: new Date().toISOString()
                }));
              } catch (err) {
                console.error('Failed to send initial ping:', err);
              }
            }
          }, 1000);
          
          // Set up periodic ping to keep connection alive
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(() => {
            if (mountedRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              try {
                wsRef.current.send(JSON.stringify({
                  type: 'ping',
                  timestamp: new Date().toISOString()
                }));
              } catch (err) {
                console.error('Failed to send keep-alive ping:', err);
              }
            }
          }, 30000); // Send ping every 30 seconds
        };

        wsRef.current.onmessage = (event) => {
          if (!mountedRef.current) return;
          
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            setLastMessage(message);
            onMessage?.(message);
            
            // Handle notification messages with toast
            if (message.type === 'notification') {
              toast({
                title: message.data.title || 'New Notification',
                description: message.data.message || message.data.content,
              });
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        wsRef.current.onclose = (event) => {
          if (!mountedRef.current) return;
          
          clearTimeout(connectionTimeout);
          // Clear ping interval
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }
          
          isConnectingRef.current = false;
          setConnectionStatus('disconnected');
          console.log('WebSocket disconnected:', event.code, event.reason);
          // Log more detailed close information
          console.log('WebSocket close details:', {
            code: event.code,
            reason: event.reason || 'No reason provided',
            wasClean: event.wasClean,
            timestamp: new Date().toISOString(),
            readyState: wsRef.current ? wsRef.current.readyState : 'null',
          });
          onDisconnect?.();
          
          // Don't reconnect if:
          // 1. It was a normal/intentional closure (we set this flag on manual disconnects)
          // 2. Component is unmounting
          // 3. Specific codes we don't want to reconnect for
          // 4. We've exceeded max reconnect attempts
          const isIntentionalClose = normalCloseRef.current || event.code === 1000;
          const isAuthError = event.code === 4001;
          const shouldReconnect = 
            !isIntentionalClose &&
            mountedRef.current &&
            event.code !== 1001 && // Going away
            event.code !== 4001 && // Authentication error
            reconnectAttemptsRef.current < maxReconnectAttempts;
          
          if (shouldReconnect) {
            reconnectAttemptsRef.current++;
            
            // For code 1006 (abnormal closure), use longer delay
            const baseDelay = event.code === 1006 ? 10000 : reconnectInterval;
            const delay = Math.min(
              baseDelay * Math.pow(1.5, reconnectAttemptsRef.current - 1),
              30000 // Max 30 seconds
            );
            
            console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts}) in ${delay}ms... (code: ${event.code})`);
            
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                connect();
              }
            }, delay);
          } else if (event.code === 429) {
            // Rate limited - wait longer before retry
            console.warn('WebSocket connection rate limited, waiting 60 seconds before retry');
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                reconnectAttemptsRef.current = 0; // Reset attempts for rate limit
                connect();
              }
            }, 60000);
          } else {
            if (isAuthError) {
              console.log('WebSocket authentication failed. Not attempting reconnect.');
              // Could handle token refresh or redirect to login here
            } else if (isIntentionalClose) {
              console.log('WebSocket closed normally (intentional). Not attempting reconnect.');
            } else {
              console.log('WebSocket connection will not be retried:', event.code, event.reason);
              if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
                console.warn(`Maximum reconnection attempts (${maxReconnectAttempts}) reached`);
              }
            }
            
            // Reset reconnect attempts after waiting period to allow manual reconnection
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                reconnectAttemptsRef.current = 0;
              }
            }, 30000);
          }
        };

        wsRef.current.onerror = (error) => {
          if (!mountedRef.current) return;
          
          clearTimeout(connectionTimeout);
          isConnectingRef.current = false;
          setConnectionStatus('error');
          
          // Log more detailed error information
          const errorInfo = {
            type: error.type || 'websocket_error',
            timestamp: new Date().toISOString(),
            readyState: wsRef.current?.readyState,
            url: wsRef.current?.url,
            target: (error.target as WebSocket)?.readyState || 'Unknown state'
          };
          
          console.error('WebSocket connection error:', errorInfo);
          console.error('Raw error object:', error);
          onError?.(error);
          
          // Only show toast if not already showing connection issues
          if (connectionStatus !== 'error') {
            toast({
              title: 'Connection Error',
              description: 'Failed to connect to notification service. Retrying...',
              variant: 'destructive',
            });
          }
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        isConnectingRef.current = false;
        setConnectionStatus('error');
        if (connectionStatus !== 'error') {
          toast({
            title: 'Connection Error',
            description: 'Failed to connect to notification service.',
            variant: 'destructive',
          });
        }
      }
    }, 1000); // Reduced delay for faster response
  }, [user?.id, maxReconnectAttempts, reconnectInterval, connectionStatus, onConnect, onDisconnect, onError, toast]);

  // Setup connection effect
  useEffect(() => {
    // Only try to connect if user is authenticated
    if (user?.id && mountedRef.current) {
      // Reset flags when user changes
      normalCloseRef.current = false;
      reconnectAttemptsRef.current = 0;
      connect();
    }
    
    // Cleanup function - disconnectHandler is called on user change or unmount
    return () => {
      // Immediately mark as normal close to prevent reconnection attempts
      normalCloseRef.current = true;
      
      if (wsRef.current) {
        try {
          // Only attempt to close if not already closed
          if (wsRef.current.readyState !== WebSocket.CLOSED) {
            wsRef.current.close(1000, 'User changed or component unmounted');
          }
        } catch (err) {
          console.error('Error during WebSocket cleanup:', err);
        }
        wsRef.current = null;
      }
      
      // Clear any pending timeouts
      if (connectDebounceRef.current) clearTimeout(connectDebounceRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [user?.id, connect]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (!wsRef.current) {
      console.warn('Cannot send message: WebSocket not connected');
      return;
    }
    
    if (wsRef.current.readyState === WebSocket.OPEN) {
      const messageStr = JSON.stringify(message);
      wsRef.current.send(messageStr);
    } else {
      console.warn('WebSocket not in OPEN state, message not sent');
    }
  }, []);

  const disconnect = useCallback(() => {
    // Set flag to prevent automatic reconnection
    normalCloseRef.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (connectDebounceRef.current) {
      clearTimeout(connectDebounceRef.current);
      connectDebounceRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    if (wsRef.current) {
      try {
        // Only attempt to close if not already closed
        if (wsRef.current.readyState !== WebSocket.CLOSED) {
          wsRef.current.close(1000, 'Manual disconnect');
        }
      } catch (err) {
        console.error('Error during WebSocket disconnection:', err);
      }
      wsRef.current = null;
    }
    
    setConnectionStatus('disconnected');
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    // Reset flags
    normalCloseRef.current = false;
    reconnectAttemptsRef.current = 0;
    // Small delay before reconnecting
    setTimeout(() => {
      if (mountedRef.current) {
        connect();
      }
    }, 500);
  }, [connect, disconnect]);

  return {
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    sendMessage,
    disconnect,
    reconnect,
    lastMessage
  };
};

export default useWebSocket;

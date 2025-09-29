import { AlertTriangle, Settings, MessageSquare, CheckCircle, Clock, Edit, Mail, Smartphone, Bell, Monitor, Globe, Target, Megaphone, FileText, Zap, Filter, Search, MoreHorizontal, Eye, Copy, Trash2, Users, Send } from 'lucide-react';
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/lib/auth/auth-context';

interface TestNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: string;
}

export default function NotificationTestPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [testNotifications, setTestNotifications] = useState<TestNotification[]>([]);
  const [connectionLog, setConnectionLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConnectionLog(prev => [...prev.slice(-19), `${timestamp}: ${message}`]);
  };

  // WebSocket connection - DISABLED to prevent multiple connections during testing
  // const { isConnected, connectionStatus, sendMessage, lastMessage } = useWebSocket({
  //   onConnect: () => {
  //     addLog('✅ WebSocket connected successfully');
  //     toast({
  //       title: 'Connected',
  //       description: 'WebSocket connection established',
  //     });
  //   },
  //   onDisconnect: () => {
  //     addLog('❌ WebSocket disconnected');
  //   },
  //   onError: (error) => {
  //     addLog(`⚠️ WebSocket error: ${error.type}`);
  //   },
  //   onMessage: (message) => {
  //     addLog(`📨 Received message: ${message.type}`);
      
  //     if (message.type === 'notification') {
  //       const notification: TestNotification = {
  //         id: `test-${Date.now()}`,
  //         type: message.data.type || 'general',
  //         title: message.data.title || 'Test Notification',
  //         message: message.data.message || message.data.content || 'No message content',
  //         priority: message.data.priority || 'medium',
  //         timestamp: new Date().toISOString(),
  //       };
        
  //       setTestNotifications(prev => [notification, ...prev.slice(0, 9)]);
  //     }
  //   }
  // });
  
  // Mock values for disabled WebSocket
  const isConnected = false;
  const connectionStatus = 'disconnected';
  const sendMessage = (message: any) => addLog('⚠️ WebSocket disabled for testing');
  const lastMessage = null;

  const sendTestNotification = async (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    try {
      const response = await fetch('/api/v1/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          type: 'test_notification',
          title: `Test ${priority.toUpperCase()} Priority Notification`,
          message: `This is a test notification with ${priority} priority sent at ${new Date().toLocaleTimeString()}`,
          priority,
          user_id: user?.id,
        }),
      });

      if (response.ok) {
        addLog(`✉️ Test notification sent (${priority} priority)`);
        toast({
          title: 'Test Sent',
          description: `${priority} priority notification sent`,
        });
      } else {
        const error = await response.text();
        addLog(`❌ Failed to send test notification: ${error}`);
        toast({
          title: 'Send Failed',
          description: `Failed to send notification: ${response.status}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      addLog(`❌ Network error: ${error}`);
      toast({
        title: 'Network Error',
        description: 'Failed to send test notification',
        variant: 'destructive',
      });
    }
  };

  const sendWebSocketMessage = () => {
    const testMessage = {
      type: 'system_message' as const,
      data: {
        message: 'Test WebSocket message sent at ' + new Date().toLocaleTimeString(),
        source: 'test_page'
      },
      timestamp: new Date().toISOString(),
    };

    sendMessage(testMessage);
    addLog('📤 Sent WebSocket test message');
  };

  const clearLogs = () => {
    setConnectionLog([]);
    setTestNotifications([]);
  };

  useEffect(() => {
    addLog('🔄 NotificationTestPage component mounted');
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notification System Test</h1>
        <Badge variant={isConnected ? 'default' : 'destructive'}>
          {connectionStatus.toUpperCase()}
        </Badge>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle>WebSocket Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-semibold">Status:</p>
              <Badge variant={isConnected ? 'default' : 'destructive'}>
                {connectionStatus}
              </Badge>
            </div>
            <div>
              <p className="font-semibold">User:</p>
              <p className="text-sm text-muted-foreground">
                {user?.email || 'Not logged in'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Test Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-semibold mb-2">Send Test Notifications (HTTP API):</p>
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={() => sendTestNotification('low')} 
                variant="outline"
                size="sm"
              >
                Low Priority
              </Button>
              <Button 
                onClick={() => sendTestNotification('medium')} 
                variant="outline"
                size="sm"
              >
                Medium Priority
              </Button>
              <Button 
                onClick={() => sendTestNotification('high')} 
                variant="outline"
                size="sm"
              >
                High Priority
              </Button>
              <Button 
                onClick={() => sendTestNotification('urgent')} 
                variant="destructive"
                size="sm"
              >
                Urgent Priority
              </Button>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">WebSocket Tests:</p>
            <div className="flex gap-2">
              <Button 
                onClick={sendWebSocketMessage} 
                variant="outline"
                size="sm"
                disabled={!isConnected}
              >
                Send WebSocket Message
              </Button>
              <Button 
                onClick={clearLogs} 
                variant="outline"
                size="sm"
              >
                Clear Logs
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Log */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-sm max-h-64 overflow-y-auto">
            {connectionLog.length === 0 ? (
              <p className="text-gray-500">No log entries yet...</p>
            ) : (
              connectionLog.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Received Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Received Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {testNotifications.length === 0 ? (
            <p className="text-muted-foreground">No notifications received yet...</p>
          ) : (
            <div className="space-y-3">
              {testNotifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className="border rounded-lg p-3 bg-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{notification.title}</h4>
                    <div className="flex gap-2">
                      <Badge 
                        variant={
                          notification.priority === 'urgent' ? 'destructive' :
                          notification.priority === 'high' ? 'default' :
                          'secondary'
                        }
                      >
                        {notification.priority}
                      </Badge>
                      <Badge variant="outline">
                        {notification.type}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(notification.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last WebSocket Message */}
      {lastMessage && (
        <Card>
          <CardHeader>
            <CardTitle>Last WebSocket Message</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
              {JSON.stringify(lastMessage, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

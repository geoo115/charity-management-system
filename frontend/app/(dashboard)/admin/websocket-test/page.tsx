'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/components/ui/use-toast';
import WebSocketDiagnostics from '@/components/debug/WebSocketDiagnostics';

export default function WebSocketTestPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('diagnostics');
  
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`${timestamp}: ${message}`, ...prev]);
  };

  // WebSocket connection - DISABLED to prevent multiple connections during debugging
  // const { isConnected, connectionStatus, sendMessage } = useWebSocket({
  //   onConnect: () => {
  //     addLog('✅ WebSocket connected successfully');
  //     toast({
  //       title: 'WebSocket Connected',
  //       description: 'Connection established successfully',
  //     });
  //   },
  //   onDisconnect: () => {
  //     addLog('❌ WebSocket disconnected');
  //   },
  //   onError: (error) => {
  //     addLog(`⚠️ WebSocket error: ${error.type}`);
  //   },
  //   onMessage: (message) => {
  //     addLog(`📨 Received message: ${JSON.stringify(message)}`);
  //   }
  // });
  
  // Mock values for disabled WebSocket
  const isConnected = false;
  const connectionStatus = 'disconnected';
  const sendMessage = (message: any) => addLog('⚠️ WebSocket disabled for testing');
  
  // Send test message
  const sendTestMessage = () => {
    if (!isConnected) {
      addLog('⚠️ Cannot send message: WebSocket not connected');
      return;
    }
    
    const message = {
      type: 'system_message' as const, // Use const assertion to fix the type
      data: {
        message: 'WebSocket test message',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
    
    sendMessage(message);
    addLog(`📤 Sent test message: ${JSON.stringify(message)}`);
  };
  
  // Clear logs
  const clearLogs = () => {
    setLogs([]);
  };
  
  // Perform server-side test
  const performServerTest = async () => {
    try {
      addLog('🔍 Running server-side WebSocket test...');
      
      const response = await fetch('/api/v1/ws-heartbeat');
      if (response.ok) {
        const data = await response.json();
        addLog(`✅ Server heartbeat response: ${JSON.stringify(data)}`);
      } else {
        addLog(`❌ Server heartbeat failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      addLog(`❌ Server test error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold mb-4">WebSocket Testing Panel</h1>
      
      <WebSocketDiagnostics />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>
        
        {/* Diagnostics Tab */}
        <TabsContent value="diagnostics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Connection Status</span>
                <Badge variant={isConnected ? "default" : "destructive"}>
                  {connectionStatus.toUpperCase()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-2">
                <Button onClick={performServerTest}>
                  Test Server Connection
                </Button>
              </div>
              
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-md font-semibold">Logs</h3>
                  <Button variant="outline" size="sm" onClick={clearLogs}>
                    Clear Logs
                  </Button>
                </div>
                <div className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-sm max-h-64 overflow-y-auto">
                  {logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Testing Tab */}
        <TabsContent value="testing">
          <Card>
            <CardHeader>
              <CardTitle>Send Test Messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={sendTestMessage}
                  disabled={!isConnected}
                >
                  Send Test Message
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Monitoring Tab */}
        <TabsContent value="monitoring">
          <Card>
            <CardHeader>
              <CardTitle>WebSocket Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Real-time metrics for WebSocket connections and message throughput will appear here.
              </p>
              
              <div className="p-6 border-2 border-dashed rounded-lg text-center">
                <p>WebSocket monitoring panel under development.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

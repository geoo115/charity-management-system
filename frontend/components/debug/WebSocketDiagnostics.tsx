'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWebSocket } from '@/hooks/useWebSocket';

interface DiagnosticsProps {
  onlyForAdmin?: boolean;
}

const WebSocketDiagnostics: React.FC<DiagnosticsProps> = ({ onlyForAdmin = true }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [serverStatus, setServerStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [serverInfo, setServerInfo] = useState<any>(null);

  // Enable WebSocket hook connection
  const { isConnected, connectionStatus, lastMessage } = useWebSocket({
    onConnect: () => addLog('WebSocket connected successfully'),
    onDisconnect: () => addLog('WebSocket disconnected'),
    onError: (error) => addLog(`WebSocket error: ${error.type}`),
    onMessage: (message) => addLog(`Message received: ${message.type}`)
  });

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-19), `${timestamp}: ${message}`]);
  };

  const checkServerAvailability = async () => {
    try {
      setServerStatus('checking');
      const response = await fetch('/api/v1/ws-status');
      
      if (response.ok) {
        const data = await response.json();
        setServerInfo(data);
        setServerStatus('available');
        addLog(`Server status: available with ${data.active_sessions || 0} active connections`);
      } else {
        setServerStatus('unavailable');
        addLog(`Server status check failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      setServerStatus('unavailable');
      addLog(`Server status check error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  useEffect(() => {
    checkServerAvailability();
    // Check every minute
    const interval = setInterval(checkServerAvailability, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>WebSocket Diagnostics</span>
          <Badge variant={isConnected ? "default" : "destructive"}>
            {connectionStatus.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between">
            <div>
              <p className="text-sm font-medium">Server Status:</p>
              <Badge variant={
                serverStatus === 'available' ? 'default' : 
                serverStatus === 'unavailable' ? 'destructive' : 'secondary'
              }>
                {serverStatus}
              </Badge>
            </div>
            <Button size="sm" onClick={checkServerAvailability} variant="outline">
              Check Status
            </Button>
          </div>
          
          {serverInfo && (
            <div className="text-sm space-y-2">
              <p><strong>Active Sessions:</strong> {serverInfo.active_sessions || 0}</p>
              <p><strong>Available Endpoints:</strong></p>
              <ul className="list-disc pl-4">
                {serverInfo.endpoints?.map((endpoint: string) => (
                  <li key={endpoint}>{endpoint}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div>
            <p className="text-sm font-medium mb-2">Connection Logs:</p>
            <div className="bg-gray-900 text-green-400 p-3 rounded-md font-mono text-xs h-32 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="mb-1">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WebSocketDiagnostics;

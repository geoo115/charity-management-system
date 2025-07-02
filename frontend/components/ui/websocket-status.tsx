'use client';

import React from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface WebSocketStatusProps {
  showLabel?: boolean;
  showTooltip?: boolean;
  className?: string;
}

export function WebSocketStatus({ showLabel = false, showTooltip = true, className = '' }: WebSocketStatusProps) {
  // Enable WebSocket connection for status indicator
  const { connectionStatus } = useWebSocket({
    // Using minimal options to avoid duplicating notifications
    onConnect: () => console.log('Status indicator: WebSocket connected'),
    onDisconnect: () => console.log('Status indicator: WebSocket disconnected'),
  });
  
  const getStatusDetails = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          label: 'Connected',
          tooltip: 'Real-time notifications are active',
          variant: 'default' as const,
          color: 'bg-green-500'
        };
      case 'connecting':
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          label: 'Connecting',
          tooltip: 'Establishing real-time connection...',
          variant: 'secondary' as const,
          color: 'bg-yellow-500'
        };
      case 'disconnected':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          label: 'Disconnected',
          tooltip: 'No real-time connection',
          variant: 'outline' as const,
          color: 'bg-gray-500'
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          label: 'Error',
          tooltip: 'Connection error, notifications may be delayed',
          variant: 'destructive' as const,
          color: 'bg-red-500'
        };
      default:
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          label: 'Unknown',
          tooltip: 'Connection status unknown',
          variant: 'outline' as const,
          color: 'bg-gray-500'
        };
    }
  };
  
  const status = getStatusDetails();
  
  const statusIndicator = (
    <Badge 
      variant={status.variant} 
      className={`${className} flex items-center gap-1 px-1.5 py-0.5`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${status.color}`} />
      {showLabel && <span className="text-xs">{status.label}</span>}
    </Badge>
  );
  
  if (!showTooltip) return statusIndicator;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {statusIndicator}
        </TooltipTrigger>
        <TooltipContent>
          <p>{status.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

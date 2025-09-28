import React from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Check, CheckCheck, Clock, Paperclip } from 'lucide-react';

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  recipient_id: number;
  content: string;
  message_type: string;
  attachment_url?: string;
  attachment_name?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
  is_system_msg?: boolean;
}

interface MessageItemProps {
  message: Message;
  isOwnMessage: boolean;
  showAvatar?: boolean;
  currentUserId: number;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isOwnMessage,
  showAvatar = true,
  currentUserId
}) => {
  const formatMessageTime = (timestamp: string) => {
    return format(new Date(timestamp), 'HH:mm');
  };

  const formatMessageDate = (timestamp: string) => {
    return format(new Date(timestamp), 'MMM dd, yyyy');
  };

  const getMessageStatus = () => {
    if (!isOwnMessage) return null;
    
    if (message.read_at) {
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    } else {
      return <Check className="h-3 w-3 text-gray-400" />;
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (message.is_system_msg) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex gap-3 mb-4',
      isOwnMessage && 'flex-row-reverse'
    )}>
      {/* Avatar */}
      {showAvatar && !isOwnMessage && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {getUserInitials(message.sender_name)}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message Content */}
      <div className={cn(
        'flex flex-col max-w-[70%]',
        isOwnMessage && 'items-end'
      )}>
        {/* Sender name and time */}
        <div className={cn(
          'flex items-center gap-2 mb-1 text-xs text-muted-foreground',
          isOwnMessage && 'flex-row-reverse'
        )}>
          {!isOwnMessage && (
            <span className="font-medium">{message.sender_name}</span>
          )}
          <span>{formatMessageTime(message.created_at)}</span>
          {getMessageStatus()}
        </div>

        {/* Message bubble */}
        <div className={cn(
          'rounded-lg px-3 py-2 text-sm',
          isOwnMessage 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted'
        )}>
          {/* Attachment */}
          {message.attachment_url && (
            <div className={cn(
              'flex items-center gap-2 mb-2 p-2 rounded border',
              isOwnMessage 
                ? 'border-primary-foreground/20 bg-primary-foreground/10' 
                : 'border-border bg-background/50'
            )}>
              <Paperclip className="h-4 w-4" />
              <a 
                href={message.attachment_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm hover:underline truncate"
              >
                {message.attachment_name || 'Attachment'}
              </a>
            </div>
          )}

          {/* Message content */}
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>
      </div>
    </div>
  );
};

interface MessageListProps {
  messages: Message[];
  currentUserId: number;
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  loading = false,
  onLoadMore,
  hasMore = false
}) => {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredMessages = React.useMemo(() => {
    // Remove messages that have no textual content and no attachment
    return messages.filter(m => {
      const emptyContent = !m.content || String(m.content).trim() === '';
      const hasAttachment = !!m.attachment_url;
      // Keep messages that have content or an attachment; otherwise drop them
      return !(emptyContent && !hasAttachment);
    });
  }, [messages]);

  React.useEffect(() => {
    scrollToBottom();
  }, [filteredMessages]);

  if (loading && filteredMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground animate-spin" />
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (filteredMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-lg mb-2">No messages yet</h3>
          <p className="text-muted-foreground text-sm">
            Start a conversation by sending your first message.
          </p>
        </div>
      </div>
    );
  }

  // Group messages by date
  const groupedMessages = filteredMessages.reduce((groups: { [key: string]: Message[] }, message) => {
    const date = format(new Date(message.created_at), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Load more button */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="text-sm text-primary hover:underline disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load more messages'}
          </button>
        </div>
      )}

      {/* Messages grouped by date */}
      {Object.entries(groupedMessages).map(([date, dayMessages]) => (
        <div key={date}>
          {/* Date separator */}
          <div className="flex justify-center mb-4">
            <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
              {format(new Date(date), 'EEEE, MMMM dd, yyyy')}
            </div>
          </div>

          {/* Messages for this date */}
          {dayMessages.map((message, index) => {
            const prevMessage = index > 0 ? dayMessages[index - 1] : null;
            const showAvatar = !prevMessage || prevMessage.sender_id !== message.sender_id;
            
            return (
              <MessageItem
                key={message.id}
                message={message}
                isOwnMessage={message.sender_id === currentUserId}
                showAvatar={showAvatar}
                currentUserId={currentUserId}
              />
            );
          })}
        </div>
      ))}

      <div ref={messagesEndRef} />
    </div>
  );
};
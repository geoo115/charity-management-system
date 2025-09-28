import React from 'react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, MessageCircle, Clock } from 'lucide-react';

export interface Conversation {
  id: number;
  type: string;
  title?: string;
  participants: Array<{
    user_id: number;
    name: string;
    role: string;
    avatar_url?: string;
  }>;
  last_message?: {
    id: number;
    content: string;
    sender_name: string;
    sender_id: number;
    created_at: string;
    is_read: boolean;
  };
  unread_count?: number;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
}

interface ConversationItemProps {
  conversation: Conversation;
  currentUserId: number;
  isSelected?: boolean;
  onClick: () => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  currentUserId,
  isSelected = false,
  onClick
}) => {
  const getOtherParticipant = () => {
    return conversation.participants.find(p => p.user_id !== currentUserId);
  };

  const formatLastMessageTime = (timestamp?: string) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM dd');
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

  const truncateMessage = (content: string, maxLength: number = 50) => {
    return content.length > maxLength ? content.slice(0, maxLength) + '...' : content;
  };

  const otherParticipant = getOtherParticipant();
  const conversationTitle = conversation.title || otherParticipant?.name || 'Conversation';
  const hasUnread = (conversation.unread_count || 0) > 0;
  const lastMessage = conversation.last_message;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-muted/50',
        isSelected && 'bg-muted border-r-2 border-r-primary',
        hasUnread && 'bg-blue-50 dark:bg-blue-950/20'
      )}
      onClick={onClick}
    >
      {/* Avatar */}
      <Avatar className="w-10 h-10 flex-shrink-0">
        <AvatarImage src={otherParticipant?.avatar_url} />
        <AvatarFallback className="text-sm bg-primary/10 text-primary">
          {otherParticipant ? getUserInitials(otherParticipant.name) : '?'}
        </AvatarFallback>
      </Avatar>

      {/* Conversation details */}
      <div className="flex-1 min-w-0">
        {/* Header: Name and time */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn(
              'font-medium text-sm truncate',
              hasUnread && 'font-semibold'
            )}>
              {conversationTitle}
            </span>
            {otherParticipant?.role && (
              <Badge variant="outline" className="text-xs px-1 py-0 h-5">
                {otherParticipant.role}
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
            {formatLastMessageTime(conversation.last_message_at || conversation.updated_at)}
          </span>
        </div>

        {/* Last message and unread count */}
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {lastMessage ? (
              <div className="flex items-center gap-1">
                {lastMessage.sender_id === currentUserId && (
                  <CheckCircle className={cn(
                    'h-3 w-3 flex-shrink-0',
                    lastMessage.is_read ? 'text-blue-500' : 'text-gray-400'
                  )} />
                )}
                <p className={cn(
                  'text-sm text-muted-foreground truncate',
                  hasUnread && lastMessage.sender_id !== currentUserId && 'font-medium text-foreground'
                )}>
                  {lastMessage.sender_id === currentUserId && 'You: '}
                  {truncateMessage(lastMessage.content)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No messages yet
              </p>
            )}
          </div>

          {/* Unread badge */}
          {hasUnread && (
            <Badge className="ml-2 bg-primary text-primary-foreground min-w-[20px] h-5 text-xs flex items-center justify-center">
              {conversation.unread_count! > 99 ? '99+' : conversation.unread_count}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

interface ConversationListProps {
  conversations: Conversation[];
  currentUserId: number;
  selectedConversationId?: number;
  onConversationSelect: (conversation: Conversation) => void;
  loading?: boolean;
  onRefresh?: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  currentUserId,
  selectedConversationId,
  onConversationSelect,
  loading = false,
  onRefresh
}) => {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground animate-spin" />
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-lg mb-2">No conversations</h3>
          <p className="text-muted-foreground text-sm">
            Start your first conversation by messaging an admin or team member.
          </p>
        </div>
      </div>
    );
  }

  // Sort conversations by last message time
  const sortedConversations = [...conversations].sort((a, b) => {
    const aTime = new Date(a.last_message_at || a.updated_at).getTime();
    const bTime = new Date(b.last_message_at || b.updated_at).getTime();
    return bTime - aTime;
  });

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Refresh indicator */}
      {loading && (
        <div className="p-3 border-b bg-muted/50 text-center text-sm text-muted-foreground">
          Updating conversations...
        </div>
      )}

      {/* Conversation list */}
      <div className="divide-y">
        {sortedConversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            currentUserId={currentUserId}
            isSelected={selectedConversationId === conversation.id}
            onClick={() => onConversationSelect(conversation)}
          />
        ))}
      </div>
    </div>
  );
};
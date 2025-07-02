'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Clock, 
  Award, 
  Mail, 
  Phone, 
  MessageSquare,
  Calendar,
  TrendingUp,
  Target
} from 'lucide-react';

interface TeamMemberCardProps {
  member: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    role_level: string;
    total_hours: number;
    performance_score: number;
    last_active: string;
    status: 'active' | 'inactive';
    specializations?: string[];
    completed_tasks?: number;
    upcoming_shifts?: number;
  };
  onContact?: (memberId: number, method: 'email' | 'phone' | 'message') => void;
  onViewProfile?: (memberId: number) => void;
  onAssignTask?: (memberId: number) => void;
}

export default function TeamMemberCard({
  member,
  onContact,
  onViewProfile,
  onAssignTask
}: TeamMemberCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getRoleColor = (roleLevel: string) => {
    switch (roleLevel) {
      case 'lead':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'specialized':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'general':
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusColor = (status: string) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatLastActive = (lastActive: string) => {
    const date = new Date(lastActive);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return `${Math.floor(diffInHours / 168)}w ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="w-full"
    >
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={`/api/avatars/${member.id}`} alt={`${member.first_name} ${member.last_name}`} />
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {member.first_name[0]}{member.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg font-semibold">
                  {member.first_name} {member.last_name}
                </CardTitle>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline" className={getRoleColor(member.role_level)}>
                    {member.role_level.charAt(0).toUpperCase() + member.role_level.slice(1)}
                  </Badge>
                  <Badge variant="outline" className={getStatusColor(member.status)}>
                    {member.status}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Less' : 'More'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-600">Hours</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{member.total_hours}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1">
                <Target className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-gray-600">Performance</span>
              </div>
              <p className={`text-lg font-bold ${getPerformanceColor(member.performance_score)}`}>
                {member.performance_score}%
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1">
                <Calendar className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-600">Upcoming</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{member.upcoming_shifts || 0}</p>
            </div>
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-4 border-t"
            >
              {/* Specializations */}
              {member.specializations && member.specializations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Specializations</h4>
                  <div className="flex flex-wrap gap-2">
                    {member.specializations.map((spec, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Last Active</h4>
                  <p className="text-sm text-gray-600">{formatLastActive(member.last_active)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Completed Tasks</h4>
                  <p className="text-sm text-gray-600">{member.completed_tasks || 0}</p>
                </div>
              </div>

              {/* Contact Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex space-x-2">
                  {onContact && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onContact(member.id, 'email')}
                        className="flex items-center space-x-1"
                      >
                        <Mail className="h-3 w-3" />
                        <span>Email</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onContact(member.id, 'message')}
                        className="flex items-center space-x-1"
                      >
                        <MessageSquare className="h-3 w-3" />
                        <span>Message</span>
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex space-x-2">
                  {onViewProfile && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewProfile(member.id)}
                    >
                      View Profile
                    </Button>
                  )}
                  {onAssignTask && (
                    <Button
                      size="sm"
                      onClick={() => onAssignTask(member.id)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Assign Task
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Quick Actions */}
          {!isExpanded && (
            <div className="flex justify-end space-x-2 pt-2">
              {onContact && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onContact(member.id, 'email')}
                >
                  <Mail className="h-4 w-4" />
                </Button>
              )}
              {onAssignTask && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onAssignTask(member.id)}
                >
                  <Award className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
} 
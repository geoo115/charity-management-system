'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Star,
  FileText,
  Download,
  Filter,
  Search
} from 'lucide-react';
import { Visit } from '@/lib/types/visitor';
import { formatDate } from '@/lib/utils/date-utils';

interface VisitHistoryProps {
  visits: Visit[];
  loading?: boolean;
  onFeedbackSubmit?: (visitId: number) => void;
}

export const VisitHistory: React.FC<VisitHistoryProps> = ({ 
  visits, 
  loading = false,
  onFeedbackSubmit 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { 
        className: 'bg-green-50 text-green-700', 
        label: 'Completed' 
      },
      scheduled: { 
        className: 'bg-blue-50 text-blue-700', 
        label: 'Scheduled' 
      },
      cancelled: { 
        className: 'bg-red-50 text-red-700', 
        label: 'Cancelled' 
      },
      no_show: { 
        className: 'bg-orange-50 text-orange-700', 
        label: 'No Show' 
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      className: 'bg-gray-50 text-gray-700',
      label: status
    };

    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < rating 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const filteredVisits = visits.filter(visit => {
    const matchesSearch = visit.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         visit.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || visit.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || visit.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search visits..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="no_show">No Show</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Food">Food Support</SelectItem>
                <SelectItem value="General">General Support</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Visits List */}
      {filteredVisits.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No visits found</h3>
            <p className="text-gray-500">
              {visits.length === 0 
                ? "You haven't made any visits yet." 
                : "No visits match your current filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredVisits.map((visit) => (
            <Card key={visit.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-medium">{visit.reference}</h3>
                      {getStatusBadge(visit.status)}
                    </div>
                    <p className="text-sm text-gray-600">{visit.category}</p>
                  </div>
                  
                  <div className="text-right text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(visit.visitDate)}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {visit.timeSlot}
                    </div>
                  </div>
                </div>

                {/* Visit Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {visit.checkInTime && (
                    <div>
                      <span className="text-sm font-medium">Check-in Time:</span>
                      <p className="text-sm text-gray-600">
                        {formatDate(visit.checkInTime, { withTime: true })}
                      </p>
                    </div>
                  )}
                  
                  {visit.checkOutTime && (
                    <div>
                      <span className="text-sm font-medium">Check-out Time:</span>
                      <p className="text-sm text-gray-600">
                        {formatDate(visit.checkOutTime, { withTime: true })}
                      </p>
                    </div>
                  )}
                  
                  {visit.services && visit.services.length > 0 && (
                    <div className="md:col-span-2">
                      <span className="text-sm font-medium">Services Received:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {visit.services.map((service, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Feedback */}
                {visit.feedback && (
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Your Feedback:</span>
                      <div className="flex items-center space-x-1">
                        {renderStars(visit.feedback.rating)}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{visit.feedback.comments}</p>
                  </div>
                )}

                {/* Notes */}
                {visit.notes && (
                  <div className="border-t pt-4">
                    <span className="text-sm font-medium">Notes:</span>
                    <p className="text-sm text-gray-600">{visit.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-2 mt-4">
                  {visit.status === 'completed' && !visit.feedback && onFeedbackSubmit && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onFeedbackSubmit(visit.id)}
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Leave Feedback
                    </Button>
                  )}
                  
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download Summary
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default VisitHistory;

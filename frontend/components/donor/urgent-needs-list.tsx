import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface UrgentNeed {
  id?: number;
  category: string;
  urgency: string;
  needed_by: string;
  title?: string;
  description?: string;
  target?: number;
  current?: number;
}

interface UrgentNeedsListProps {
  needs: UrgentNeed[];
}

export const UrgentNeedsList: React.FC<UrgentNeedsListProps> = ({ needs }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
          Urgent Needs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {needs.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No urgent needs at the moment</p>
        ) : (
          <div className="space-y-4">
            {needs.map((need, index) => (
              <div key={need.id || `${need.category}-${index}`} className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{need.title || need.category}</h4>
                    <p className="text-sm text-muted-foreground">
                      {need.description || `Urgency: ${need.urgency} - Needed by: ${need.needed_by}`}
                    </p>
                  </div>
                  <span className="text-sm font-medium">
                    {need.current !== undefined && need.target !== undefined 
                      ? `£${need.current} / £${need.target}`
                      : need.urgency
                    }
                  </span>
                </div>
                {need.current !== undefined && need.target !== undefined ? (
                  <Progress value={(need.current / need.target) * 100} className="h-2" />
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className={`h-2 w-full rounded-full ${
                      need.urgency === 'High' ? 'bg-red-200' :
                      need.urgency === 'Medium' ? 'bg-yellow-200' : 'bg-green-200'
                    }`}>
                      <div className={`h-2 rounded-full ${
                        need.urgency === 'High' ? 'bg-red-500 w-4/5' :
                        need.urgency === 'Medium' ? 'bg-yellow-500 w-3/5' : 'bg-green-500 w-2/5'
                      }`}></div>
                    </div>
                  </div>
                )}
                <Button size="sm" variant="outline" className="w-full">
                  Donate Now
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

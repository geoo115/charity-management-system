import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils/date-utils';
import { DollarSign, Gift } from 'lucide-react';

interface Donation {
  id: number;
  amount: number;
  type: 'monetary' | 'goods';
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

interface DonationHistoryListProps {
  donations: Donation[] | null | undefined;
}

export const DonationHistoryList: React.FC<DonationHistoryListProps> = ({ donations }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <DollarSign className="h-5 w-5 mr-2" />
          Recent Donations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!donations || donations.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No donations yet</p>
        ) : (
          <div className="space-y-3">
            {donations.map((donation) => (
              <div key={donation.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center">
                  {donation.type === 'monetary' ? (
                    <DollarSign className="h-5 w-5 mr-3 text-green-500" />
                  ) : (
                    <Gift className="h-5 w-5 mr-3 text-blue-500" />
                  )}
                  <div>
                    <p className="font-medium">
                      {donation.type === 'monetary' ? `£${donation.amount.toFixed(2)}` : donation.type}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(donation.date, { relative: true })}
                    </p>
                  </div>
                </div>
                <Badge variant={donation.status === 'completed' ? 'default' : 'secondary'}>
                  {donation.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

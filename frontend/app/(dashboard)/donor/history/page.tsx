'use client';

import { useEffect, useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SearchIcon, DownloadIcon, FilterIcon, CalendarIcon, BanknoteIcon, PackageIcon, ReceiptIcon, EyeIcon, DownloadCloudIcon, Filter, Search } from 'lucide-react';
import { fetchDonorHistory } from '@/lib/api/donor';
import { formatDate } from '@/lib/utils/date-utils';
import LoadingSpinner from '@/components/common/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';

export default function DonorHistoryPage() {
  const [historyData, setHistoryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedDonation, setSelectedDonation] = useState<any>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await fetchDonorHistory();
        setHistoryData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load donation history');
        console.error('History error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading your donation history..." />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const { donations = [], totalDonations = 0, totalAmount = 0, averageDonation = 0 } = historyData || {};

  // Filter donations based on search and filters
  const filteredDonations = (donations || []).filter((donation: any) => {
    const matchesSearch = (donation.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (donation.receipt || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || donation.type === filterType;
    const matchesStatus = filterStatus === 'all' || donation.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const downloadReceipt = (donation: any) => {
    // Mock receipt download
    console.log('Downloading receipt for donation:', donation.id);
    // In real implementation, this would generate and download a PDF
  };

  const exportHistory = () => {
    // Mock export functionality
    console.log('Exporting donation history');
    // In real implementation, this would generate a CSV/PDF file
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Donation History</h1>
          <p className="text-muted-foreground mt-2">
            Track all your donations and their impact on the community
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button variant="outline" onClick={exportHistory}>
            <DownloadCloudIcon className="h-4 w-4 mr-2" />
            Export History
          </Button>
        </div>
      </motion.div>

      {/* Summary Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDonations}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All time donations
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{totalAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Combined value
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Donation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{averageDonation.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Per donation
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters and Search */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col md:flex-row gap-4"
      >
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search donations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="monetary">Monetary</SelectItem>
            <SelectItem value="item">Items</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Donations List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Donation History</CardTitle>
            <CardDescription>
              {filteredDonations.length} of {donations.length} donations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredDonations.map((donation: any) => (
                <motion.div
                  key={donation.id || `donation-${donation.date}-${donation.type}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${
                      donation.type === 'monetary' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {donation.type === 'monetary' ? (
                        <BanknoteIcon className="h-5 w-5" />
                      ) : (
                        <PackageIcon className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{donation.description}</p>
                        <Badge variant={donation.status === 'completed' ? 'default' : 'secondary'}>
                          {donation.status}
                        </Badge>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        {formatDate(donation.date)}
                        {donation.amount && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="font-medium">£{donation.amount.toFixed(2)}</span>
                          </>
                        )}
                      </div>
                      {donation.impact && (
                        <p className="text-sm text-green-600 mt-1">
                          💚 {donation.impact}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {donation.receipt && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadReceipt(donation)}
                      >
                        <DownloadIcon className="h-4 w-4 mr-1" />
                        Receipt
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDonation(donation)}
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                  </div>
                </motion.div>
              ))}
              
              {filteredDonations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <PackageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No donations found matching your criteria</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Donation Detail Modal */}
      {selectedDonation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Donation Details</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDonation(null)}
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="mt-1">{selectedDonation.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date</label>
                  <p className="mt-1">{formatDate(selectedDonation.date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Badge className="mt-1">{selectedDonation.status}</Badge>
                </div>
              </div>
              
              {selectedDonation.amount && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Amount</label>
                  <p className="mt-1 text-lg font-semibold">£{selectedDonation.amount.toFixed(2)}</p>
                </div>
              )}
              
              {selectedDonation.items && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Items Donated</label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedDonation.items.map((item: string, index: number) => (
                      <Badge key={index} variant="outline">{item}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedDonation.impact && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Impact</label>
                  <p className="mt-1 text-green-600">{selectedDonation.impact}</p>
                </div>
              )}
              
              {selectedDonation.receipt && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Receipt</label>
                  <p className="mt-1 font-mono text-sm">{selectedDonation.receipt}</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 mt-6">
              {selectedDonation.receipt && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => downloadReceipt(selectedDonation)}
                >
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Download Receipt
                </Button>
              )}
              <Button
                className="flex-1"
                onClick={() => setSelectedDonation(null)}
              >
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
} 
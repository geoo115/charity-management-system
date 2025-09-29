'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { 
  getDonations, 
  updateDonationStatus, 
  sendDonationReceipt, 
  getDonationAnalytics,
  AdminDonation 
} from '@/lib/api/admin-comprehensive';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Gift, Search, Filter, MoreHorizontal, Eye, CheckCircle, XCircle, Download, Calendar, DollarSign, TrendingUp, Users, RefreshCw, CheckSquare, ChevronLeft, ChevronRight, Mail, CreditCard, Heart, Target, Zap, Send } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/common/loading-spinner';
import { formatDistanceToNow } from 'date-fns';

export default function AdminDonationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [donations, setDonations] = useState<AdminDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalDonations, setTotalDonations] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [bulkSelection, setBulkSelection] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    dateRange: 'all',
    amount_min: '',
    amount_max: '',
    method: 'all',
  });

  useEffect(() => {
    if (user?.role === 'Admin') {
      loadDonations();
    }
  }, [user, currentPage, filters]);

  const loadDonations = useCallback(async () => {
    try {
      setRefreshing(true);
      
      // Fetch donations with filters
      const response = await getDonations({
        status: filters.status !== 'all' ? filters.status : undefined,
        page: currentPage,
        per_page: 20,
      });

      setDonations(response.donations);
      setTotalDonations(response.total);

      // Load analytics
      const analytics = await getDonationAnalytics();
      setTotalAmount(analytics.total_amount);
      setMonthlyTotal(analytics.monthly_total);
      setPendingCount(analytics.pending_count);
    } catch (error: any) {
      console.error('Error loading donations:', error);
      setDonations([]);
      toast({
        title: 'Error',
        description: 'Failed to load donations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, filters, toast]);

  const handleBulkAction = async () => {
    if (!bulkAction || bulkSelection.length === 0) return;

    try {
      if (bulkAction === 'send_receipt') {
        await Promise.all(
          bulkSelection.map((id: string) => sendDonationReceipt(id))
        );
        toast({
          title: 'Success',
          description: `${bulkSelection.length} receipts sent successfully`,
        });
      } else if (bulkAction === 'mark_completed') {
        await Promise.all(
          bulkSelection.map((id: string) => updateDonationStatus(id, 'completed'))
        );
        toast({
          title: 'Success',
          description: `${bulkSelection.length} donations marked as completed`,
        });
      }
      
      setBulkSelection([]);
      setBulkAction('');
      setSelectAll(false);
      setShowBulkDialog(false);
      loadDonations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to perform bulk action',
        variant: 'destructive',
      });
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setBulkSelection([]);
      setSelectAll(false);
    } else {
      setBulkSelection((donations || []).map(donation => donation.id));
      setSelectAll(true);
    }
  };

  const handleSelectDonation = (id: string) => {
    setBulkSelection((prev: string[]) => {
      if (prev.includes(id)) {
        const newSelection = prev.filter((donationId: string) => donationId !== id);
        if (newSelection.length === 0) setSelectAll(false);
        return newSelection;
      } else {
        const newSelection = [...prev, id];
        if (newSelection.length === (donations || []).length) setSelectAll(true);
        return newSelection;
      }
    });
  };

  const exportData = () => {
    if (!(donations || []).length) return;
    
    const csvData = (donations || []).map(donation => ({
      id: donation.id,
      donor_name: donation.donor_name || 'Anonymous',
      email: donation.donor_email || '',
      amount: donation.amount,
      currency: donation.currency || 'GBP',
      status: donation.status,
      payment_method: donation.payment_method || '',
      created_at: donation.created_at,
    }));
    
    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `donations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(totalDonations / 20);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'refunded': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const sendReceipt = async (donation: AdminDonation) => {
    try {
      await sendDonationReceipt(donation.id);
      toast({
        title: 'Success',
        description: 'Receipt sent successfully',
      });
      loadDonations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to send receipt',
        variant: 'destructive',
      });
    }
  };

  const updateStatus = async (donationId: string, status: 'pending' | 'completed' | 'failed' | 'refunded') => {
    try {
      await updateDonationStatus(donationId, status);
      toast({
        title: 'Success',
        description: 'Donation status updated',
      });
      loadDonations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update donation status',
        variant: 'destructive',
      });
    }
  };

  if (loading && donations.length === 0) {
    return <LoadingSpinner message="Loading donations..." />;
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            Donations Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Track, manage, and analyze all donations with comprehensive tools and insights
          </p>
        </div>
        <div className="flex gap-2 mt-4 lg:mt-0">
          <Button 
            variant="outline" 
            onClick={loadDonations}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline" onClick={exportData} disabled={!donations.length}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          {bulkSelection.length > 0 && (
            <Button variant="outline" onClick={() => setShowBulkDialog(true)}>
              <CheckSquare className="h-4 w-4 mr-2" />
              Bulk Actions ({bulkSelection.length})
            </Button>
          )}
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
            <Gift className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{totalDonations}</div>
            <p className="text-xs text-muted-foreground">All time donations</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(totalAmount)}
            </div>
            <p className="text-xs text-muted-foreground">All donations combined</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              {formatCurrency(monthlyTotal)}
            </div>
            <p className="text-xs text-muted-foreground">Current month total</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Target className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Advanced Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div>
              <Label className="text-sm font-medium mb-2 block">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by donor, email..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Payment Method</Label>
              <Select
                value={filters.method}
                onValueChange={(value) => setFilters({ ...filters, method: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All methods</SelectItem>
                  <SelectItem value="card">Credit Card</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Min Amount</Label>
              <Input
                type="number"
                placeholder="£0.00"
                value={filters.amount_min}
                onChange={(e) => setFilters({ ...filters, amount_min: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Max Amount</Label>
              <Input
                type="number"
                placeholder="£1000.00"
                value={filters.amount_max}
                onChange={(e) => setFilters({ ...filters, amount_max: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Sort By</Label>
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Date</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="donor_name">Donor Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Donations Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Donations ({totalDonations})
          </CardTitle>
          {donations.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectAll}
                onCheckedChange={handleSelectAll}
                id="select-all"
              />
              <Label htmlFor="select-all" className="text-sm">
                Select All
              </Label>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Select</TableHead>
                  <TableHead>Donor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(donations) && donations.length > 0 ? donations.map((donation) => (
                  <TableRow 
                    key={donation.id}
                    className={`hover:bg-muted/50 ${bulkSelection.includes(donation.id) ? 'bg-blue-50' : ''}`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={bulkSelection.includes(donation.id)}
                        onCheckedChange={() => handleSelectDonation(donation.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-semibold text-blue-700">
                          {donation.donor_name || 'Anonymous'}
                        </div>
                        {donation.donor_email && (
                          <div className="text-sm text-muted-foreground">
                            {donation.donor_email}
                          </div>
                        )}
                        {donation.notes && (
                          <div className="text-xs text-muted-foreground italic">
                            "{donation.notes.substring(0, 50)}..."
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-green-700">
                        {formatCurrency(donation.amount, donation.currency)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(donation.status)}>
                        {donation.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        <span className="text-sm">
                          {donation.payment_method || 'Unknown'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDistanceToNow(new Date(donation.created_at), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-blue-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/donations/${donation.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {donation.status === 'completed' && (
                            <DropdownMenuItem
                              onClick={() => sendReceipt(donation)}
                              className="text-blue-600"
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Send Receipt
                            </DropdownMenuItem>
                          )}
                          {donation.status === 'pending' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => updateStatus(donation.id, 'completed')}
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark Completed
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateStatus(donation.id, 'failed')}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Mark Failed
                              </DropdownMenuItem>
                            </>
                          )}
                          {donation.status === 'completed' && (
                            <DropdownMenuItem
                              onClick={() => updateStatus(donation.id, 'refunded')}
                              className="text-orange-600"
                            >
                              <Zap className="h-4 w-4 mr-2" />
                              Process Refund
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <div className="flex flex-col items-center gap-2">
                        <Gift className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">No donations found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * 20 + 1} to {Math.min(currentPage * 20, totalDonations)} of {totalDonations} donations
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Actions</DialogTitle>
            <DialogDescription>
              Perform actions on {bulkSelection.length} selected donations
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="bulk-action">Select Action</Label>
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="send_receipt">Send Receipts</SelectItem>
                  <SelectItem value="mark_completed">Mark as Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkAction} disabled={!bulkAction}>
              Apply to {bulkSelection.length} donations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

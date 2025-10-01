'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Mail, Phone, Calendar, DollarSign } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Donor {
  id: number;
  name: string;
  email: string;
  phone?: string;
  totalDonated: number;
  lastDonation: string;
  donationCount: number;
  status: 'active' | 'inactive';
  joinedDate: string;
}

export default function AdminDonorsPage() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDonors();
  }, []);

  const fetchDonors = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/donors`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDonors(data);
      } else {
        // For now, use mock data if API isn't ready
        setDonors([
          {
            id: 1,
            name: 'John Smith',
            email: 'john@example.com',
            phone: '+1-555-0123',
            totalDonated: 2500.00,
            lastDonation: '2024-01-15',
            donationCount: 8,
            status: 'active',
            joinedDate: '2023-06-15'
          },
          {
            id: 2,
            name: 'Sarah Johnson',
            email: 'sarah@example.com',
            phone: '+1-555-0456',
            totalDonated: 1200.00,
            lastDonation: '2024-01-10',
            donationCount: 4,
            status: 'active',
            joinedDate: '2023-09-20'
          },
          {
            id: 3,
            name: 'Mike Davis',
            email: 'mike@example.com',
            totalDonated: 800.00,
            lastDonation: '2023-12-05',
            donationCount: 3,
            status: 'inactive',
            joinedDate: '2023-08-10'
          }
        ]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load donors",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDonors = donors.filter(donor =>
    donor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    donor.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Donor Management</h1>
        </div>
        <div className="text-center py-8">Loading donors...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Donor Management</h1>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Donor
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserPlus className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Donors</p>
                <p className="text-2xl font-bold">{donors.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Raised</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(donors.reduce((sum, donor) => sum + donor.totalDonated, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Donors</p>
                <p className="text-2xl font-bold">
                  {donors.filter(d => d.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Donation</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    donors.reduce((sum, donor) => sum + donor.totalDonated, 0) /
                    donors.reduce((sum, donor) => sum + donor.donationCount, 0) || 0
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search donors by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Donors Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Donors ({filteredDonors.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredDonors.map((donor) => (
              <div key={donor.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{donor.name}</h3>
                      <Badge variant={donor.status === 'active' ? 'default' : 'secondary'}>
                        {donor.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>{donor.email}</span>
                      </div>
                      
                      {donor.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{donor.phone}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span>{formatCurrency(donor.totalDonated)} ({donor.donationCount} donations)</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>Last: {formatDate(donor.lastDonation)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                    <Button variant="outline" size="sm">
                      Send Message
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredDonors.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No donors found matching your search.' : 'No donors registered yet.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
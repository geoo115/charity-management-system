'use client';

import React, { useState } from 'react';
import { 
  Heart, 
  Mail, 
  User, 
  Phone, 
  MapPin, 
  Calendar,
  CreditCard,
  Shield,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

// Import our enhanced components
import {
  EnhancedButton,
  EnhancedInput,
  EnhancedCard,
  EnhancedAlert,
  EnhancedLoading
} from '@/lib/design-system/components';

// Example: Donation Form Component
export const DonationFormExample: React.FC = () => {
  const [formData, setFormData] = useState({
    amount: '',
    email: '',
    name: '',
    phone: '',
    message: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsSubmitting(false);
    setShowSuccess(true);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Make a Donation</h1>
        <p className="text-gray-600">
          Your generosity helps us support those in need in our community.
        </p>
      </div>

      {/* Success Alert */}
      {showSuccess && (
        <EnhancedAlert
          variant="success"
          title="Thank you for your donation!"
          dismissible
          onDismiss={() => setShowSuccess(false)}
        >
          Your donation has been processed successfully. You will receive a confirmation email shortly.
        </EnhancedAlert>
      )}

      {/* Donation Form */}
      <EnhancedCard variant="elevated" padding="lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Donation Amount</h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {['£10', '£25', '£50', '£100'].map(amount => (
                <EnhancedButton
                  key={amount}
                  type="button"
                  variant="outline"
                  onClick={() => handleInputChange('amount', amount.slice(1))}
                  className="h-12"
                >
                  {amount}
                </EnhancedButton>
              ))}
            </div>

            <EnhancedInput
              label="Custom Amount"
              type="number"
              placeholder="Enter custom amount"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              leftIcon={<CreditCard className="h-4 w-4" />}
              error={errors.amount}
              helperText="Minimum donation: £5"
            />
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Your Information</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EnhancedInput
                label="Full Name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                leftIcon={<User className="h-4 w-4" />}
                error={errors.name}
                required
              />

              <EnhancedInput
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                leftIcon={<Mail className="h-4 w-4" />}
                error={errors.email}
                helperText="For donation receipt"
                required
              />
            </div>

            <EnhancedInput
              label="Phone Number"
              type="tel"
              placeholder="Enter your phone number"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              leftIcon={<Phone className="h-4 w-4" />}
              error={errors.phone}
              helperText="Optional - for donation updates"
            />

            <EnhancedInput
              label="Message (Optional)"
              placeholder="Leave a message of support..."
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              helperText="Your message may be shared with beneficiaries"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <EnhancedButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              leftIcon={<Heart className="h-5 w-5" />}
              disabled={!formData.amount || !formData.name || !formData.email}
            >
              {isSubmitting ? 'Processing Donation...' : `Donate £${formData.amount || '0'}`}
            </EnhancedButton>
          </div>
        </form>
      </EnhancedCard>

      {/* Security Notice */}
      <EnhancedCard variant="default" padding="md">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-medium text-gray-900">Secure Donation</h4>
            <p className="text-sm text-gray-600">
              Your payment information is encrypted and secure. We use industry-standard 
              security measures to protect your personal and financial data.
            </p>
          </div>
        </div>
      </EnhancedCard>
    </div>
  );
};

// Example: Dashboard Cards
export const DashboardCardsExample: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshing(false);
  };

  const metrics = [
    {
      title: 'Total Donations',
      value: '£12,847',
      change: '+12.3%',
      trend: 'up' as const,
      icon: Heart,
      color: 'bg-green-500'
    },
    {
      title: 'Help Requests',
      value: '47',
      change: '+5.2%',
      trend: 'up' as const,
      icon: User,
      color: 'bg-blue-500'
    },
    {
      title: 'Active Volunteers',
      value: '23',
      change: '-2.1%',
      trend: 'down' as const,
      icon: MapPin,
      color: 'bg-purple-500'
    },
    {
      title: 'Scheduled Events',
      value: '8',
      change: '0%',
      trend: 'stable' as const,
      icon: Calendar,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600">Monitor key metrics and recent activity</p>
        </div>
        
        <EnhancedButton
          variant="outline"
          onClick={handleRefresh}
          loading={refreshing}
          leftIcon={!refreshing ? <Calendar className="h-4 w-4" /> : undefined}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </EnhancedButton>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          
          return (
            <EnhancedCard
              key={metric.title}
              variant="elevated"
              padding="lg"
              className="hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${metric.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                
                <div className={`text-sm font-medium flex items-center gap-1 ${
                  metric.trend === 'up' ? 'text-green-600' : 
                  metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {metric.change}
                </div>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-600">{metric.title}</h3>
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              </div>
            </EnhancedCard>
          );
        })}
      </div>

      {/* Status Alerts */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <EnhancedAlert
            variant="success"
            title="All Systems Operational"
          >
            All services are running normally. Last checked: {new Date().toLocaleTimeString()}
          </EnhancedAlert>
          
          <EnhancedAlert
            variant="info"
            title="Scheduled Maintenance"
          >
            System maintenance scheduled for Sunday 2:00 AM - 4:00 AM GMT.
          </EnhancedAlert>
        </div>
      </div>

      {/* Recent Activity */}
      <EnhancedCard variant="default" padding="lg">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          
          <div className="space-y-3">
            {[
              { type: 'donation', message: 'New donation of £50 received from John Smith', time: '2 minutes ago' },
              { type: 'request', message: 'Help request submitted for food assistance', time: '15 minutes ago' },
              { type: 'volunteer', message: 'Sarah Johnson signed up for weekend shift', time: '1 hour ago' },
              { type: 'system', message: 'Weekly backup completed successfully', time: '2 hours ago' }
            ].map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.type === 'donation' ? 'bg-green-500' :
                  activity.type === 'request' ? 'bg-blue-500' :
                  activity.type === 'volunteer' ? 'bg-purple-500' : 'bg-gray-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </EnhancedCard>
    </div>
  );
};

// Example: Loading States
export const LoadingStatesExample: React.FC = () => {
  const [loadingStates, setLoadingStates] = useState({
    spinner: false,
    dots: false,
    pulse: false,
    fullScreen: false
  });

  const toggleLoading = (type: keyof typeof loadingStates) => {
    setLoadingStates(prev => ({ ...prev, [type]: !prev[type] }));
    
    if (!loadingStates[type]) {
      setTimeout(() => {
        setLoadingStates(prev => ({ ...prev, [type]: false }));
      }, 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Loading States Demo</h1>
        <p className="text-gray-600">Different loading indicators for various use cases</p>
      </div>

      {/* Loading Variants */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <EnhancedCard variant="elevated" padding="lg">
          <div className="text-center space-y-4">
            <h3 className="font-semibold text-gray-900">Spinner Loading</h3>
            <div className="h-16 flex items-center justify-center">
              {loadingStates.spinner ? (
                <EnhancedLoading variant="spinner" size="lg" />
              ) : (
                <div className="text-gray-400">Click to activate</div>
              )}
            </div>
            <EnhancedButton
              variant="outline"
              onClick={() => toggleLoading('spinner')}
              fullWidth
            >
              {loadingStates.spinner ? 'Loading...' : 'Show Spinner'}
            </EnhancedButton>
          </div>
        </EnhancedCard>

        <EnhancedCard variant="elevated" padding="lg">
          <div className="text-center space-y-4">
            <h3 className="font-semibold text-gray-900">Dots Loading</h3>
            <div className="h-16 flex items-center justify-center">
              {loadingStates.dots ? (
                <EnhancedLoading variant="dots" size="lg" />
              ) : (
                <div className="text-gray-400">Click to activate</div>
              )}
            </div>
            <EnhancedButton
              variant="outline"
              onClick={() => toggleLoading('dots')}
              fullWidth
            >
              {loadingStates.dots ? 'Loading...' : 'Show Dots'}
            </EnhancedButton>
          </div>
        </EnhancedCard>

        <EnhancedCard variant="elevated" padding="lg">
          <div className="text-center space-y-4">
            <h3 className="font-semibold text-gray-900">Pulse Loading</h3>
            <div className="h-16 flex items-center justify-center">
              {loadingStates.pulse ? (
                <EnhancedLoading variant="pulse" size="lg" />
              ) : (
                <div className="text-gray-400">Click to activate</div>
              )}
            </div>
            <EnhancedButton
              variant="outline"
              onClick={() => toggleLoading('pulse')}
              fullWidth
            >
              {loadingStates.pulse ? 'Loading...' : 'Show Pulse'}
            </EnhancedButton>
          </div>
        </EnhancedCard>
      </div>

      {/* Loading with Text */}
      <EnhancedCard variant="default" padding="lg">
        <div className="text-center space-y-4">
          <h3 className="font-semibold text-gray-900">Loading with Text</h3>
          <EnhancedLoading
            variant="spinner"
            size="md"
            text="Processing your request..."
          />
        </div>
      </EnhancedCard>

      {/* Full Screen Loading */}
      <div className="text-center">
        <EnhancedButton
          variant="primary"
          onClick={() => toggleLoading('fullScreen')}
          size="lg"
        >
          Show Full Screen Loading
        </EnhancedButton>
      </div>

      {/* Full Screen Loading Overlay */}
      {loadingStates.fullScreen && (
        <EnhancedLoading
          variant="spinner"
          size="lg"
          text="Loading application..."
          fullScreen
        />
      )}
    </div>
  );
};

// Example: Alert Variations
export const AlertVariationsExample: React.FC = () => {
  const [alerts, setAlerts] = useState([
    { id: '1', type: 'info' as const, show: true },
    { id: '2', type: 'success' as const, show: true },
    { id: '3', type: 'warning' as const, show: true },
    { id: '4', type: 'error' as const, show: true }
  ]);

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, show: false } : alert
    ));
  };

  const resetAlerts = () => {
    setAlerts(prev => prev.map(alert => ({ ...alert, show: true })));
  };

  const alertContent = {
    info: {
      title: 'Information',
      message: 'This is an informational message to keep you updated.'
    },
    success: {
      title: 'Success!',
      message: 'Your action has been completed successfully.'
    },
    warning: {
      title: 'Warning',
      message: 'Please review this information before proceeding.'
    },
    error: {
      title: 'Error',
      message: 'Something went wrong. Please try again or contact support.'
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alert Components</h1>
          <p className="text-gray-600">Different alert types for various contexts</p>
        </div>
        
        <EnhancedButton
          variant="outline"
          onClick={resetAlerts}
        >
          Reset All Alerts
        </EnhancedButton>
      </div>

      <div className="space-y-4">
        {alerts.map(alert => {
          if (!alert.show) return null;
          
          const content = alertContent[alert.type];
          
          return (
            <EnhancedAlert
              key={alert.id}
              variant={alert.type}
              title={content.title}
              dismissible
              onDismiss={() => dismissAlert(alert.id)}
            >
              {content.message}
            </EnhancedAlert>
          );
        })}
      </div>

      {/* Alert Usage Examples */}
      <EnhancedCard variant="default" padding="lg">
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Usage Examples</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-blue-600 mb-2">Info Alerts</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• System notifications</li>
                <li>• Feature announcements</li>
                <li>• General information</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-green-600 mb-2">Success Alerts</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Successful form submissions</li>
                <li>• Completed actions</li>
                <li>• Positive confirmations</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-yellow-600 mb-2">Warning Alerts</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Important notices</li>
                <li>• Potential issues</li>
                <li>• Action required</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-red-600 mb-2">Error Alerts</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Form validation errors</li>
                <li>• System failures</li>
                <li>• Critical issues</li>
              </ul>
            </div>
          </div>
        </div>
      </EnhancedCard>
    </div>
  );
};

// Main Example Component
export const EnhancedUIExamples: React.FC = () => {
  const [activeExample, setActiveExample] = useState('donation');

  const examples = [
    { id: 'donation', title: 'Donation Form', component: DonationFormExample },
    { id: 'dashboard', title: 'Dashboard Cards', component: DashboardCardsExample },
    { id: 'loading', title: 'Loading States', component: LoadingStatesExample },
    { id: 'alerts', title: 'Alert Variations', component: AlertVariationsExample }
  ];

  const ActiveComponent = examples.find(ex => ex.id === activeExample)?.component || DonationFormExample;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Enhanced UI Components</h1>
            
            <div className="flex gap-2">
              {examples.map(example => (
                <EnhancedButton
                  key={example.id}
                  variant={activeExample === example.id ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setActiveExample(example.id)}
                >
                  {example.title}
                </EnhancedButton>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-8">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default EnhancedUIExamples; 
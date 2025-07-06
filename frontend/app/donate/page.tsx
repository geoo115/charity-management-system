"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, CreditCard, Lock, Check, Info } from 'lucide-react';

// Simple toast implementation
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white font-medium transition-all duration-300 ${
    type === 'success' ? 'bg-green-500' : 'bg-red-500'
  }`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Remove toast after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
};

interface DonationFormData {
  amount: number;
  customAmount?: number;
  frequency: 'one-time' | 'monthly' | 'quarterly' | 'annually';
  designation: string;
  paymentMethod: 'card' | 'bank' | 'paypal';
  giftAid: boolean;
  contactInfo: {
    name: string;
    email: string;
    phone?: string;
  };
  anonymous: boolean;
}

const presetAmounts = [10, 25, 50, 100, 250, 500];

const designations = [
  { value: 'general', label: 'General Support', description: 'Where help is needed most' },
  { value: 'food', label: 'Food Security', description: 'Help provide meals to families' },
  { value: 'emergency', label: 'Emergency Support', description: 'Crisis assistance for urgent needs' },
  { value: 'education', label: 'Education & Training', description: 'Support learning opportunities' },
  { value: 'healthcare', label: 'Healthcare Access', description: 'Medical support and resources' },
];

export default function DonatePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<DonationFormData>({
    amount: 25,
    frequency: 'one-time',
    designation: 'general',
    paymentMethod: 'card',
    giftAid: false,
    contactInfo: {
      name: '',
      email: '',
      phone: '',
    },
    anonymous: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomAmount, setShowCustomAmount] = useState(false);

  const handleAmountSelect = (amount: number) => {
    setFormData(prev => ({ ...prev, amount }));
    setShowCustomAmount(false);
  };

  const handleCustomAmountClick = () => {
    setShowCustomAmount(true);
    setFormData(prev => ({ ...prev, amount: 0 }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const donationAmount = showCustomAmount ? formData.customAmount || 0 : formData.amount;

      if (donationAmount < 1) {
        showToast('Please enter a valid donation amount', 'error');
        return;
      }

      if (!formData.contactInfo.name || !formData.contactInfo.email) {
        showToast('Please provide your name and email', 'error');
        return;
      }

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create donation record
      const donationData = {
        amount: donationAmount,
        currency: 'GBP',
        frequency: formData.frequency,
        designation: formData.designation,
        paymentMethod: formData.paymentMethod,
        giftAid: formData.giftAid,
        contactInfo: formData.contactInfo,
        anonymous: formData.anonymous,
      };

      console.log('Processing donation:', donationData);

      // Mock successful payment
      showToast(`Thank you for your £${donationAmount} donation!`, 'success');
      
      // Redirect to thank you page
      router.push('/donate/thank-you');
    } catch (error) {
      console.error('Donation error:', error);
      showToast('Failed to process donation. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateImpact = (amount: number) => {
    const meals = Math.floor(amount / 3.5);
    const families = Math.floor(amount / 25);
    return { meals, families };
  };

  const currentAmount = showCustomAmount ? formData.customAmount || 0 : formData.amount;
  const impact = calculateImpact(currentAmount);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="text-center">
            <Heart className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Make a Donation
            </h1>
            <p className="text-lg text-gray-600">
              Your generosity helps us support families and individuals in need throughout Lewisham.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Donation Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
                {/* Amount Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Donation Amount
                  </label>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {presetAmounts.map(amount => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => handleAmountSelect(amount)}
                        className={`p-3 rounded-lg border-2 font-medium transition-colors ${
                          formData.amount === amount && !showCustomAmount
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        £{amount}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleCustomAmountClick}
                    className={`w-full p-3 rounded-lg border-2 font-medium transition-colors ${
                      showCustomAmount
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    Custom Amount
                  </button>
                  {showCustomAmount && (
                    <div className="mt-3">
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-500">£</span>
                        <input
                          type="number"
                          min="1"
                          placeholder="Enter amount"
                          className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={formData.customAmount || ''}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            customAmount: Number(e.target.value) 
                          }))}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Frequency */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Donation Frequency
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'one-time', label: 'One-time' },
                      { value: 'monthly', label: 'Monthly' },
                      { value: 'quarterly', label: 'Quarterly' },
                      { value: 'annually', label: 'Annually' },
                    ].map(freq => (
                      <button
                        key={freq.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          frequency: freq.value as DonationFormData['frequency']
                        }))}
                        className={`p-3 rounded-lg border-2 font-medium transition-colors ${
                          formData.frequency === freq.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {freq.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Designation */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    How would you like your donation to be used?
                  </label>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.designation}
                    onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                  >
                    {designations.map(des => (
                      <option key={des.value} value={des.value}>
                        {des.label} - {des.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contact Information */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Contact Information</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <input
                      type="text"
                      placeholder="Full Name *"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.contactInfo.name}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        contactInfo: { ...prev.contactInfo, name: e.target.value }
                      }))}
                      required
                    />
                    <input
                      type="email"
                      placeholder="Email Address *"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.contactInfo.email}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        contactInfo: { ...prev.contactInfo, email: e.target.value }
                      }))}
                      required
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number (Optional)"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.contactInfo.phone}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        contactInfo: { ...prev.contactInfo, phone: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                {/* Gift Aid */}
                <div className="mb-6">
                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      checked={formData.giftAid}
                      onChange={(e) => setFormData(prev => ({ ...prev, giftAid: e.target.checked }))}
                    />
                    <div>
                      <span className="font-medium text-gray-900">
                        Add Gift Aid to boost your donation by 25%
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        I am a UK taxpayer and understand that if I pay less Income Tax and/or Capital Gains Tax than the amount of Gift Aid claimed on all my donations in that tax year it is my responsibility to pay any difference.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Anonymous Donation */}
                <div className="mb-6">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      checked={formData.anonymous}
                      onChange={(e) => setFormData(prev => ({ ...prev, anonymous: e.target.checked }))}
                    />
                    <span className="text-gray-900">Make this donation anonymous</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || currentAmount < 1}
                  className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      <span>Donate £{currentAmount} {formData.frequency !== 'one-time' ? formData.frequency : ''}</span>
                    </>
                  )}
                </button>

                <div className="mt-3 text-center text-sm text-gray-600">
                  <Lock className="w-4 h-4 inline mr-1" />
                  Your donation is secure and encrypted
                </div>
              </form>
            </div>

            {/* Impact Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Your Impact</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Your donation:</span>
                    <span className="font-medium">£{currentAmount}</span>
                  </div>
                  {formData.giftAid && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Gift Aid bonus:</span>
                      <span className="font-medium text-green-600">£{(currentAmount * 0.25).toFixed(2)}</span>
                    </div>
                  )}
                  <hr />
                  <div className="flex items-center justify-between font-medium">
                    <span>Total impact:</span>
                    <span>£{formData.giftAid ? (currentAmount * 1.25).toFixed(2) : currentAmount}</span>
                  </div>
                </div>
                
                {currentAmount > 0 && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Info className="w-4 h-4 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-blue-900">This could provide:</span>
                    </div>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• {impact.meals} meals for families</li>
                      <li>• Support for {impact.families} families</li>
                      <li>• Essential supplies for those in need</li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Why Donate?</h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start">
                    <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>100% of your donation goes directly to helping families in need</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Tax-deductible donation with Gift Aid available</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Transparent reporting on how your money is used</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Regular updates on the impact of your donation</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

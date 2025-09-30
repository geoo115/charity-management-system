"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { Heart, CheckCircle, Share2, Mail, Facebook, Twitter } from 'lucide-react';

export default function ThankYouPage() {
  useEffect(() => {
    // Track donation completion
    console.log('Donation completed successfully');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mb-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Thank You for Your Donation!
              </h1>
              <p className="text-lg text-gray-600">
                Your generosity will make a real difference in our community.
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-green-800 mb-2">
                Your Donation is Being Processed
              </h2>
              <p className="text-green-700">
                You&apos;ll receive an email confirmation shortly with your donation receipt for tax purposes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="text-center">
                <Heart className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Immediate Impact</h3>
                <p className="text-sm text-gray-600">
                  Your donation will help provide food and support to families this week.
                </p>
              </div>
              <div className="text-center">
                <Mail className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Stay Connected</h3>
                <p className="text-sm text-gray-600">
                  We&apos;ll send you regular updates on how your donation is making a difference.
                </p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Help us spread the word
              </h3>
              <div className="flex justify-center space-x-4">
                <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  <Facebook className="w-4 h-4" />
                  <span>Share</span>
                </button>
                <button className="flex items-center space-x-2 bg-sky-500 text-white px-4 py-2 rounded-lg hover:bg-sky-600 transition-colors">
                  <Twitter className="w-4 h-4" />
                  <span>Tweet</span>
                </button>
                <button className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href="/" 
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Return Home
                </Link>
                <Link 
                  href="/donate" 
                  className="border border-blue-600 text-blue-600 px-6 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Donate Again
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

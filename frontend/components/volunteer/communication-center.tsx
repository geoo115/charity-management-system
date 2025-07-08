'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Ticket, X, HeadphonesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MessagingCenter from './messaging-center';
import SupportTicketsCenter from './support-tickets-center';

interface CommunicationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'messages' | 'tickets';
}

export default function CommunicationCenter({ 
  isOpen, 
  onClose, 
  defaultTab = 'messages' 
}: CommunicationCenterProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-6xl h-[80vh] bg-white rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center space-x-3">
            <HeadphonesIcon className="h-6 w-6" />
            <h2 className="text-xl font-semibold">Communication Center</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="h-full pb-16">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "messages" | "tickets")} className="h-full">
            <div className="border-b border-gray-200 px-4">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="messages" className="flex items-center space-x-2">
                  <MessageCircle className="h-4 w-4" />
                  <span>Messages</span>
                </TabsTrigger>
                <TabsTrigger value="tickets" className="flex items-center space-x-2">
                  <Ticket className="h-4 w-4" />
                  <span>Support Tickets</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="messages" className="h-full m-0 p-0">
              <MessagingCenter onClose={onClose} />
            </TabsContent>

            <TabsContent value="tickets" className="h-full m-0 p-0">
              <SupportTicketsCenter />
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Quick access button component for easy integration
export function CommunicationQuickAccess() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'messages' | 'tickets'>('messages');

  const handleOpenMessages = () => {
    setActiveTab('messages');
    setIsOpen(true);
  };

  const handleOpenTickets = () => {
    setActiveTab('tickets');
    setIsOpen(true);
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 flex flex-col space-y-3 z-40">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={handleOpenMessages}
            className="bg-blue-500 hover:bg-blue-600 rounded-full p-3 shadow-lg"
            size="sm"
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={handleOpenTickets}
            className="bg-purple-500 hover:bg-purple-600 rounded-full p-3 shadow-lg"
            size="sm"
          >
            <Ticket className="h-5 w-5" />
          </Button>
        </motion.div>
      </div>

      <CommunicationCenter
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        defaultTab={activeTab}
      />
    </>
  );
}

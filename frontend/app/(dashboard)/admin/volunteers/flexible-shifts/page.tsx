import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FlexibleShiftAdmin from '@/components/admin/flexible-shift-admin';
import FlexibleShiftAnalytics from '@/components/admin/flexible-shift-analytics';
import { Clock, BarChart3, Settings } from 'lucide-react';

export default function FlexibleShiftManagementPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Flexible Shift Management</h1>
        <p className="text-muted-foreground">
          Manage flexible shift templates, view analytics, and optimize volunteer scheduling
        </p>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <FlexibleShiftAdmin />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <FlexibleShiftAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}

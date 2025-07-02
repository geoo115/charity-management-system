"use client";

import React from 'react';
import { VisitorChecker } from '@/components/visitor/visitor-checker';

export default function VisitorCheckerPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Check Visitor History</h1>
        <p className="text-muted-foreground">
          Check if a visitor has made recent requests or view their visit history.
        </p>
      </div>
      
      <VisitorChecker />
    </div>
  );
}

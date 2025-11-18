'use client';

import React from 'react';
import ProgramManagerDashboard from '@/components/dashboards/ProgramManagerDashboard';
import InstitutionalBuyerDashboard from '@/components/dashboards/InstitutionalBuyerDashboard';

interface AnalyticsDashboardProps {
  userRole: string;
  millId: string;
}

export function AnalyticsDashboard({ userRole, millId }: AnalyticsDashboardProps) {
  // Route to appropriate dashboard based on user role
  switch (userRole) {
    case 'program-manager':
    case 'FWGA Program Manager':
      return <ProgramManagerDashboard />;

    case 'institutional-buyer':
    case 'Institutional Buyer':
      return <InstitutionalBuyerDashboard />;

    default:
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Dashboard not available for your role. Please contact support.
          </p>
        </div>
      );
  }
}

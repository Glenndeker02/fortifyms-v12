'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export interface FilterPanelProps {
  filters: {
    dateRange?: string;
    country?: string;
    commodity?: string;
    supplier?: string;
    [key: string]: string | undefined;
  };
  onFiltersChange: (filters: any) => void;
  onClose: () => void;
}

export function FilterPanel({ filters, onFiltersChange, onClose }: FilterPanelProps) {
  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onFiltersChange({
      dateRange: 'last-12-months',
      country: 'all',
      commodity: 'all',
      supplier: 'all',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Filters</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {filters.dateRange !== undefined && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="last-7-days">Last 7 Days</option>
                <option value="last-30-days">Last 30 Days</option>
                <option value="last-90-days">Last 90 Days</option>
                <option value="last-12-months">Last 12 Months</option>
                <option value="year-to-date">Year to Date</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
          )}

          {filters.country !== undefined && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Country</label>
              <select
                value={filters.country}
                onChange={(e) => handleFilterChange('country', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="all">All Countries</option>
                <option value="kenya">Kenya</option>
                <option value="uganda">Uganda</option>
                <option value="tanzania">Tanzania</option>
              </select>
            </div>
          )}

          {filters.commodity !== undefined && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Commodity</label>
              <select
                value={filters.commodity}
                onChange={(e) => handleFilterChange('commodity', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="all">All Commodities</option>
                <option value="rice">Rice</option>
                <option value="maize">Maize</option>
                <option value="wheat">Wheat</option>
              </select>
            </div>
          )}

          {filters.supplier !== undefined && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Supplier</label>
              <select
                value={filters.supplier}
                onChange={(e) => handleFilterChange('supplier', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="all">All Suppliers</option>
                <option value="kenya-premium">Kenya Premium Mills</option>
                <option value="uganda-fortify">Uganda Fortify Co.</option>
                <option value="tanzania-quality">Tanzania Quality Mills</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button onClick={resetFilters} variant="outline" className="flex-1">
            Reset Filters
          </Button>
          <Button onClick={onClose} className="flex-1">
            Apply Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

export default function MarketVisualization() {
  const regions = [
    { name: 'Nairobi', mills: 12, buyers: 45, volume: 125000, lat: -1.286, lng: 36.817 },
    { name: 'Kampala', mills: 8, buyers: 32, volume: 98000, lat: 0.347, lng: 32.582 },
    { name: 'Dar es Salaam', mills: 10, buyers: 38, volume: 110000, lat: -6.792, lng: 39.208 },
    { name: 'Mombasa', mills: 6, buyers: 24, volume: 67000, lat: -4.043, lng: 39.668 },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Geographic Distribution</CardTitle>
          <CardDescription>Mills and buyers across regions</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Placeholder for actual map - would integrate with Mapbox/Google Maps */}
          <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center relative">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Interactive map will be displayed here</p>
              <p className="text-sm text-gray-400 mt-1">Showing mills and buyers across East Africa</p>
            </div>

            {/* Overlay markers as demonstration */}
            {regions.map((region, index) => (
              <div
                key={index}
                className="absolute bg-white p-2 rounded-lg shadow-lg text-xs"
                style={{
                  left: `${25 + index * 20}%`,
                  top: `${30 + (index % 2) * 30}%`,
                }}
              >
                <div className="font-medium">{region.name}</div>
                <div className="text-muted-foreground">
                  {region.mills} mills | {region.buyers} buyers
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regional Statistics</CardTitle>
          <CardDescription>Detailed breakdown by region</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {regions.map((region) => (
              <div key={region.name} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{region.name}</h4>
                  <MapPin className="h-4 w-4 text-blue-600" />
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{region.mills}</div>
                    <div className="text-muted-foreground">Mills</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{region.buyers}</div>
                    <div className="text-muted-foreground">Buyers</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {(region.volume / 1000).toFixed(0)}K
                    </div>
                    <div className="text-muted-foreground">Volume (kg)</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

export default function MarketInsights() {
  const insights = [
    {
      title: 'Price Trends',
      description: 'Average prices have decreased by 3.5% this quarter',
      trend: 'down',
      impact: 'positive',
    },
    {
      title: 'Supply Availability',
      description: 'Maize supply is 15% higher than last quarter',
      trend: 'up',
      impact: 'positive',
    },
    {
      title: 'Market Gap',
      description: 'Northern region shows 23% demand-supply gap',
      trend: 'up',
      impact: 'negative',
    },
    {
      title: 'Quality Score',
      description: 'Average quality scores improved to 96.5%',
      trend: 'up',
      impact: 'positive',
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Market Intelligence</CardTitle>
          <CardDescription>Key insights and trends from procurement data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  insight.impact === 'positive' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">{insight.title}</h4>
                  {insight.trend === 'up' ? (
                    <TrendingUp className={`h-5 w-5 ${insight.impact === 'positive' ? 'text-green-600' : 'text-orange-600'}`} />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-green-600" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>Actionable insights for procurement optimization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Expand to Northern Region</h4>
                <p className="text-sm text-blue-700">
                  Consider certifying more mills in the northern region to address the supply gap
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900">Favorable Pricing Window</h4>
                <p className="text-sm text-green-700">
                  Current price trends suggest good opportunity for bulk procurement this quarter
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

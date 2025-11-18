'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Star, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PerformanceRankings() {
  const millRankings = [
    { rank: 1, name: 'Kenya Premium Mills', score: 98, volume: 125000, compliance: 99, rating: 4.9 },
    { rank: 2, name: 'Uganda Fortify Co.', score: 96, volume: 110000, compliance: 97, rating: 4.8 },
    { rank: 3, name: 'Tanzania Quality Mills', score: 94, volume: 98000, compliance: 96, rating: 4.7 },
    { rank: 4, name: 'Coastal Grain Processors', score: 92, volume: 87000, compliance: 94, rating: 4.6 },
    { rank: 5, name: 'Highland Mills Ltd', score: 90, volume: 79000, compliance: 92, rating: 4.5 },
  ];

  const buyerRankings = [
    { rank: 1, name: 'National School Feeding Program', orders: 45, volume: 234000, rating: 4.9 },
    { rank: 2, name: 'Health Ministry Nutrition', orders: 32, volume: 198000, rating: 4.8 },
    { rank: 3, name: 'NGO Food Relief', orders: 28, volume: 167000, rating: 4.7 },
  ];

  const getMedalColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-orange-600';
    return 'text-gray-300';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Performing Mills
          </CardTitle>
          <CardDescription>Ranked by overall performance score</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {millRankings.map((mill) => (
              <div
                key={mill.rank}
                className={`p-4 rounded-lg border ${
                  mill.rank <= 3 ? 'bg-gradient-to-r from-yellow-50 to-white border-yellow-200' : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`text-3xl font-bold ${getMedalColor(mill.rank)}`}>
                    {mill.rank <= 3 ? (
                      <Trophy className="h-8 w-8" />
                    ) : (
                      <span className="text-gray-400">#{mill.rank}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{mill.name}</h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>Score: <span className="font-medium text-foreground">{mill.score}</span></span>
                      <span>Volume: <span className="font-medium text-foreground">{(mill.volume / 1000).toFixed(0)}K kg</span></span>
                      <span>Compliance: <span className="font-medium text-foreground">{mill.compliance}%</span></span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-lg font-bold">{mill.rating}</span>
                    </div>
                    {mill.rank <= 3 && (
                      <Badge variant="secondary" className="mt-1">
                        {mill.rank === 1 ? 'Gold' : mill.rank === 2 ? 'Silver' : 'Bronze'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Top Institutional Buyers
          </CardTitle>
          <CardDescription>Most active procurement organizations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {buyerRankings.map((buyer) => (
              <div key={buyer.rank} className="p-4 rounded-lg border bg-white">
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-gray-400">
                    #{buyer.rank}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{buyer.name}</h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>Orders: <span className="font-medium text-foreground">{buyer.orders}</span></span>
                      <span>Volume: <span className="font-medium text-foreground">{(buyer.volume / 1000).toFixed(0)}K kg</span></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{buyer.rating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Criteria</CardTitle>
          <CardDescription>How rankings are calculated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Mill Ranking Factors</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Compliance score (30%)</li>
                <li>• Quality consistency (25%)</li>
                <li>• Production volume (20%)</li>
                <li>• On-time delivery (15%)</li>
                <li>• Customer ratings (10%)</li>
              </ul>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Buyer Ranking Factors</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Total procurement volume (40%)</li>
                <li>• Number of orders (30%)</li>
                <li>• Payment reliability (20%)</li>
                <li>• Supplier ratings (10%)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

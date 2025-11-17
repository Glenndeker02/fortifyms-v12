import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const categories = [
      {
        id: 'rice_parboiling',
        name: 'Rice Parboiling',
        description: 'Diagnostics for rice parboiling processes including soaking, steaming, and drying',
        icon: '🍚',
        subcategories: [
          { id: 'soaking', name: 'Soaking Process' },
          { id: 'steaming', name: 'Steaming Process' },
          { id: 'drying', name: 'Drying Process' }
        ]
      },
      {
        id: 'maize_fortification',
        name: 'Maize Fortification',
        description: 'Diagnostics for maize fortification including premix handling and mixing',
        icon: '🌽',
        subcategories: [
          { id: 'premix_handling', name: 'Premix Handling' },
          { id: 'mixing', name: 'Mixing Process' },
          { id: 'quality_control', name: 'Quality Control' }
        ]
      },
      {
        id: 'doser_calibration',
        name: 'Doser Calibration',
        description: 'Diagnostics for doser equipment calibration and performance',
        icon: '⚙️',
        subcategories: [
          { id: 'volumetric', name: 'Volumetric Doser' },
          { id: 'gravimetric', name: 'Gravimetric Doser' },
          { id: 'calibration_check', name: 'Calibration Verification' }
        ]
      },
      {
        id: 'premix_handling',
        name: 'Premix Handling',
        description: 'Diagnostics for premix storage, handling, and feeding',
        icon: '📦',
        subcategories: [
          { id: 'storage', name: 'Storage Conditions' },
          { id: 'feeding', name: 'Feeding System' },
          { id: 'quality', name: 'Quality Verification' }
        ]
      },
      {
        id: 'post_mix_blending',
        name: 'Post-Mix Blending',
        description: 'Diagnostics for post-mix blending and uniformity verification',
        icon: '🔄',
        subcategories: [
          { id: 'blending', name: 'Blending Process' },
          { id: 'uniformity', name: 'Uniformity Check' },
          { id: 'final_quality', name: 'Final Quality' }
        ]
      }
    ];

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching diagnostic categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch diagnostic categories' },
      { status: 500 }
    );
  }
}
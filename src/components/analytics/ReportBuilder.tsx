'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Download,
  Calendar,
  Plus,
  Trash2,
  Save,
  Eye,
  Settings
} from 'lucide-react';

interface ReportSection {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'text';
  title: string;
  config: any;
}

export function ReportBuilder() {
  const [reportName, setReportName] = useState('');
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const addSection = (type: ReportSection['type']) => {
    const newSection: ReportSection = {
      id: `section-${Date.now()}`,
      type,
      title: `New ${type} section`,
      config: {},
    };
    setSections([...sections, newSection]);
  };

  const removeSection = (id: string) => {
    setSections(sections.filter((s) => s.id !== id));
  };

  const updateSection = (id: string, updates: Partial<ReportSection>) => {
    setSections(sections.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/reports/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: reportName,
          sections,
        }),
      });
      if (response.ok) {
        alert('Report saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save report:', error);
    }
  };

  const handlePreview = () => {
    // Open preview modal or navigate to preview page
    console.log('Previewing report:', { reportName, sections });
  };

  const handleGenerate = async (format: 'pdf' | 'excel') => {
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: reportName,
          sections,
          format,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportName || 'report'}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Report Builder</CardTitle>
              <CardDescription>
                Create custom reports with your selected metrics and visualizations
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePreview}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button variant="outline" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button onClick={() => handleGenerate('pdf')}>
                <Download className="h-4 w-4 mr-2" />
                Generate PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Report Name</label>
              <input
                type="text"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="Enter report name..."
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Types */}
      <Card>
        <CardHeader>
          <CardTitle>Add Sections</CardTitle>
          <CardDescription>Choose the type of content to include in your report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2"
              onClick={() => addSection('metric')}
            >
              <div className="text-3xl">📊</div>
              <span>Metrics</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2"
              onClick={() => addSection('chart')}
            >
              <div className="text-3xl">📈</div>
              <span>Charts</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2"
              onClick={() => addSection('table')}
            >
              <div className="text-3xl">📋</div>
              <span>Tables</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2"
              onClick={() => addSection('text')}
            >
              <div className="text-3xl">📝</div>
              <span>Text</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Sections */}
      <Card>
        <CardHeader>
          <CardTitle>Report Sections</CardTitle>
          <CardDescription>
            {sections.length === 0
              ? 'No sections added yet. Add sections above to build your report.'
              : `${sections.length} section(s) added`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sections.map((section, index) => (
              <div
                key={section.id}
                className={`p-4 border rounded-lg ${
                  selectedSection === section.id ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => setSelectedSection(section.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-sm text-muted-foreground">
                        Section {index + 1}
                      </span>
                      <span className="px-2 py-0.5 bg-muted rounded text-xs">
                        {section.type}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) =>
                        updateSection(section.id, { title: e.target.value })
                      }
                      className="font-medium w-full border-none focus:outline-none bg-transparent"
                      placeholder="Section title..."
                    />

                    {/* Section-specific configuration */}
                    <div className="mt-3 p-3 bg-muted rounded text-sm">
                      {section.type === 'chart' && (
                        <div className="space-y-2">
                          <select className="w-full p-2 border rounded">
                            <option>Select chart type...</option>
                            <option value="line">Line Chart</option>
                            <option value="bar">Bar Chart</option>
                            <option value="pie">Pie Chart</option>
                            <option value="area">Area Chart</option>
                          </select>
                        </div>
                      )}
                      {section.type === 'metric' && (
                        <div className="space-y-2">
                          <select className="w-full p-2 border rounded">
                            <option>Select metrics...</option>
                            <option value="production">Production Volume</option>
                            <option value="compliance">Compliance Score</option>
                            <option value="quality">Quality Rate</option>
                            <option value="delivery">Delivery Performance</option>
                          </select>
                        </div>
                      )}
                      {section.type === 'table' && (
                        <div className="space-y-2">
                          <select className="w-full p-2 border rounded">
                            <option>Select data source...</option>
                            <option value="mills">Mill Performance</option>
                            <option value="procurements">Procurements</option>
                            <option value="deliveries">Deliveries</option>
                          </select>
                        </div>
                      )}
                      {section.type === 'text' && (
                        <textarea
                          className="w-full p-2 border rounded"
                          rows={3}
                          placeholder="Enter your text content..."
                        />
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSection(section.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Schedule This Report</CardTitle>
              <CardDescription>
                Automatically generate and send this report on a recurring basis
              </CardDescription>
            </div>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Configure Schedule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Frequency</label>
                <select className="w-full p-2 border rounded-md">
                  <option value="">Select frequency...</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Recipients</label>
                <input
                  type="text"
                  placeholder="Enter email addresses..."
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Format</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked />
                  <span className="text-sm">PDF</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  <span className="text-sm">Excel</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  <span className="text-sm">CSV</span>
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

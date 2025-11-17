'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  FileText,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Template {
  id: string;
  name: string;
  version: string;
  commodity: string;
  country: string;
  region: string;
  certificationType: string;
  _count: {
    audits: number;
  };
}

interface Mill {
  id: string;
  name: string;
  code: string;
  region: string;
  country: string;
}

export default function NewAuditPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [mills, setMills] = useState<Mill[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedMill, setSelectedMill] = useState('');
  const [auditType, setAuditType] = useState('');
  const [auditDate, setAuditDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchPeriod, setBatchPeriod] = useState('');
  const [notes, setNotes] = useState('');

  const canCreate =
    session?.user?.role === 'MILL_MANAGER' ||
    session?.user?.role === 'FWGA_INSPECTOR' ||
    session?.user?.role === 'SYSTEM_ADMIN';

  const isFWGA =
    session?.user?.role === 'FWGA_INSPECTOR' ||
    session?.user?.role === 'FWGA_PROGRAM_MANAGER' ||
    session?.user?.role === 'SYSTEM_ADMIN';

  useEffect(() => {
    if (!canCreate) {
      router.push('/compliance');
    }
  }, [canCreate, router]);

  useEffect(() => {
    fetchTemplates();
    if (isFWGA) {
      fetchMills();
    }
  }, [isFWGA]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/compliance/templates?isActive=true');
      const data = await response.json();

      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchMills = async () => {
    try {
      const response = await fetch('/api/mills');
      const data = await response.json();

      if (data.success) {
        setMills(data.data.mills || []);
      }
    } catch (error) {
      console.error('Error fetching mills:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTemplate) {
      setError('Please select a template');
      return;
    }

    if (isFWGA && !selectedMill) {
      setError('Please select a mill');
      return;
    }

    if (!auditType) {
      setError('Please select an audit type');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload: any = {
        templateId: selectedTemplate,
        auditType,
        auditDate,
        batchPeriod: batchPeriod || null,
        notes: notes || null,
      };

      if (isFWGA) {
        payload.millId = selectedMill;
      }

      const response = await fetch('/api/compliance/audits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to create audit');
        return;
      }

      setSuccess(true);

      // Redirect to the audit detail page
      setTimeout(() => {
        router.push(`/compliance/audits/${result.data.id}`);
      }, 1500);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canCreate) {
    return null;
  }

  const auditTypes = [
    'Regular Inspection',
    'Spot Check',
    'Follow-up Audit',
    'Certification Audit',
    'Renewal Audit',
    'Surveillance Audit',
  ];

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/compliance')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Start New Audit</h1>
          <p className="text-muted-foreground mt-1">
            Create a new compliance audit entry
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 text-green-900 border-green-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Audit created successfully! Redirecting...
          </AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Template Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Compliance Template
            </CardTitle>
            <CardDescription>Select the compliance template for this audit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="template">Template *</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger id="template">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} (v{template.version}) - {template.commodity} - {template.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplateData && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold">Template Details</h3>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Commodity:</dt>
                    <dd className="font-medium">{selectedTemplateData.commodity}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Country:</dt>
                    <dd className="font-medium">{selectedTemplateData.country}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Type:</dt>
                    <dd className="font-medium">
                      {selectedTemplateData.certificationType.replace('_', ' ')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Previous Audits:</dt>
                    <dd className="font-medium">{selectedTemplateData._count.audits}</dd>
                  </div>
                </dl>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audit Information */}
        <Card>
          <CardHeader>
            <CardTitle>Audit Information</CardTitle>
            <CardDescription>Provide basic information about this audit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isFWGA && (
              <div>
                <Label htmlFor="mill">Mill *</Label>
                <Select value={selectedMill} onValueChange={setSelectedMill}>
                  <SelectTrigger id="mill">
                    <SelectValue placeholder="Select a mill" />
                  </SelectTrigger>
                  <SelectContent>
                    {mills.map((mill) => (
                      <SelectItem key={mill.id} value={mill.id}>
                        {mill.name} ({mill.code}) - {mill.region}, {mill.country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="auditType">Audit Type *</Label>
                <Select value={auditType} onValueChange={setAuditType}>
                  <SelectTrigger id="auditType">
                    <SelectValue placeholder="Select audit type" />
                  </SelectTrigger>
                  <SelectContent>
                    {auditTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="auditDate">Audit Date *</Label>
                <Input
                  id="auditDate"
                  type="date"
                  value={auditDate}
                  onChange={(e) => setAuditDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="batchPeriod">Batch Period (Optional)</Label>
              <Input
                id="batchPeriod"
                placeholder="e.g., January 2025 or Q1 2025"
                value={batchPeriod}
                onChange={(e) => setBatchPeriod(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Specify the time period of batches being audited
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
            <CardDescription>Any additional information or context for this audit</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes about this audit..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/compliance')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Start Audit'}
          </Button>
        </div>
      </form>
    </div>
  );
}

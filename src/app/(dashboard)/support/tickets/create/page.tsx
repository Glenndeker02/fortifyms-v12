'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CreateTicketPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'MEDIUM',
    category: 'TECHNICAL',
    relatedResourceType: '',
    relatedResourceId: '',
    attachmentUrls: [''],
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleArrayAdd = () => {
    setFormData((prev) => ({
      ...prev,
      attachmentUrls: [...prev.attachmentUrls, ''],
    }));
  };

  const handleArrayChange = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      attachmentUrls: prev.attachmentUrls.map((item, i) => (i === index ? value : item)),
    }));
  };

  const handleArrayRemove = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      attachmentUrls: prev.attachmentUrls.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: formData.subject,
          description: formData.description,
          priority: formData.priority,
          category: formData.category,
          relatedResourceType: formData.relatedResourceType || undefined,
          relatedResourceId: formData.relatedResourceId || undefined,
          attachmentUrls: formData.attachmentUrls.filter((url) => url.trim()),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create ticket');
      }

      toast({
        title: 'Success',
        description: `Ticket ${data.data.ticket.ticketNumber} created successfully`,
      });

      router.push(`/support/tickets/${data.data.ticket.id}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getSLAInfo = () => {
    const sla: Record<string, { response: string; resolution: string }> = {
      URGENT: { response: '1 hour', resolution: '4 hours' },
      HIGH: { response: '2 hours', resolution: '8 hours' },
      MEDIUM: { response: '8 hours', resolution: '24 hours' },
      LOW: { response: '24 hours', resolution: '72 hours' },
    };

    return sla[formData.priority];
  };

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Create Support Ticket</CardTitle>
          <CardDescription>
            Submit a support request and our team will assist you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="Brief description of the issue"
                required
                value={formData.subject}
                onChange={(e) => handleChange('subject', e.target.value)}
              />
            </div>

            {/* Priority and Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority *</Label>
                <Select value={formData.priority} onValueChange={(v) => handleChange('priority', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(v) => handleChange('category', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TECHNICAL">Technical</SelectItem>
                    <SelectItem value="BILLING">Billing</SelectItem>
                    <SelectItem value="ACCOUNT">Account</SelectItem>
                    <SelectItem value="PROCUREMENT">Procurement</SelectItem>
                    <SelectItem value="LOGISTICS">Logistics</SelectItem>
                    <SelectItem value="MILL_OPERATIONS">Mill Operations</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* SLA Info */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Service Level Agreement:</strong> Based on {formData.priority} priority, we aim to
                respond within <strong>{getSLAInfo().response}</strong> and resolve within{' '}
                <strong>{getSLAInfo().resolution}</strong>.
              </AlertDescription>
            </Alert>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Provide detailed information about your issue or request..."
                rows={6}
                required
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 20 characters. Include steps to reproduce if applicable.
              </p>
            </div>

            {/* Related Resource */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Related Resource (Optional)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="relatedResourceType">Resource Type</Label>
                  <Select
                    value={formData.relatedResourceType}
                    onValueChange={(v) => handleChange('relatedResourceType', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RFP">RFP</SelectItem>
                      <SelectItem value="BID">Bid</SelectItem>
                      <SelectItem value="ORDER">Order</SelectItem>
                      <SelectItem value="TRIP">Trip</SelectItem>
                      <SelectItem value="SENSOR">Sensor</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relatedResourceId">Resource ID</Label>
                  <Input
                    id="relatedResourceId"
                    placeholder="e.g., RFP-2025-LAG-0001"
                    value={formData.relatedResourceId}
                    onChange={(e) => handleChange('relatedResourceId', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Attachments */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Attachments (Optional)</h3>
              {formData.attachmentUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Attachment ${index + 1} URL`}
                    value={url}
                    onChange={(e) => handleArrayChange(index, e.target.value)}
                  />
                  {formData.attachmentUrls.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleArrayRemove(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={handleArrayAdd}
                className="w-full"
              >
                Add Attachment
              </Button>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Ticket
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

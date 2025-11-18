'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, FileSignature, Package } from 'lucide-react';

export default function CreatePODPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const tripId = searchParams.get('tripId');
  const orderId = searchParams.get('orderId');

  const [formData, setFormData] = useState({
    quantityOrdered: '',
    quantityDelivered: '',
    signatureUrl: '',
    photoUrls: [''],
    batchNumbers: [''],
    deliveryNotes: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleArrayAdd = (field: 'photoUrls' | 'batchNumbers') => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ''],
    }));
  };

  const handleArrayChange = (field: 'photoUrls' | 'batchNumbers', index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  const handleArrayRemove = (field: 'photoUrls' | 'batchNumbers', index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleSignatureCapture = () => {
    // In a real implementation, this would open a signature pad modal
    toast({
      title: 'Feature Coming Soon',
      description: 'Digital signature capture will open a signature pad',
    });
  };

  const handlePhotoCapture = (index: number) => {
    // In a real implementation, this would open camera or file picker
    toast({
      title: 'Feature Coming Soon',
      description: 'Photo capture will open camera or file picker',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tripId || !orderId) {
      toast({
        title: 'Error',
        description: 'Trip ID and Order ID are required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/pod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          orderId,
          quantityOrdered: parseFloat(formData.quantityOrdered),
          quantityDelivered: parseFloat(formData.quantityDelivered),
          signatureUrl: formData.signatureUrl,
          photoUrls: formData.photoUrls.filter((url) => url.trim()),
          batchNumbers: formData.batchNumbers.filter((batch) => batch.trim()),
          deliveryNotes: formData.deliveryNotes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create POD');
      }

      toast({
        title: 'Success',
        description: 'Proof of delivery submitted successfully',
      });

      router.push(`/logistics/trips/${tripId}`);
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

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Proof of Delivery</CardTitle>
          <CardDescription>
            Capture delivery details, signature, and photos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Quantity Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Delivery Quantity
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantityOrdered">Quantity Ordered (MT) *</Label>
                  <Input
                    id="quantityOrdered"
                    type="number"
                    step="0.01"
                    required
                    value={formData.quantityOrdered}
                    onChange={(e) => handleChange('quantityOrdered', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantityDelivered">Quantity Delivered (MT) *</Label>
                  <Input
                    id="quantityDelivered"
                    type="number"
                    step="0.01"
                    required
                    value={formData.quantityDelivered}
                    onChange={(e) => handleChange('quantityDelivered', e.target.value)}
                  />
                </div>
              </div>

              {formData.quantityOrdered && formData.quantityDelivered && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">
                    Discrepancy:{' '}
                    <span
                      className={
                        parseFloat(formData.quantityDelivered) - parseFloat(formData.quantityOrdered) < 0
                          ? 'text-red-600'
                          : parseFloat(formData.quantityDelivered) - parseFloat(formData.quantityOrdered) > 0
                          ? 'text-green-600'
                          : 'text-gray-600'
                      }
                    >
                      {(parseFloat(formData.quantityDelivered) - parseFloat(formData.quantityOrdered)).toFixed(2)} MT
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Batch Numbers */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Batch Numbers</h3>
              {formData.batchNumbers.map((batch, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Batch ${index + 1}`}
                    value={batch}
                    onChange={(e) => handleArrayChange('batchNumbers', index, e.target.value)}
                  />
                  {formData.batchNumbers.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleArrayRemove('batchNumbers', index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => handleArrayAdd('batchNumbers')}
                className="w-full"
              >
                Add Batch Number
              </Button>
            </div>

            {/* Digital Signature */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Recipient Signature
              </h3>

              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                {formData.signatureUrl ? (
                  <div>
                    <img
                      src={formData.signatureUrl}
                      alt="Signature"
                      className="max-h-32 mx-auto mb-4"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleChange('signatureUrl', '')}
                    >
                      Clear Signature
                    </Button>
                  </div>
                ) : (
                  <div>
                    <FileSignature className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No signature captured</p>
                    <Button type="button" onClick={handleSignatureCapture}>
                      Capture Signature
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Photos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Delivery Photos
              </h3>

              {formData.photoUrls.map((url, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder={`Photo ${index + 1} URL`}
                      value={url}
                      onChange={(e) => handleArrayChange('photoUrls', index, e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handlePhotoCapture(index)}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                    {formData.photoUrls.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleArrayRemove('photoUrls', index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  {url && (
                    <img src={url} alt={`Photo ${index + 1}`} className="max-h-48 rounded" />
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => handleArrayAdd('photoUrls')}
                className="w-full"
              >
                Add Photo
              </Button>
            </div>

            {/* Delivery Notes */}
            <div className="space-y-2">
              <Label htmlFor="deliveryNotes">Delivery Notes</Label>
              <Textarea
                id="deliveryNotes"
                placeholder="Any issues, damages, or special notes about the delivery..."
                rows={4}
                value={formData.deliveryNotes}
                onChange={(e) => handleChange('deliveryNotes', e.target.value)}
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Proof of Delivery
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

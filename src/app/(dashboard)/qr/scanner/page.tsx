'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  QrCode,
  Camera,
  CheckCircle,
  XCircle,
  Package,
  Calendar,
  Building2,
} from 'lucide-react';

export default function QRScannerPage() {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [manualEntry, setManualEntry] = useState('');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleScan = () => {
    // In a real implementation, this would open device camera and use a QR scanner library
    toast({
      title: 'Feature Coming Soon',
      description: 'Camera QR scanning will be available in the mobile app',
    });
  };

  const handleManualVerify = async () => {
    if (!manualEntry.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a batch number',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setVerificationResult(null);

    try {
      // In a real implementation, call verification API
      // Simulating API call with mock data
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setVerificationResult({
        verified: true,
        batchNumber: manualEntry.toUpperCase(),
        productName: 'Premium Maize Flour',
        millName: 'Premium Grain Mills Ltd',
        productionDate: '2025-11-01',
        expiryDate: '2026-05-01',
        quantity: 1000,
        qualityTested: true,
        qualityScore: 95,
      });

      toast({
        title: 'Verification Successful',
        description: 'Batch is authentic and valid',
      });
    } catch (error: any) {
      toast({
        title: 'Verification Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">QR Code Scanner</h1>
        <p className="text-muted-foreground">
          Verify batch authenticity and view product information
        </p>
      </div>

      {/* Scanner Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={handleScan}>
          <CardContent className="pt-6 text-center">
            <Camera className="h-16 w-16 mx-auto text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Scan QR Code</h3>
            <p className="text-sm text-muted-foreground">
              Use your device camera to scan a QR code
            </p>
            <Button className="mt-4" disabled={scanning}>
              {scanning ? 'Scanning...' : 'Open Camera'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <QrCode className="h-16 w-16 mx-auto text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Manual Entry</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Enter batch number manually
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter batch number"
                value={manualEntry}
                onChange={(e) => setManualEntry(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleManualVerify()}
              />
              <Button onClick={handleManualVerify} disabled={loading}>
                Verify
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verification Result */}
      {verificationResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Verification Result</CardTitle>
              <Badge
                variant={verificationResult.verified ? 'default' : 'destructive'}
                className="text-lg py-1 px-3"
              >
                {verificationResult.verified ? (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Verified Authentic
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-5 w-5" />
                    Not Verified
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Batch Information */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Batch Number</p>
                    <p className="font-semibold text-lg">{verificationResult.batchNumber}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Product</p>
                    <p className="font-semibold">{verificationResult.productName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Manufacturer</p>
                    <p className="font-semibold">{verificationResult.millName}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Production Date</p>
                    <p className="font-semibold">
                      {new Date(verificationResult.productionDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Expiry Date</p>
                    <p className="font-semibold">
                      {new Date(verificationResult.expiryDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Quantity</p>
                    <p className="font-semibold">{verificationResult.quantity} MT</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quality Information */}
            {verificationResult.qualityTested && (
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Quality Tested & Certified
                </h4>
                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Quality Score</p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-green-600 h-3 rounded-full"
                        style={{ width: `${verificationResult.qualityScore}%` }}
                      />
                    </div>
                    <span className="font-bold text-lg">{verificationResult.qualityScore}/100</span>
                  </div>
                </div>
              </div>
            )}

            {/* Security Features */}
            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-3">Security Features</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">NAFDAC Certified</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">SON Approved</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Blockchain Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Tamper-Proof Seal</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>1. Scan QR Code:</strong> Use your device camera to scan the QR code printed
            on the product package. The app will automatically verify the batch.
          </p>
          <p>
            <strong>2. Manual Entry:</strong> If you cannot scan, enter the batch number manually
            (found on the package) and click Verify.
          </p>
          <p>
            <strong>3. Check Verification:</strong> A verified product will show a green badge with
            all product details. If the product cannot be verified, do not purchase or use it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

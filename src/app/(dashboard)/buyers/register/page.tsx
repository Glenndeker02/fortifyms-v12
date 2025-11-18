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
import { Loader2 } from 'lucide-react';

export default function BuyerRegistrationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    // User credentials
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',

    // Organization details
    organizationName: '',
    organizationType: 'SCHOOL',
    registrationNumber: '',
    taxId: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',

    // Address
    streetAddress: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Nigeria',

    // Additional info
    annualPurchaseVolume: '',
    preferredCommodities: '',
    bankName: '',
    accountNumber: '',
    bankBranch: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/buyers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
          organizationName: formData.organizationName,
          organizationType: formData.organizationType,
          registrationNumber: formData.registrationNumber,
          taxId: formData.taxId,
          contactPerson: formData.contactPerson,
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone,
          address: {
            street: formData.streetAddress,
            city: formData.city,
            state: formData.state,
            postalCode: formData.postalCode,
            country: formData.country,
          },
          annualPurchaseVolume: formData.annualPurchaseVolume
            ? parseFloat(formData.annualPurchaseVolume)
            : undefined,
          preferredCommodities: formData.preferredCommodities
            ? formData.preferredCommodities.split(',').map((c) => c.trim())
            : [],
          bankDetails: {
            bankName: formData.bankName,
            accountNumber: formData.accountNumber,
            bankBranch: formData.bankBranch,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      toast({
        title: 'Success',
        description: 'Registration submitted successfully. Awaiting FWGA verification.',
      });

      router.push('/buyers/pending');
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
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Institutional Buyer Registration</CardTitle>
          <CardDescription>
            Register as an institutional buyer to access the FWGA procurement marketplace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User Credentials */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Account Credentials</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    required
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    required
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number *</Label>
                  <Input
                    id="phoneNumber"
                    required
                    value={formData.phoneNumber}
                    onChange={(e) => handleChange('phoneNumber', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Organization Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Organization Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="organizationName">Organization Name *</Label>
                  <Input
                    id="organizationName"
                    required
                    value={formData.organizationName}
                    onChange={(e) => handleChange('organizationName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organizationType">Organization Type *</Label>
                  <Select
                    value={formData.organizationType}
                    onValueChange={(value) => handleChange('organizationType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SCHOOL">School</SelectItem>
                      <SelectItem value="NGO">NGO</SelectItem>
                      <SelectItem value="GOVERNMENT_AGENCY">Government Agency</SelectItem>
                      <SelectItem value="PRIVATE_INSTITUTION">Private Institution</SelectItem>
                      <SelectItem value="COOPERATIVE">Cooperative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Registration Number *</Label>
                  <Input
                    id="registrationNumber"
                    required
                    value={formData.registrationNumber}
                    onChange={(e) => handleChange('registrationNumber', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input
                    id="taxId"
                    value={formData.taxId}
                    onChange={(e) => handleChange('taxId', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person *</Label>
                  <Input
                    id="contactPerson"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => handleChange('contactPerson', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    required
                    value={formData.contactEmail}
                    onChange={(e) => handleChange('contactEmail', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone *</Label>
                  <Input
                    id="contactPhone"
                    required
                    value={formData.contactPhone}
                    onChange={(e) => handleChange('contactPhone', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Address</h3>
              <div className="space-y-2">
                <Label htmlFor="streetAddress">Street Address *</Label>
                <Input
                  id="streetAddress"
                  required
                  value={formData.streetAddress}
                  onChange={(e) => handleChange('streetAddress', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    required
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    required
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code *</Label>
                  <Input
                    id="postalCode"
                    required
                    value={formData.postalCode}
                    onChange={(e) => handleChange('postalCode', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input id="country" required value={formData.country} disabled />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Additional Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="annualPurchaseVolume">Annual Purchase Volume (MT)</Label>
                  <Input
                    id="annualPurchaseVolume"
                    type="number"
                    value={formData.annualPurchaseVolume}
                    onChange={(e) => handleChange('annualPurchaseVolume', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferredCommodities">Preferred Commodities (comma-separated)</Label>
                  <Input
                    id="preferredCommodities"
                    placeholder="e.g., Maize, Sorghum, Millet"
                    value={formData.preferredCommodities}
                    onChange={(e) => handleChange('preferredCommodities', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Bank Details</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => handleChange('bankName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => handleChange('accountNumber', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankBranch">Branch</Label>
                  <Input
                    id="bankBranch"
                    value={formData.bankBranch}
                    onChange={(e) => handleChange('bankBranch', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Registration
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

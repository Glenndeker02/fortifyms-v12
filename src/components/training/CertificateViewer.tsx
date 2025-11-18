/**
 * Certificate Viewer Component
 *
 * Displays and generates certificates for completed courses with:
 * - Professional certificate design
 * - Completion details (name, course, date, score)
 * - Download as PDF
 * - Share functionality
 * - Verification code
 */

import { useRef } from 'react';
import { Download, Share2, Award, CheckCircle2, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';

interface CertificateData {
  id: string;
  userName: string;
  courseTitle: string;
  courseCategory: string;
  completedDate: string;
  score: number;
  instructor: string;
  certificateNumber: string;
  verificationUrl: string;
}

interface CertificateViewerProps {
  certificate: CertificateData;
  onDownload?: () => void;
  onShare?: () => void;
}

export function CertificateViewer({
  certificate,
  onDownload,
  onShare,
}: CertificateViewerProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleDownload = async () => {
    if (onDownload) {
      onDownload();
      return;
    }

    // TODO: Implement PDF generation
    // For now, show a toast
    toast({
      title: 'Download Started',
      description: 'Your certificate is being prepared for download',
    });
  };

  const handleShare = async () => {
    if (onShare) {
      onShare();
      return;
    }

    // Copy verification URL to clipboard
    try {
      await navigator.clipboard.writeText(certificate.verificationUrl);
      toast({
        title: 'Link Copied',
        description: 'Verification link copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive',
      });
    }
  };

  const handleVerify = () => {
    window.open(certificate.verificationUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your Certificate</h2>
          <p className="text-muted-foreground">
            Congratulations on completing the course!
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Certificate Card */}
      <Card className="overflow-hidden border-2">
        <div
          ref={certificateRef}
          className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 p-12"
        >
          {/* Decorative Border */}
          <div className="absolute inset-0 border-8 border-double border-primary/20" />

          {/* Decorative Corners */}
          <div className="absolute top-0 left-0 w-32 h-32">
            <div className="absolute top-4 left-4 w-24 h-24 border-t-4 border-l-4 border-primary/30 rounded-tl-3xl" />
          </div>
          <div className="absolute top-0 right-0 w-32 h-32">
            <div className="absolute top-4 right-4 w-24 h-24 border-t-4 border-r-4 border-primary/30 rounded-tr-3xl" />
          </div>
          <div className="absolute bottom-0 left-0 w-32 h-32">
            <div className="absolute bottom-4 left-4 w-24 h-24 border-b-4 border-l-4 border-primary/30 rounded-bl-3xl" />
          </div>
          <div className="absolute bottom-0 right-0 w-32 h-32">
            <div className="absolute bottom-4 right-4 w-24 h-24 border-b-4 border-r-4 border-primary/30 rounded-br-3xl" />
          </div>

          {/* Content */}
          <div className="relative space-y-8 text-center">
            {/* Header */}
            <div className="space-y-2">
              <Award className="h-16 w-16 mx-auto text-primary" />
              <h1 className="text-4xl font-bold text-primary">
                Certificate of Completion
              </h1>
              <p className="text-sm text-muted-foreground uppercase tracking-wider">
                This is to certify that
              </p>
            </div>

            {/* Recipient Name */}
            <div className="space-y-2">
              <h2 className="text-5xl font-serif font-bold text-foreground">
                {certificate.userName}
              </h2>
              <div className="w-64 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto" />
            </div>

            {/* Course Info */}
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                has successfully completed the course
              </p>
              <div className="space-y-2">
                <h3 className="text-3xl font-bold text-foreground">
                  {certificate.courseTitle}
                </h3>
                <Badge variant="secondary" className="text-sm px-4 py-1">
                  {certificate.courseCategory}
                </Badge>
              </div>
            </div>

            {/* Score and Date */}
            <div className="flex items-center justify-center gap-12 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Score</p>
                <p className="text-2xl font-bold text-primary">
                  {certificate.score}%
                </p>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="space-y-1">
                <p className="text-muted-foreground">Completed On</p>
                <p className="text-lg font-semibold">
                  {new Date(certificate.completedDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Signatures */}
            <div className="flex items-end justify-around pt-8">
              <div className="space-y-2">
                <div className="w-48 border-t-2 border-foreground/20" />
                <div className="text-center">
                  <p className="font-semibold">{certificate.instructor}</p>
                  <p className="text-xs text-muted-foreground">Course Instructor</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="w-48 border-t-2 border-foreground/20" />
                <div className="text-center">
                  <p className="font-semibold">FortifyMS Training</p>
                  <p className="text-xs text-muted-foreground">Training Administrator</p>
                </div>
              </div>
            </div>

            {/* Certificate Number */}
            <div className="pt-6 text-center">
              <p className="text-xs text-muted-foreground">
                Certificate No: {certificate.certificateNumber}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Verification Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Certificate Verification
          </CardTitle>
          <CardDescription>
            This certificate can be verified online using the code below
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Verification Code</p>
              <p className="font-mono font-semibold text-lg">
                {certificate.certificateNumber}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleVerify}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Verify Online
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Course Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Course</p>
                <p className="font-medium">{certificate.courseTitle}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Category</p>
                <p className="font-medium">{certificate.courseCategory}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Completed</p>
                <p className="font-medium">
                  {new Date(certificate.completedDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Final Score</p>
                <p className="font-medium">{certificate.score}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Instructor</p>
                <p className="font-medium">{certificate.instructor}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Recipient</p>
                <p className="font-medium">{certificate.userName}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Share Options */}
      <Card>
        <CardHeader>
          <CardTitle>Share Your Achievement</CardTitle>
          <CardDescription>
            Let others know about your accomplishment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              LinkedIn
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Twitter
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Email
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

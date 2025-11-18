'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wheat,
  Gauge,
  Package,
  Workflow,
  Droplets,
  ArrowLeft,
  ChevronRight,
  HelpCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';

interface DiagnosticCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  subcategories: Array<{
    id: string;
    name: string;
  }>;
}

const categoryIcons: Record<string, any> = {
  '🍚': Wheat,
  '🌽': Wheat,
  '⚙️': Gauge,
  '📦': Package,
  '🔄': Workflow,
  '💧': Droplets,
};

export default function NewDiagnosticPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<DiagnosticCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/diagnostics/categories');
      const data = await response.json();

      if (Array.isArray(data)) {
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: 'Error',
        description: 'Failed to load diagnostic categories',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartDiagnostic = async () => {
    if (!selectedCategory || !selectedSubcategory) {
      toast({
        title: 'Selection Required',
        description: 'Please select both a category and subcategory',
        variant: 'destructive',
      });
      return;
    }

    try {
      setStarting(true);

      const response = await fetch('/api/diagnostics/questionnaire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: selectedCategory,
          subcategory: selectedSubcategory,
        }),
      });

      const result = await response.json();

      if (response.ok && result.diagnosticId) {
        // Navigate to wizard with diagnostic ID
        router.push(`/diagnostics/wizard/${result.diagnosticId}`);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to start diagnostic',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error starting diagnostic:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while starting the diagnostic',
        variant: 'destructive',
      });
    } finally {
      setStarting(false);
    }
  };

  const selectedCategoryData = categories.find((c) => c.id === selectedCategory);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/diagnostics')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Start New Diagnostic</h1>
          <p className="text-muted-foreground mt-1">
            Select a process category and specific area to begin troubleshooting
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                selectedCategory ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                1
              </div>
              <span className={selectedCategory ? 'font-medium' : 'text-muted-foreground'}>
                Category
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                selectedSubcategory ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                2
              </div>
              <span className={selectedSubcategory ? 'font-medium' : 'text-muted-foreground'}>
                Subcategory
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                3
              </div>
              <span className="text-muted-foreground">Questionnaire</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Category Selection */}
      {!selectedCategory && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Step 1: Select Process Category</h2>
            <Button variant="outline" size="sm">
              <HelpCircle className="mr-2 h-4 w-4" />
              Need Help?
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              const IconComponent = categoryIcons[category.icon] || Gauge;

              return (
                <Card
                  key={category.id}
                  className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <IconComponent className="h-8 w-8 text-primary" />
                      </div>
                      <Badge variant="outline">
                        {category.subcategories.length} areas
                      </Badge>
                    </div>
                    <CardTitle className="text-xl">{category.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {category.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p className="font-medium mb-2">Diagnostic areas:</p>
                      {category.subcategories.slice(0, 3).map((sub, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <ChevronRight className="h-3 w-3" />
                          <span>{sub.name}</span>
                        </div>
                      ))}
                      {category.subcategories.length > 3 && (
                        <div className="text-xs italic">
                          +{category.subcategories.length - 3} more...
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Step 2: Subcategory Selection */}
      {selectedCategory && !selectedSubcategory && selectedCategoryData && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Step 2: Select Specific Area</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Category: {selectedCategoryData.name}
              </p>
            </div>
            <Button variant="outline" onClick={() => setSelectedCategory(null)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Change Category
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {selectedCategoryData.subcategories.map((subcategory) => (
              <Card
                key={subcategory.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
                onClick={() => setSelectedSubcategory(subcategory.id)}
              >
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ChevronRight className="h-5 w-5 text-primary" />
                    {subcategory.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Click to start diagnostic wizard for this area
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Step 3: Confirmation and Start */}
      {selectedCategory && selectedSubcategory && selectedCategoryData && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Ready to Start</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Review your selection before starting the diagnostic
              </p>
            </div>
            <Button variant="outline" onClick={() => setSelectedSubcategory(null)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Change Area
            </Button>
          </div>

          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Diagnostic Summary</CardTitle>
              <CardDescription>
                You will be guided through a series of questions to identify and resolve issues
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm font-medium">Category:</span>
                  <span className="text-sm">{selectedCategoryData.name}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm font-medium">Specific Area:</span>
                  <span className="text-sm">
                    {selectedCategoryData.subcategories.find((s) => s.id === selectedSubcategory)?.name}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium">Estimated Time:</span>
                  <span className="text-sm">10-15 minutes</span>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">What to expect:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Step-by-step guided questions</li>
                  <li>Contextual help and reference values</li>
                  <li>Ability to save progress and resume later</li>
                  <li>Detailed recommendations at completion</li>
                  <li>Links to relevant training resources</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  className="flex-1"
                  size="lg"
                  onClick={handleStartDiagnostic}
                  disabled={starting}
                >
                  {starting ? 'Starting...' : 'Start Diagnostic Wizard'}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => router.push('/diagnostics')}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

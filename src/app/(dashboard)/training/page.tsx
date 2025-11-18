'use client';

/**
 * Training Course Library Page
 *
 * Displays all available training courses with:
 * - Search and filtering
 * - Category organization
 * - Progress tracking
 * - Skill level filtering
 * - Duration and module count
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  BookOpen,
  Clock,
  Award,
  Play,
  CheckCircle2,
  TrendingUp,
  Grid,
  List,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  skillLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: number; // minutes
  moduleCount: number;
  enrollmentCount: number;
  thumbnailUrl: string;
  instructor: string;
  progress?: number; // 0-100
  isEnrolled?: boolean;
  isCompleted?: boolean;
  certificateAvailable?: boolean;
}

const MOCK_COURSES: Course[] = [
  {
    id: 'course-1',
    title: 'Moisture Control Best Practices',
    description: 'Learn advanced techniques for maintaining optimal moisture levels in grain processing',
    category: 'Grain Quality',
    skillLevel: 'Intermediate',
    duration: 120,
    moduleCount: 8,
    enrollmentCount: 234,
    thumbnailUrl: '/images/courses/moisture-control.jpg',
    instructor: 'Dr. Sarah Johnson',
    progress: 65,
    isEnrolled: true,
  },
  {
    id: 'course-2',
    title: 'Temperature Management Fundamentals',
    description: 'Master temperature control systems and sensor calibration',
    category: 'Equipment Operation',
    skillLevel: 'Beginner',
    duration: 90,
    moduleCount: 6,
    enrollmentCount: 456,
    thumbnailUrl: '/images/courses/temperature.jpg',
    instructor: 'John Smith',
    progress: 100,
    isEnrolled: true,
    isCompleted: true,
    certificateAvailable: true,
  },
  {
    id: 'course-3',
    title: 'Mill Speed Optimization',
    description: 'Advanced strategies for optimizing mill speed and efficiency',
    category: 'Process Optimization',
    skillLevel: 'Advanced',
    duration: 180,
    moduleCount: 12,
    enrollmentCount: 189,
    thumbnailUrl: '/images/courses/mill-speed.jpg',
    instructor: 'Michael Chen',
  },
  {
    id: 'course-4',
    title: 'Safety Protocols and Procedures',
    description: 'Comprehensive safety training for mill operations',
    category: 'Safety',
    skillLevel: 'Beginner',
    duration: 75,
    moduleCount: 5,
    enrollmentCount: 678,
    thumbnailUrl: '/images/courses/safety.jpg',
    instructor: 'Linda Martinez',
    progress: 30,
    isEnrolled: true,
  },
  {
    id: 'course-5',
    title: 'Quality Assurance Testing',
    description: 'Learn testing procedures and quality metrics',
    category: 'Grain Quality',
    skillLevel: 'Intermediate',
    duration: 150,
    moduleCount: 10,
    enrollmentCount: 345,
    thumbnailUrl: '/images/courses/qa-testing.jpg',
    instructor: 'Dr. Robert Lee',
  },
  {
    id: 'course-6',
    title: 'Preventive Maintenance Essentials',
    description: 'Essential maintenance procedures to prevent equipment failures',
    category: 'Maintenance',
    skillLevel: 'Beginner',
    duration: 100,
    moduleCount: 7,
    enrollmentCount: 567,
    thumbnailUrl: '/images/courses/maintenance.jpg',
    instructor: 'Tom Wilson',
  },
];

export default function TrainingLibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'all' | 'enrolled' | 'completed'>('all');

  // Fetch courses
  useEffect(() => {
    fetchCourses();
  }, []);

  // Apply search from URL on mount
  useEffect(() => {
    const search = searchParams.get('search');
    if (search) {
      setSearchQuery(search);
    }
  }, [searchParams]);

  const fetchCourses = async () => {
    try {
      setLoading(true);

      // TODO: Replace with actual API call
      // const response = await fetch('/api/training/courses');
      // const data = await response.json();
      // setCourses(data.courses);

      // For now, use mock data
      await new Promise((resolve) => setTimeout(resolve, 500));
      setCourses(MOCK_COURSES);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter courses
  const filteredCourses = courses.filter((course) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !course.title.toLowerCase().includes(query) &&
        !course.description.toLowerCase().includes(query) &&
        !course.category.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Category filter
    if (selectedCategory !== 'all' && course.category !== selectedCategory) {
      return false;
    }

    // Level filter
    if (selectedLevel !== 'all' && course.skillLevel !== selectedLevel) {
      return false;
    }

    // Tab filter
    if (activeTab === 'enrolled' && !course.isEnrolled) {
      return false;
    }
    if (activeTab === 'completed' && !course.isCompleted) {
      return false;
    }

    return true;
  });

  // Get unique categories
  const categories = Array.from(new Set(courses.map((c) => c.category)));

  const handleCourseClick = (courseId: string) => {
    router.push(`/training/courses/${courseId}`);
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Training Library</h1>
        <p className="text-muted-foreground mt-1">
          Browse courses and enhance your skills
        </p>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Skill Level Filter */}
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger>
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs and View Mode */}
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="all">All Courses</TabsTrigger>
            <TabsTrigger value="enrolled">My Courses</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} found
      </div>

      {/* Course Grid/List */}
      {loading ? (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }
        >
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-96" />
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Courses Found</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters or search query
            </p>
          </CardContent>
        </Card>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }
        >
          {filteredCourses.map((course) => (
            <Card
              key={course.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleCourseClick(course.id)}
            >
              {/* Thumbnail */}
              <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <BookOpen className="h-16 w-16 text-primary/40" />
                {course.isCompleted && (
                  <div className="absolute top-2 right-2 bg-green-600 text-white rounded-full p-2">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                )}
              </div>

              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-2">
                    {course.title}
                  </CardTitle>
                  {course.certificateAvailable && (
                    <Award className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  )}
                </div>
                <CardDescription className="line-clamp-2">
                  {course.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{course.category}</Badge>
                  <Badge
                    variant={
                      course.skillLevel === 'Beginner'
                        ? 'secondary'
                        : course.skillLevel === 'Advanced'
                        ? 'destructive'
                        : 'default'
                    }
                  >
                    {course.skillLevel}
                  </Badge>
                </div>

                {/* Meta Info */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(course.duration)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{course.moduleCount} modules</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    <span>{course.enrollmentCount}</span>
                  </div>
                </div>

                {/* Progress */}
                {course.isEnrolled && course.progress !== undefined && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{course.progress}%</span>
                    </div>
                    <Progress value={course.progress} />
                  </div>
                )}

                {/* Instructor */}
                <p className="text-sm text-muted-foreground">
                  By {course.instructor}
                </p>
              </CardContent>

              <CardFooter>
                <Button className="w-full" variant={course.isEnrolled ? 'default' : 'outline'}>
                  {course.isCompleted ? (
                    <>
                      <Award className="mr-2 h-4 w-4" />
                      View Certificate
                    </>
                  ) : course.isEnrolled ? (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Continue Learning
                    </>
                  ) : (
                    <>
                      <BookOpen className="mr-2 h-4 w-4" />
                      Enroll Now
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

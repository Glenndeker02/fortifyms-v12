'use client';

/**
 * Simulation Library Page
 *
 * Browse and access interactive simulations with:
 * - Grid/list view of available simulations
 * - Category filtering
 * - Difficulty levels
 * - Completion status tracking
 * - Estimated time and attempts
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play,
  Clock,
  Trophy,
  Target,
  Zap,
  CheckCircle2,
  Filter,
  Search,
  Layers,
  TrendingUp,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

interface Simulation {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedTime: number; // minutes
  scenarioCount: number;
  thumbnailUrl: string;
  isCompleted?: boolean;
  bestScore?: number;
  attempts?: number;
  unlocked: boolean;
}

const MOCK_SIMULATIONS: Simulation[] = [
  {
    id: 'sim-1',
    title: 'Emergency Mill Shutdown',
    description:
      'Practice responding to critical mill equipment failures and emergency shutdown procedures.',
    category: 'Emergency Response',
    difficulty: 'Advanced',
    estimatedTime: 20,
    scenarioCount: 8,
    thumbnailUrl: '/images/simulations/emergency.jpg',
    isCompleted: true,
    bestScore: 85,
    attempts: 3,
    unlocked: true,
  },
  {
    id: 'sim-2',
    title: 'Moisture Control Calibration',
    description:
      'Learn to calibrate moisture sensors and adjust control systems for optimal performance.',
    category: 'Equipment Calibration',
    difficulty: 'Intermediate',
    estimatedTime: 15,
    scenarioCount: 6,
    thumbnailUrl: '/images/simulations/moisture.jpg',
    isCompleted: true,
    bestScore: 92,
    attempts: 2,
    unlocked: true,
  },
  {
    id: 'sim-3',
    title: 'Quality Control Inspection',
    description:
      'Conduct a thorough quality inspection and make decisions based on grain quality metrics.',
    category: 'Quality Assurance',
    difficulty: 'Beginner',
    estimatedTime: 12,
    scenarioCount: 5,
    thumbnailUrl: '/images/simulations/quality.jpg',
    isCompleted: false,
    unlocked: true,
  },
  {
    id: 'sim-4',
    title: 'Production Line Optimization',
    description:
      'Optimize mill production line settings to maximize efficiency while maintaining quality.',
    category: 'Process Optimization',
    difficulty: 'Advanced',
    estimatedTime: 25,
    scenarioCount: 10,
    thumbnailUrl: '/images/simulations/optimization.jpg',
    isCompleted: false,
    unlocked: true,
  },
  {
    id: 'sim-5',
    title: 'Safety Protocol Training',
    description:
      'Practice safety procedures and emergency response in various hazard scenarios.',
    category: 'Safety',
    difficulty: 'Beginner',
    estimatedTime: 10,
    scenarioCount: 4,
    thumbnailUrl: '/images/simulations/safety.jpg',
    isCompleted: false,
    unlocked: true,
  },
  {
    id: 'sim-6',
    title: 'Advanced Troubleshooting',
    description:
      'Diagnose and resolve complex equipment issues using systematic troubleshooting methods.',
    category: 'Troubleshooting',
    difficulty: 'Advanced',
    estimatedTime: 30,
    scenarioCount: 12,
    thumbnailUrl: '/images/simulations/troubleshooting.jpg',
    isCompleted: false,
    unlocked: false,
  },
];

export default function SimulationLibraryPage() {
  const router = useRouter();

  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'in-progress'>(
    'all'
  );

  useEffect(() => {
    fetchSimulations();
  }, []);

  const fetchSimulations = async () => {
    try {
      setLoading(true);

      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSimulations(MOCK_SIMULATIONS);
    } catch (error) {
      console.error('Error fetching simulations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter simulations
  const filteredSimulations = simulations.filter((sim) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !sim.title.toLowerCase().includes(query) &&
        !sim.description.toLowerCase().includes(query) &&
        !sim.category.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Category filter
    if (selectedCategory !== 'all' && sim.category !== selectedCategory) {
      return false;
    }

    // Difficulty filter
    if (selectedDifficulty !== 'all' && sim.difficulty !== selectedDifficulty) {
      return false;
    }

    // Tab filter
    if (activeTab === 'completed' && !sim.isCompleted) {
      return false;
    }
    if (activeTab === 'in-progress' && (sim.isCompleted || !sim.attempts)) {
      return false;
    }

    return true;
  });

  // Get unique categories
  const categories = Array.from(new Set(simulations.map((s) => s.category)));

  const handleStartSimulation = (simulationId: string) => {
    router.push(`/training/simulations/${simulationId}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'Intermediate':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Advanced':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Interactive Simulations
        </h1>
        <p className="text-muted-foreground mt-1">
          Practice real-world scenarios in a safe, simulated environment
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold">
                  {simulations.filter((s) => s.unlocked).length}
                </p>
              </div>
              <Layers className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">
                  {simulations.filter((s) => s.isCompleted).length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">
                  {simulations.filter((s) => s.attempts && !s.isCompleted).length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Score</p>
                <p className="text-2xl font-bold">
                  {simulations
                    .filter((s) => s.bestScore)
                    .reduce((acc, s) => acc + (s.bestScore || 0), 0) /
                    (simulations.filter((s) => s.bestScore).length || 1) || 0}
                  %
                </p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search simulations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
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

            {/* Difficulty Filter */}
            <Select
              value={selectedDifficulty}
              onValueChange={setSelectedDifficulty}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Difficulties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">All Simulations</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
            {filteredSimulations.length} simulation
            {filteredSimulations.length !== 1 ? 's' : ''} found
          </div>

          {/* Simulation Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton key={idx} className="h-96" />
              ))}
            </div>
          ) : filteredSimulations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  No Simulations Found
                </h3>
                <p className="text-muted-foreground">
                  Try adjusting your filters or search query
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSimulations.map((simulation) => (
                <Card
                  key={simulation.id}
                  className={`hover:shadow-lg transition-shadow ${
                    !simulation.unlocked ? 'opacity-60' : ''
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative h-48 bg-gradient-to-br from-primary/20 to-purple/5 flex items-center justify-center">
                    <Target className="h-16 w-16 text-primary/40" />
                    {simulation.isCompleted && (
                      <div className="absolute top-2 right-2 bg-green-600 text-white rounded-full p-2">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                    )}
                    {!simulation.unlocked && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Badge variant="secondary">Locked</Badge>
                      </div>
                    )}
                  </div>

                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2">
                        {simulation.title}
                      </CardTitle>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {simulation.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{simulation.category}</Badge>
                      <Badge className={getDifficultyColor(simulation.difficulty)}>
                        {simulation.difficulty}
                      </Badge>
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{simulation.estimatedTime} min</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Layers className="h-4 w-4" />
                        <span>{simulation.scenarioCount} scenarios</span>
                      </div>
                    </div>

                    {/* Progress/Score */}
                    {simulation.bestScore !== undefined && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Best Score</span>
                        <Badge variant="secondary">{simulation.bestScore}%</Badge>
                      </div>
                    )}

                    {simulation.attempts !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        {simulation.attempts} attempt
                        {simulation.attempts !== 1 ? 's' : ''}
                      </div>
                    )}
                  </CardContent>

                  <CardFooter>
                    <Button
                      className="w-full"
                      onClick={() => handleStartSimulation(simulation.id)}
                      disabled={!simulation.unlocked}
                    >
                      {simulation.isCompleted ? (
                        <>
                          <Trophy className="mr-2 h-4 w-4" />
                          Replay
                        </>
                      ) : simulation.attempts ? (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Continue
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-4 w-4" />
                          Start Simulation
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

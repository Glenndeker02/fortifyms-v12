'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, BookOpen, TrendingUp, Eye } from 'lucide-react';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  _count: { articles: number };
}

interface Article {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  viewCount: number;
  helpfulCount: number;
  category: { name: string };
}

export default function HelpCenterPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [popularArticles, setPopularArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, articlesRes] = await Promise.all([
        fetch('/api/help/categories'),
        fetch('/api/help/articles?sortBy=views&limit=5'),
      ]);

      const categoriesData = await categoriesRes.json();
      const articlesData = await articlesRes.json();

      if (categoriesData.success) {
        setCategories(categoriesData.data.categories);
      }

      if (articlesData.success) {
        setPopularArticles(articlesData.data.articles);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load help content',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      window.location.href = `/help/search?q=${encodeURIComponent(search)}`;
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">How can we help you?</h1>
        <p className="text-muted-foreground mb-8">
          Search our knowledge base or browse categories below
        </p>

        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search for articles, guides, and documentation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-14 text-lg"
            />
          </div>
        </form>
      </div>

      {/* Categories */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Browse by Category</h2>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading categories...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Link key={category.id} href={`/help/category/${category.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {category.icon && <span className="text-2xl">{category.icon}</span>}
                      {category.name}
                    </CardTitle>
                    {category.description && (
                      <CardDescription>{category.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {category._count.articles} {category._count.articles === 1 ? 'article' : 'articles'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Popular Articles */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Popular Articles</h2>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading articles...</div>
        ) : popularArticles.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No articles available yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {popularArticles.map((article) => (
              <Link key={article.id} href={`/help/articles/${article.slug}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{article.title}</h3>
                          <Badge variant="secondary">{article.category.name}</Badge>
                        </div>
                        {article.summary && (
                          <p className="text-muted-foreground mb-3">{article.summary}</p>
                        )}
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            {article.viewCount} views
                          </span>
                          <span>{article.helpfulCount} found helpful</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <Card className="mt-12 bg-muted">
        <CardContent className="py-8 text-center">
          <h3 className="text-xl font-semibold mb-2">Can't find what you're looking for?</h3>
          <p className="text-muted-foreground mb-4">
            Our support team is here to help you with any questions
          </p>
          <Link href="/support/tickets/create">
            <Button size="lg">Create Support Ticket</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

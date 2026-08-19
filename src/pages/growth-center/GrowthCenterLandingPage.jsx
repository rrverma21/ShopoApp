import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabaseClient';
import { Lightbulb, AlertCircle, BookOpen } from 'lucide-react';
import BlogCard from '@/components/growth-center/BlogCard';
import BlogCategoryFilter from '@/components/growth-center/BlogCategoryFilter';
import BlogSearchBar from '@/components/growth-center/BlogSearchBar';
import LoadingFallback from '@/components/LoadingFallback';
import { Button } from '@/components/ui/button';

export default function GrowthCenterLandingPage() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch active categories
      const { data: catData, error: catError } = await supabase
        .from('blog_categories')
        .select('id, name')
        .order('name');
        
      if (catError) throw catError;
      setCategories(catData || []);

      // Fetch published articles with category info
      const { data: artData, error: artError } = await supabase
        .from('articles')
        .select(`
          id, title, slug, excerpt, published_at, featured_image_url, category_id,
          blog_categories ( name )
        `)
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (artError) throw artError;
      setArticles(artData || []);
      
    } catch (err) {
      console.error('Error fetching blog data:', err);
      setError('Unable to load articles at this time. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const matchesCategory = selectedCategory === null || article.category_id === selectedCategory;
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' || 
                            (article.title && article.title.toLowerCase().includes(searchLower)) ||
                            (article.excerpt && article.excerpt.toLowerCase().includes(searchLower));
      
      return matchesCategory && matchesSearch;
    });
  }, [articles, selectedCategory, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 w-full flex flex-col">
      <Helmet>
        <title>ShopoApp | Smart POS Billing, Inventory & Taxation Software</title>
        <meta name="description" content="Explore ShopoApp's powerful POS billing, inventory, GST, loyalty, and digital store features built for retail businesses in India." />
      </Helmet>
      
      {/* Hero Section */}
      <section className="relative w-full bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1504983875-d3b163aba9e6" 
            alt="Growth Center Background" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent" />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 py-20 lg:py-28 text-center max-w-4xl">
          <div className="inline-flex items-center justify-center p-3 bg-primary/20 rounded-full mb-6 ring-1 ring-primary/30">
            <Lightbulb className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 tracking-tight">
            Growth Center
          </h1>
          <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Discover actionable insights, retail strategies, and expert advice to help you scale your business and outpace the competition.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="flex-1 container mx-auto px-4 py-12 lg:py-16">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <BlogCategoryFilter 
            categories={categories} 
            selectedCategory={selectedCategory} 
            onSelectCategory={setSelectedCategory} 
          />
          <div className="md:w-1/3 flex justify-end">
            <BlogSearchBar 
              searchTerm={searchTerm} 
              onSearchChange={setSearchTerm} 
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingFallback message="Loading insights..." />
          </div>
        ) : error ? (
          <div className="py-16 text-center max-w-lg mx-auto bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/50 p-8">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">Oops! Something went wrong</h3>
            <p className="text-red-600/80 dark:text-red-400/80 mb-6">{error}</p>
            <Button onClick={fetchData} variant="outline" className="border-red-200 text-red-600 hover:bg-red-100">
              Try Again
            </Button>
          </div>
        ) : filteredArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredArticles.map(article => (
              <BlogCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className="py-24 text-center max-w-md mx-auto">
            <div className="bg-slate-100 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3">No articles found</h3>
            <p className="text-slate-500 dark:text-slate-400">
              We couldn't find any articles matching your search or selected category.
            </p>
            {(searchTerm || selectedCategory) && (
              <Button 
                variant="link" 
                onClick={() => { setSearchTerm(''); setSelectedCategory(null); }}
                className="mt-4 text-primary"
              >
                Clear all filters
              </Button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
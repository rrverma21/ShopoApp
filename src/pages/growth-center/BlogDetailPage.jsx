import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, User, Tag, Share2, AlertCircle } from 'lucide-react';
import LoadingFallback from '@/components/LoadingFallback';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import SafeHtml from '@/components/SafeHtml';

export default function BlogDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (slug) {
      fetchArticle();
    }
  }, [slug]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('articles')
        .select(`
          *,
          blog_categories ( name ),
          profiles ( business_name, contact_person )
        `)
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      if (!data) {
        setError('Article not found or has been removed.');
        return;
      }
      
      setArticle(data);
    } catch (err) {
      console.error('Error fetching article:', err);
      setError('Unable to load the article. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = article?.title || 'Growth Center Article';
    
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (err) {
        console.error('Share error:', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      toast({
        title: "Link Copied",
        description: "Article link copied to clipboard!",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col pt-16">
        <div className="flex-1 flex justify-center items-center">
          <LoadingFallback message="Loading article..." />
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-24 px-4 pb-12 flex flex-col items-center justify-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-6" />
        <h1 className="text-3xl font-bold text-foreground mb-4">Article Not Found</h1>
        <p className="text-muted-foreground max-w-md text-center mb-8">
          {error || "The article you're looking for doesn't exist or has been unpublished."}
        </p>
        <Button onClick={() => navigate('/growth-center')} className="bg-primary text-primary-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Growth Center
        </Button>
      </div>
    );
  }

  const fallbackImage = 'https://images.unsplash.com/photo-1504983875-d3b163aba9e6';
  const imageUrl = article.featured_image_url || fallbackImage;
  const publishDate = article.published_at ? format(new Date(article.published_at), 'dd MMM yyyy') : 'Recently';
  const categoryName = article.blog_categories?.name || 'Uncategorized';
  const authorName = article.profiles?.contact_person || article.profiles?.business_name || 'ShopoApp Team';

  return (
    <article className="min-h-screen bg-background pb-20">
      <SEO 
        title="ShopoApp | Smart POS Billing, Inventory & Taxation Software"
        description={article.meta_description || article.excerpt || article.title}
        image={imageUrl}
      />
      
      {/* Hero Banner */}
      <div className="relative w-full h-[40vh] md:h-[50vh] lg:h-[60vh] bg-slate-900">
        <div className="absolute inset-0">
          <img 
            src={imageUrl} 
            alt={article.title} 
            className="w-full h-full object-cover opacity-40"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = fallbackImage;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
        
        <div className="absolute top-6 left-4 md:left-8 z-20">
          <Link to="/growth-center">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 hover:text-white backdrop-blur-sm bg-black/20 border border-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>
        </div>
      </div>

      {/* Article Content Container */}
      <div className="container mx-auto px-4 relative z-10 -mt-32 md:-mt-48 max-w-4xl">
        <div className="bg-card text-card-foreground rounded-2xl shadow-xl border border-border p-6 md:p-12">
          
          {/* Header Info */}
          <div className="mb-8 border-b border-border pb-8">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary border-none text-sm px-3 py-1">
                <Tag className="w-3.5 h-3.5 mr-1.5" />
                {categoryName}
              </Badge>
              <div className="flex items-center text-muted-foreground text-sm">
                <Calendar className="w-4 h-4 mr-1.5" />
                {publishDate}
              </div>
            </div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
              {article.title}
            </h1>
            
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg mr-3">
                  {authorName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm">{authorName}</p>
                  <p className="text-xs text-muted-foreground">Author</p>
                </div>
              </div>
              
              <Button variant="outline" size="sm" onClick={handleShare} className="shrink-0">
                <Share2 className="w-4 h-4 mr-2" /> Share
              </Button>
            </div>
          </div>

          {/* Article Body */}
          <SafeHtml html={article.content || '<p>No content available.</p>'} />
          
        </div>
      </div>
    </article>
  );
}
import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronRight, Calendar } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function BlogCard({ article }) {
  const fallbackImage = 'https://images.unsplash.com/photo-1504983875-d3b163aba9e6';
  const imageUrl = article.featured_image_url || fallbackImage;
  const publishDate = article.published_at ? format(new Date(article.published_at), 'dd MMM yyyy') : 'Recently';
  const categoryName = article.blog_categories?.name || 'Uncategorized';
  
  const excerpt = article.excerpt 
    ? (article.excerpt.length > 160 ? article.excerpt.substring(0, 160) + '...' : article.excerpt)
    : 'Read this article to discover more insights and updates from our Growth Center.';

  return (
    <Card className="flex flex-col h-full overflow-hidden hover:shadow-lg transition-all duration-300 border-slate-200 dark:border-slate-800 bg-card">
      <div className="relative h-48 overflow-hidden bg-muted">
        <img 
          src={imageUrl} 
          alt={article.title || 'Blog Post'} 
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = fallbackImage;
          }}
        />
        <div className="absolute top-3 left-3">
          <Badge className="bg-primary/90 hover:bg-primary text-primary-foreground backdrop-blur-sm">
            {categoryName}
          </Badge>
        </div>
      </div>
      
      <CardHeader className="pb-3 pt-5">
        <div className="flex items-center text-xs text-muted-foreground mb-2 space-x-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>{publishDate}</span>
        </div>
        <h3 className="text-xl font-bold leading-tight text-foreground line-clamp-2">
          {article.title}
        </h3>
      </CardHeader>
      
      <CardContent className="flex-grow pb-4">
        <p className="text-muted-foreground text-sm line-clamp-3">
          {excerpt}
        </p>
      </CardContent>
      
      <CardFooter className="pt-0 pb-5">
        <Link to={`/growth-center/${article.slug}`} className="w-full">
          <Button variant="outline" className="w-full justify-between group text-primary border-primary/20 hover:bg-primary/5 hover:border-primary/50">
            Read More
            <ChevronRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
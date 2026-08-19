import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, FileText, Search, Edit, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function BlogManagement() {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch Categories
      const { data: catData, error: catError } = await supabase
        .from('blog_categories')
        .select('id, name')
        .order('name');
        
      if (catError) throw catError;
      setCategories(catData || []);

      // Fetch Posts
      const { data: postData, error: postError } = await supabase
        .from('articles')
        .select('*, blog_categories(name)')
        .order('created_at', { ascending: false });

      if (postError) throw postError;
      setPosts(postData || []);

    } catch (err) {
      console.error('Error fetching blog data:', err);
      setError('Unable to load blog posts. Please try again.');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load blog data.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPosts(posts.filter(post => post.id !== id));
      toast({
        title: "Success",
        description: "Post has been deleted successfully.",
      });
    } catch (err) {
      console.error("Error deleting post:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete the post.",
      });
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || post.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FileText className="w-8 h-8 text-primary" />
            Growth Center Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage your blog posts, articles, and categories.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={() => navigate('/admin/growth-center/categories')} className="flex-1 md:flex-none">
            <FolderOpen className="w-4 h-4 mr-2" /> Categories
          </Button>
          <Button 
            onClick={() => navigate('/admin/growth-center/posts/new')} 
            className="flex-1 md:flex-none bg-gradient-to-r from-sky-500 to-blue-700 hover:from-sky-600 hover:to-blue-800 text-white shadow-md border-none transition-all duration-300 transform active:scale-95"
          >
            <Plus className="w-4 h-4 mr-2" /> New Post
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card text-card-foreground shadow-sm rounded-lg p-4 mb-6 border border-border flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search posts by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-full md:w-64 shrink-0">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-card text-card-foreground shadow-sm rounded-lg border border-border overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading posts...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Data</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchData} variant="outline">Try Again</Button>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                <FileText className="h-8 w-8" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">No posts found</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchQuery || categoryFilter !== 'all' 
                ? "No posts match your current search filters. Try adjusting them." 
                : "You haven't created any blog posts yet. Click below to write your first post."}
            </p>
            {!(searchQuery || categoryFilter !== 'all') && (
              <Button 
                onClick={() => navigate('/admin/growth-center/posts/new')}
                className="bg-gradient-to-r from-sky-500 to-blue-700 hover:from-sky-600 hover:to-blue-800 text-white shadow-md border-none transition-all duration-300"
              >
                <Plus className="w-4 h-4 mr-2" /> Create First Post
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[40%]">Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Publish Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPosts.map((post) => (
                  <TableRow key={post.id} className="admin-table-row">
                    <TableCell className="font-medium">
                      <div className="line-clamp-1" title={post.title}>
                        {post.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      {post.blog_categories?.name ? (
                        <Badge variant="outline" className="font-normal text-xs">
                          {post.blog_categories.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Uncategorized</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={post.status === 'published' ? 'default' : 'secondary'}
                        className={post.status === 'published' ? 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 border-none' : ''}
                      >
                        {post.status === 'published' ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {post.published_at 
                        ? format(new Date(post.published_at), 'MMM dd, yyyy') 
                        : format(new Date(post.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => navigate(`/admin/growth-center/posts/${post.id}/edit`)}
                          title="Edit Post"
                        >
                          <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(post.id)}
                          className="hover:bg-red-100 dark:hover:bg-red-900/30"
                          title="Delete Post"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import SafeHtml from '@/components/SafeHtml';

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['link', 'clean']
  ],
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet',
  'align',
  'link'
];

export default function BlogPostEditor() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('draft');
  const [categoryId, setCategoryId] = useState('none');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [featuredImage, setFeaturedImage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchCategories();
    if (isEditMode && id) {
      fetchPostData();
    } else {
      setLoading(false);
      setTitle('');
      setContent('');
      setStatus('draft');
      setCategoryId('none');
      setFeaturedImage('');
    }
  }, [id, isEditMode]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('blog_categories')
      .select('id, name')
      .order('name');
    if (data && !error) {
      setCategories(data);
    }
  };

  const fetchPostData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setTitle(data.title || '');
        setContent(data.content || '');
        setStatus(data.status || 'draft');
        setCategoryId(data.category_id || 'none');
        setFeaturedImage(data.featured_image_url || '');
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load the post. It may have been deleted.",
      });
      navigate('/admin/growth-center/posts');
    } finally {
      setLoading(false);
    }
  };

  const deleteImageFromStorage = async (imageUrl) => {
    if (!imageUrl || !imageUrl.includes('/blog-images/')) return;
    try {
      const path = imageUrl.split('/blog-images/')[1];
      if (path) {
        await supabase.storage.from('blog-images').remove([path]);
      }
    } catch (error) {
      console.error('Failed to delete old image from storage', error);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid File',
        description: 'Please upload a valid image file (JPEG, PNG, WEBP).',
      });
      return;
    }

    setUploadingImage(true);
    try {
      // If replacing an existing image, attempt to delete it first
      if (featuredImage) {
        await deleteImageFromStorage(featuredImage);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `post-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('blog-images').getPublicUrl(filePath);
      
      setFeaturedImage(data.publicUrl);
      toast({
        title: 'Success',
        description: 'Featured image uploaded successfully.',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error.message || 'An error occurred while uploading the image.',
      });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    if (featuredImage) {
      await deleteImageFromStorage(featuredImage);
    }
    setFeaturedImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async (publishStatus = status) => {
    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Post title is required.",
      });
      return;
    }

    setSaving(true);
    try {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      
      const { data: userData } = await supabase.auth.getUser();
      
      const postData = {
        title,
        content,
        status: publishStatus,
        slug,
        category_id: categoryId === 'none' ? null : categoryId,
        featured_image_url: featuredImage || null,
        updated_at: new Date().toISOString(),
      };

      if (!isEditMode && userData?.user) {
        postData.author_id = userData.user.id;
      }

      if (publishStatus === 'published' && status !== 'published') {
        postData.published_at = new Date().toISOString();
      }

      let result;
      if (isEditMode) {
        result = await supabase
          .from('articles')
          .update(postData)
          .eq('id', id);
      } else {
        result = await supabase
          .from('articles')
          .insert([postData]);
      }

      if (result.error) throw result.error;

      toast({
        title: "Success",
        description: `Post successfully ${isEditMode ? 'updated' : 'created'}.`,
      });
      navigate('/admin/growth-center/posts');
    } catch (error) {
      console.error('Error saving post:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save the post.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate('/admin/growth-center/posts')} className="hover:bg-slate-100 dark:hover:bg-slate-800">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Posts
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            disabled={saving} 
            onClick={() => handleSave('draft')}
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save Draft
          </Button>
          <Button 
            disabled={saving} 
            onClick={() => handleSave('published')} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isEditMode && status === 'published' ? 'Update Post' : 'Publish Post'}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Editor Section */}
        <div className="bg-card text-card-foreground shadow-sm rounded-lg p-6 border border-border flex flex-col h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
          <h2 className="text-2xl font-bold mb-6">{isEditMode ? 'Edit Post' : 'Write New Post'}</h2>
          
          <div className="space-y-6 flex-1 flex flex-col">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Post Title</label>
                <Input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-lg font-medium" 
                  placeholder="Enter an engaging title..." 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Category</label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Uncategorized</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">Featured Image</label>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
              />
              
              {uploadingImage ? (
                <div className="border-2 border-dashed border-border rounded-md p-8 flex flex-col items-center justify-center bg-muted/30 h-48">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Uploading image...</p>
                </div>
              ) : featuredImage ? (
                <div className="relative border border-border rounded-md overflow-hidden group">
                  <img src={featuredImage} alt="Featured" className="w-full h-48 object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <Button 
                      variant="secondary" 
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      <ImageIcon className="w-4 h-4 mr-2" /> Change
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage();
                      }}
                    >
                      <X className="w-4 h-4 mr-2" /> Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-border rounded-md p-8 flex flex-col items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer h-48"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">Click to upload featured image</p>
                  <p className="text-xs text-muted-foreground">Supported formats: JPEG, PNG, WEBP</p>
                </div>
              )}
            </div>
            
            <div className="flex-1 flex flex-col min-h-[300px]">
              <label className="block text-sm font-medium mb-1 text-foreground">Content</label>
              <div className="border border-input rounded-md overflow-hidden flex-1 bg-background text-foreground [&_.ql-toolbar]:bg-muted/50 [&_.ql-toolbar]:border-b-input [&_.ql-container]:border-0 [&_.ql-editor]:min-h-[250px] [&_.ql-editor]:text-base">
                <ReactQuill 
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  modules={modules}
                  formats={formats}
                  className="h-full flex flex-col"
                  placeholder="Write your amazing content here..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Section */}
        <div className="bg-card text-card-foreground shadow-sm rounded-lg p-6 border border-border h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-border">
            <h2 className="text-2xl font-bold">Live Preview</h2>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">Real-time</span>
          </div>
          
          <article className="max-w-none">
            {featuredImage && (
              <div className="mb-6 rounded-xl overflow-hidden shadow-sm relative">
                <img src={featuredImage} alt={title || 'Featured Preview'} className="w-full h-auto max-h-[300px] object-cover" />
              </div>
            )}
            
            {title ? (
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-6 leading-tight">
                {title}
              </h1>
            ) : (
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-6 leading-tight text-muted-foreground/40 italic">
                Your post title will appear here...
              </h1>
            )}
            
            {content ? (
              <SafeHtml html={content} />
            ) : (
              <div className="text-muted-foreground/60 italic mt-8">
                Start typing in the editor to see your formatted content preview here...
              </div>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}
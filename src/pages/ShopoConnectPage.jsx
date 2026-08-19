import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  Users, Store, Zap, Sparkles, PlusCircle, Tag, ShoppingBag, 
  Smile, Bell, BookOpen, BarChart2, Image as ImageIcon, X, Loader2, RefreshCw
} from 'lucide-react';
import SearchBar from '@/components/shopo-connect/SearchBar';
import PostCard from '@/components/shopo-connect/PostCard';
import OfferCard from '@/components/shopo-connect/OfferCard';
import BusinessListingCard from '@/components/shopo-connect/BusinessListingCard';
import DailyOfferForm from '@/components/shopo-connect/DailyOfferForm';
import BusinessListingForm from '@/components/shopo-connect/BusinessListingForm';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CATEGORIES = [
  { name: 'All', count: 156 },
  { name: 'Grocery', count: 45 },
  { name: 'Electronics', count: 32 },
  { name: 'Fashion', count: 28 },
  { name: 'Medicine', count: 18 },
  { name: 'Hardware', count: 33 },
];

const POST_TYPES = [
  { id: 'New Arrival', icon: Sparkles, label: 'New Arrival' },
  { id: 'Offer', icon: Tag, label: 'Offer' },
  { id: 'Greeting', icon: Smile, label: 'Greeting' },
  { id: 'Update', icon: Bell, label: 'Update' },
  { id: 'Story', icon: BookOpen, label: 'Story' },
  { id: 'Poll', icon: BarChart2, label: 'Poll' }
];

export default function ShopoConnectPage() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showFeedModal, setShowFeedModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showListingModal, setShowListingModal] = useState(false);
  
  const [feedPosts, setFeedPosts] = useState([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [feedError, setFeedError] = useState(null);

  const [dailyOffers, setDailyOffers] = useState([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(true);
  const [offersError, setOffersError] = useState(null);

  const [businessListings, setBusinessListings] = useState([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [listingsError, setListingsError] = useState(null);

  const [postType, setPostType] = useState('New Arrival');
  const [postContent, setPostContent] = useState('');
  const [postCategory, setPostCategory] = useState('Grocery');
  const [postImages, setPostImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  
  const fileInputRef = useRef(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchFeedPosts = useCallback(async () => {
    setIsLoadingFeed(true);
    setFeedError(null);
    try {
      let { data, error } = await supabase
        .from('feed_posts')
        .select(`*, profiles (business_name, contact_person, avatar_url)`)
        .order('created_at', { ascending: false });

      if (error && error.message.includes('relationship')) {
        console.warn('Profiles relationship missing for feed_posts, fetching without profiles...');
        const fallback = await supabase.from('feed_posts').select('*').order('created_at', { ascending: false });
        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;

      const mappedPosts = (data || []).map(post => ({
        id: post.id,
        userName: post.profiles?.business_name || post.profiles?.contact_person || 'ShopoApp User',
        userAvatar: post.profiles?.avatar_url || '',
        category: post.category,
        postType: post.post_type,
        content: post.content,
        images: post.images || [],
        createdAt: post.created_at,
        likes: post.likes_count || 0,
        isLiked: false, 
        isSaved: false, 
        comments: [] 
      }));

      setFeedPosts(mappedPosts);
    } catch (err) {
      console.error('Error fetching feed posts:', err);
      setFeedError(err.message || 'Failed to load community feed.');
    } finally {
      setIsLoadingFeed(false);
    }
  }, []);

  const fetchDailyOffers = useCallback(async () => {
    setIsLoadingOffers(true);
    setOffersError(null);
    try {
      let { data, error } = await supabase
        .from('daily_offers')
        .select(`*, profiles (business_name, contact_person, avatar_url)`)
        .order('created_at', { ascending: false });

      if (error && error.message.includes('relationship')) {
        console.warn('Profiles relationship missing for daily_offers, fetching without profiles...');
        const fallback = await supabase.from('daily_offers').select('*').order('created_at', { ascending: false });
        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;
      setDailyOffers(data || []);
    } catch (err) {
      console.error('Error fetching daily offers:', err);
      setOffersError(err.message || 'Failed to load daily offers.');
    } finally {
      setIsLoadingOffers(false);
    }
  }, []);

  const fetchBusinessListings = useCallback(async () => {
    setIsLoadingListings(true);
    setListingsError(null);
    try {
      let { data, error } = await supabase
        .from('business_listings')
        .select(`*, profiles (business_name, contact_person, avatar_url)`)
        .order('created_at', { ascending: false });

      if (error && error.message.includes('relationship')) {
        console.warn('Profiles relationship missing for business_listings, fetching without profiles...');
        const fallback = await supabase.from('business_listings').select('*').order('created_at', { ascending: false });
        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;
      setBusinessListings(data || []);
    } catch (err) {
      console.error('Error fetching business listings:', err);
      setListingsError(err.message || 'Failed to load business listings.');
    } finally {
      setIsLoadingListings(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedPosts();
    fetchDailyOffers();
    fetchBusinessListings();
  }, [fetchFeedPosts, fetchDailyOffers, fetchBusinessListings]);

  const filteredFeedPosts = useMemo(() => {
    if (!searchQuery.trim()) return feedPosts;
    const lowerQuery = searchQuery.toLowerCase();
    return feedPosts.filter(post => 
      post.content?.toLowerCase().includes(lowerQuery) ||
      post.postType?.toLowerCase().includes(lowerQuery) ||
      post.category?.toLowerCase().includes(lowerQuery) ||
      post.userName?.toLowerCase().includes(lowerQuery)
    );
  }, [searchQuery, feedPosts]);

  const filteredDailyOffers = useMemo(() => {
    if (!searchQuery.trim()) return dailyOffers;
    const lowerQuery = searchQuery.toLowerCase();
    return dailyOffers.filter(offer => 
      offer.product_name?.toLowerCase().includes(lowerQuery) ||
      offer.description?.toLowerCase().includes(lowerQuery) ||
      offer.category?.toLowerCase().includes(lowerQuery) ||
      offer.profiles?.business_name?.toLowerCase().includes(lowerQuery)
    );
  }, [searchQuery, dailyOffers]);

  const filteredBusinessListings = useMemo(() => {
    if (!searchQuery.trim()) return businessListings;
    const lowerQuery = searchQuery.toLowerCase();
    return businessListings.filter(listing => 
      listing.business_name?.toLowerCase().includes(lowerQuery) ||
      listing.product_name?.toLowerCase().includes(lowerQuery) ||
      listing.product_description?.toLowerCase().includes(lowerQuery) ||
      listing.business_category?.toLowerCase().includes(lowerQuery)
    );
  }, [searchQuery, businessListings]);

  const handleOfferSuccess = (newOffer) => {
    setShowOfferModal(false);
    setDailyOffers(prev => [newOffer, ...prev]);
  };

  const handleListingSuccess = (newListing) => {
    setShowListingModal(false);
    setBusinessListings(prev => [newListing, ...prev]);
  };

  const resetFeedForm = () => {
    setPostType('New Arrival');
    setPostContent('');
    setPostCategory('Grocery');
    setPostImages([]);
    setFormError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFeedModalChange = (open) => {
    setShowFeedModal(open);
    if (!open) resetFeedForm();
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (postImages.length + files.length > 3) {
      setFormError("You can only upload up to 3 images.");
      return;
    }
    setFormError('');
    const newImages = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
    setPostImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index) => {
    setPostImages(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const isFormValid = postType && postContent.trim().length > 0 && postCategory && postContent.length <= 500;

  const handleFeedSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || !user) return;

    setIsSubmitting(true);
    setFormError('');

    try {
      const uploadedImageUrls = [];
      if (postImages.length > 0) {
        for (const img of postImages) {
          const fileExt = img.file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;
          const { error: uploadError } = await supabase.storage.from('feed-images').upload(filePath, img.file);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('feed-images').getPublicUrl(filePath);
          uploadedImageUrls.push(publicUrl);
        }
      }

      const { data: newPostData, error: dbError } = await supabase
        .from('feed_posts')
        .insert({
          user_id: user.id,
          post_type: postType,
          category: postCategory,
          content: postContent,
          images: uploadedImageUrls
        })
        .select(`*, profiles (business_name, contact_person, avatar_url)`)
        .single();

      if (dbError) throw dbError;

      const mappedNewPost = {
        id: newPostData.id,
        userName: newPostData.profiles?.business_name || newPostData.profiles?.contact_person || 'ShopoApp User',
        userAvatar: newPostData.profiles?.avatar_url || '',
        category: newPostData.category,
        postType: newPostData.post_type,
        content: newPostData.content,
        images: newPostData.images || [],
        createdAt: newPostData.created_at,
        likes: 0, isLiked: false, isSaved: false, comments: []
      };

      setFeedPosts(prev => [mappedNewPost, ...prev]);
      toast({ title: "Post Published!", className: "bg-green-50 border-green-200 text-green-900" });
      handleFeedModalChange(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to publish", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <Helmet>
        <title>ShopoApp | Smart POS Billing, Inventory & Taxation Software</title>
        <meta name="description" content="ShopoConnect | ShopoApp Community Market & Social Commerce." />
      </Helmet>

      <section className="relative w-full h-[300px] md:h-[400px] bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1667106636887-007281c47a55?w=1600&h=600&fit=crop" 
            alt="ShopoConnect Community" 
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />
        </div>
        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center max-w-4xl text-center">
          <div className="inline-flex items-center justify-center p-2.5 bg-primary/20 rounded-full mb-6 mx-auto ring-1 ring-primary/30 w-fit">
            <Sparkles className="w-5 h-5 text-primary-foreground mr-2" />
            <span className="text-sm font-bold text-white uppercase tracking-widest">Community Hub</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 tracking-tight">ShopoConnect</h1>
          <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto font-medium">
            Your B2B Social Commerce network. Discover trusted suppliers, daily hot deals, and industry updates all in one place.
          </p>
        </div>
      </section>

      {user && (
        <div className="container mx-auto px-4 py-6 max-w-7xl relative z-20">
          <div className="flex flex-wrap gap-4 items-center justify-center md:justify-start bg-white dark:bg-slate-900 p-4 rounded-xl border border-border shadow-sm">
            <Button onClick={() => setShowFeedModal(true)} variant="primary" className="font-semibold shadow-sm">
              <PlusCircle className="w-4 h-4 mr-2" /> Post to Feed
            </Button>
            <Button onClick={() => setShowOfferModal(true)} variant="secondary" className="font-semibold shadow-sm border border-border">
              <Tag className="w-4 h-4 mr-2" /> Post Daily Offer
            </Button>
            <Button onClick={() => setShowListingModal(true)} variant="outline" className="font-semibold shadow-sm border-primary text-primary hover:bg-primary/5">
              <ShoppingBag className="w-4 h-4 mr-2" /> Post Business Listing
            </Button>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 max-w-7xl mt-4 mb-8">
        <SearchBar value={searchQuery} onChange={e => setSearchQuery(e?.target?.value ?? e)} onClear={() => setSearchQuery('')} />
      </div>

      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-8 flex flex-col gap-10">
            <section>
              <div className="flex items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">Daily Offers</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchDailyOffers} disabled={isLoadingOffers}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingOffers ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              {isLoadingOffers ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map(i => (
                    <div key={i} className="shopo-card p-4 space-y-4"><Skeleton className="w-full h-48 rounded-lg" /><Skeleton className="h-6 w-3/4" /></div>
                  ))}
                </div>
              ) : offersError ? (
                <div className="text-center py-8 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-border text-red-500">{offersError}</div>
              ) : filteredDailyOffers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDailyOffers.map(offer => <OfferCard key={offer.id} offer={offer} />)}
                </div>
              ) : (
                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-border">
                  <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No offers found.</p>
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">Community Feed</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchFeedPosts} disabled={isLoadingFeed}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingFeed ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              
              {isLoadingFeed ? (
                <div className="space-y-6">
                  {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl border p-5"><Skeleton className="h-20 w-full" /></div>)}
                </div>
              ) : feedError ? (
                <div className="text-center py-12 text-red-500 bg-white border rounded-xl">{feedError}</div>
              ) : filteredFeedPosts.length > 0 ? (
                <div className="flex flex-col gap-6">
                  {filteredFeedPosts.map(post => <PostCard key={post.id} post={post} />)}
                </div>
              ) : (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-dashed">
                  <p className="text-muted-foreground">No posts found.</p>
                </div>
              )}
            </section>
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-[140px]">
              <div className="flex items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Store className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground tracking-tight">Business Listings</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchBusinessListings} disabled={isLoadingListings}>
                  <RefreshCw className={`w-4 h-4 ${isLoadingListings ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              
              {isLoadingListings ? (
                <div className="flex flex-col gap-4">
                  {[1, 2, 3].map(i => <div key={i} className="shopo-card p-4"><Skeleton className="h-32 w-full" /></div>)}
                </div>
              ) : listingsError ? (
                <div className="text-center py-12 text-red-500 bg-white border rounded-xl">{listingsError}</div>
              ) : filteredBusinessListings.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {filteredBusinessListings.map(listing => (
                    <BusinessListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-border">
                  <Store className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">No business listings found.</p>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>

      {/* Feed Modal */}
      <Dialog open={showFeedModal} onOpenChange={handleFeedModalChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Post</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFeedSubmit} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label>Content <span className="text-red-500">*</span></Label>
              <Textarea value={postContent} onChange={e => setPostContent(e.target.value)} maxLength={500} />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => handleFeedModalChange(false)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={!isFormValid || isSubmitting}>Post</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Offer Modal */}
      <Dialog open={showOfferModal} onOpenChange={setShowOfferModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[95vh] overflow-y-auto p-0">
          <div className="p-6 pb-0">
            <DialogHeader><DialogTitle className="text-2xl">Post Daily Offer</DialogTitle></DialogHeader>
          </div>
          <div className="px-6 pb-6">
            <DailyOfferForm onCancel={() => setShowOfferModal(false)} onSuccess={handleOfferSuccess} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Listing Modal */}
      <Dialog open={showListingModal} onOpenChange={setShowListingModal}>
        <DialogContent className="sm:max-w-[800px] max-h-[95vh] overflow-y-auto p-0">
          <div className="p-6 pb-0">
            <DialogHeader>
              <DialogTitle className="text-2xl">Post Business Listing</DialogTitle>
              <DialogDescription>List your business products and connect with buyers.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-6 pb-6">
            <BusinessListingForm onCancel={() => setShowListingModal(false)} onSuccess={handleListingSuccess} />
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
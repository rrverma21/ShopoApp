import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import StarRating from './StarRating';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, MessageSquare } from 'lucide-react';

const ReviewsList = ({ targetId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (targetId) {
      fetchReviews();
    }
  }, [targetId]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          profiles!reviewer_id (
            business_name,
            contact_person,
            avatar_url
          )
        `)
        .eq('target_id', targetId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-200">
        <MessageSquare className="w-8 h-8 mx-auto text-slate-300 mb-2" />
        <p className="text-slate-500">No reviews yet. Be the first to review!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Customer Reviews ({reviews.length})</h3>
      <div className="space-y-4">
        {reviews.map((review) => {
          const reviewerName = review.profiles?.business_name || review.profiles?.contact_person || 'Anonymous Customer';
          const initials = reviewerName.substring(0, 2).toUpperCase();
          
          return (
            <div key={review.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10 border">
                  <AvatarImage src={review.profiles?.avatar_url} />
                  <AvatarFallback className="bg-slate-100 text-slate-600">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900">{reviewerName}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StarRating rating={review.rating} size="sm" readOnly />
                        <span className="text-xs text-slate-400">• {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReviewsList;
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabaseClient';
import StarRating from './StarRating';
import { Loader2 } from 'lucide-react';

const ReviewDialog = ({ 
  isOpen, 
  onClose, 
  targetId, 
  targetName, 
  orderId = null, 
  bookingId = null, 
  type = 'shop',
  onReviewSubmitted 
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a star rating.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const reviewData = {
        reviewer_id: user.id,
        target_id: targetId,
        rating,
        comment,
        review_type: type,
        ...(orderId && { order_id: orderId }),
        ...(bookingId && { booking_id: bookingId })
      };

      const { error } = await supabase.from('reviews').insert([reviewData]);

      if (error) throw error;

      toast({
        title: "Review Submitted",
        description: "Thank you for your feedback!",
      });

      if (onReviewSubmitted) onReviewSubmitted();
      onClose();
      
      // Reset form
      setRating(0);
      setComment('');

    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Your Experience</DialogTitle>
          <DialogDescription>
            How was your experience with <span className="font-semibold text-slate-900">{targetName}</span>?
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-6 py-4">
          <div className="flex flex-col items-center gap-2">
            <Label className="text-base text-slate-600">Click stars to rate</Label>
            <StarRating 
              rating={rating} 
              size="lg" 
              onRatingChange={setRating} 
              className="gap-2"
            />
            <span className="text-sm font-medium text-slate-500 min-h-[20px]">
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Very Good"}
              {rating === 5 && "Excellent!"}
            </span>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="comment">Write a review (optional)</Label>
            <Textarea
              id="comment"
              placeholder="Tell us what you liked or what could be improved..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="h-24 resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewDialog;
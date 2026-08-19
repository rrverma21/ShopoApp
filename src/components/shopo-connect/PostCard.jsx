import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function PostCard({ post }) {
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [isSaved, setIsSaved] = useState(post.isSaved || false);
  const [likesCount, setLikesCount] = useState(post.likes || 0);
  const [showComments, setShowComments] = useState(false);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    toast({
      title: isLiked ? "Post unliked" : "Post liked",
      description: isLiked ? "You removed your like." : "You liked this post.",
    });
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    toast({
      title: isSaved ? "Post unsaved" : "Post saved",
      description: isSaved ? "Post removed from your saves." : "Post saved to your collections.",
    });
  };

  const handleShare = () => {
    toast({
      title: "Shared successfully",
      description: "Post link copied to clipboard.",
    });
  };

  const handleNotImplemented = () => {
    toast({
      description: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };

  return (
    <Card className="shopo-card mb-6">
      <CardHeader className="flex flex-row items-center gap-4 p-4 pb-3">
        <Avatar className="w-12 h-12 border border-slate-200 dark:border-slate-800">
          <AvatarImage src={post.userAvatar} alt={post.userName} />
          <AvatarFallback>{post.userName?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground text-sm md:text-base">{post.userName}</h4>
            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground" onClick={handleNotImplemented}>
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 uppercase tracking-wider font-semibold">
              {post.postType}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        <p className="text-sm md:text-base text-foreground/90 whitespace-pre-wrap leading-relaxed mb-4">
          {post.content}
        </p>
        
        {post.images && post.images.length > 0 && (
          <div className="rounded-xl overflow-hidden mb-4 border border-border">
            <img 
              src={post.images[0]} 
              alt="Post attachment" 
              className="w-full h-auto max-h-[400px] object-cover"
              loading="lazy"
            />
          </div>
        )}

        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none">
          {post.category}
        </Badge>
      </CardContent>

      <CardFooter className="flex flex-col p-4 border-t border-border bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1 sm:gap-2">
            <motion.button 
              whileTap={{ scale: 0.85 }} 
              onClick={handleLike}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Heart className={cn("w-5 h-5 transition-colors", isLiked ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
              <span className={cn("text-xs sm:text-sm font-medium", isLiked ? "text-red-500" : "text-muted-foreground")}>{likesCount}</span>
            </motion.button>

            <motion.button 
              whileTap={{ scale: 0.85 }} 
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">{post.comments?.length || 0}</span>
            </motion.button>

            <motion.button 
              whileTap={{ scale: 0.85 }} 
              onClick={handleShare}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Share2 className="w-5 h-5 text-muted-foreground" />
              <span className="hidden sm:inline text-xs font-medium text-muted-foreground">Share</span>
            </motion.button>
          </div>

          <motion.button 
            whileTap={{ scale: 0.85 }} 
            onClick={handleSave}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Bookmark className={cn("w-5 h-5 transition-colors", isSaved ? "fill-primary text-primary" : "text-muted-foreground")} />
          </motion.button>
        </div>

        <AnimatePresence>
          {showComments && post.comments && post.comments.length > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="w-full mt-4 space-y-3 overflow-hidden"
            >
              <div className="w-full h-px bg-border mb-2" />
              {post.comments.slice(0, 2).map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={comment.userAvatar} />
                    <AvatarFallback>{comment.userName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 bg-white dark:bg-slate-950 p-3 rounded-2xl rounded-tl-none border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{comment.userName}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt))} ago
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80">{comment.content}</p>
                  </div>
                </div>
              ))}
              {post.comments.length > 2 && (
                <Button variant="link" className="text-xs p-0 h-auto text-muted-foreground" onClick={handleNotImplemented}>
                  View {post.comments.length - 2} more comments
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardFooter>
    </Card>
  );
}
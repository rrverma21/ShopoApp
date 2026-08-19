import React from 'react';
import { sanitizeHtml } from '@/lib/htmlSanitizer';
import { cn } from '@/lib/utils';

export default function SafeHtml({ html, className, ...props }) {
  if (!html) return null;
  
  const sanitized = sanitizeHtml(html);
  
  return (
    <div 
      className={cn("prose prose-slate dark:prose-invert max-w-none", className)}
      dangerouslySetInnerHTML={{ __html: sanitized }}
      {...props}
    />
  );
}
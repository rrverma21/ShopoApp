import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, X, Image as ImageIcon, FileImage, CheckCircle, 
  AlertCircle, Trash2, Plus, Star, RefreshCw, XCircle, ArrowUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/use-toast';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file
const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB total limit

const formatBytes = (bytes, decimals = 2) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const MultiImageUploader = ({ 
  initialImages = [], 
  onImagesChange, 
  userId,
  folderPrefix = 'product-images' 
}) => {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);

  // Initialize with existing images only on mount
  useEffect(() => {
    if (initialImages && initialImages.length > 0) {
      const existingFiles = initialImages.map((url, index) => ({
        id: `existing-${index}-${Date.now()}`,
        url,
        preview: url,
        name: `Image ${index + 1}`,
        size: 0, // Size unknown for existing URLs
        status: 'success',
        progress: 100,
        isPrimary: index === 0
      }));
      setFiles(existingFiles);
    }
  }, []); 

  // Notify parent of changes whenever files state updates
  useEffect(() => {
    if (onImagesChange) {
      const uploadedUrls = files
        .filter(f => f.status === 'success' && f.url)
        .map(f => f.url);
      
      const isUploading = files.some(f => f.status === 'uploading' || f.status === 'pending');
      
      onImagesChange({
        urls: uploadedUrls,
        isUploading
      });
    }
  }, [files, onImagesChange]);

  const validateFile = (file, currentFiles) => {
    // MIME type check
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return { valid: false, error: 'Invalid file type. Only JPG, PNG, GIF, WEBP allowed.' };
    }
    
    // Single file size check
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File too large (Max ${formatBytes(MAX_FILE_SIZE)})` };
    }

    // Total size check
    const currentTotal = currentFiles.reduce((acc, f) => acc + (f.file?.size || 0), 0);
    if (currentTotal + file.size > MAX_TOTAL_SIZE) {
      return { valid: false, error: `Total upload limit exceeded (${formatBytes(MAX_TOTAL_SIZE)})` };
    }

    return { valid: true };
  };

  const handleFilesSelected = useCallback((selectedFiles) => {
    const newFiles = Array.from(selectedFiles);
    const validFiles = [];
    const errors = [];

    // Calculate current total size from pending/uploading files
    let currentTotalSize = files.reduce((acc, f) => acc + (f.file?.size || 0), 0);

    newFiles.forEach(file => {
      const { valid, error } = validateFile(file, files);
      if (valid) {
        // Double check cumulative size with new batch
        if (currentTotalSize + file.size > MAX_TOTAL_SIZE) {
           errors.push(`${file.name}: Total size limit exceeded.`);
        } else {
           currentTotalSize += file.size;
           validFiles.push({
             id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
             file,
             preview: URL.createObjectURL(file),
             name: file.name,
             size: file.size,
             status: 'pending',
             progress: 0,
             error: null,
             isPrimary: files.length === 0 && validFiles.length === 0 // First file is primary if list empty
           });
        }
      } else {
        errors.push(`${file.name}: ${error}`);
      }
    });

    if (errors.length > 0) {
      toast({
        title: "Some files were rejected",
        description: (
          <ul className="list-disc pl-4 text-xs mt-1 max-h-20 overflow-y-auto">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        ),
        variant: "destructive"
      });
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
  }, [files]);

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const uploadSingleFile = async (fileObj) => {
    if (!fileObj.file || fileObj.status === 'success') return fileObj;

    try {
      setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'uploading', progress: 0 } : f));

      // Use a sanitized filename
      const fileExt = fileObj.file.name.split('.').pop();
      const fileName = `${folderPrefix}/${userId || 'anon'}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => {
          if (f.id === fileObj.id && f.status === 'uploading') {
             const newProgress = Math.min(f.progress + 15, 90);
             return { ...f, progress: newProgress };
          }
          return f;
        }));
      }, 300);

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, fileObj.file, {
          cacheControl: '3600',
          upsert: false
        });

      clearInterval(progressInterval);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      return {
        ...fileObj,
        status: 'success',
        progress: 100,
        url: publicUrl,
        file: null // Free up memory
      };

    } catch (err) {
      console.error("Upload error:", err);
      return {
        ...fileObj,
        status: 'error',
        progress: 0,
        error: err.message || "Upload failed"
      };
    }
  };

  const startUpload = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error');
    if (pendingFiles.length === 0) return;

    setUploading(true);

    // Process concurrently in batches of 3
    const queue = [...pendingFiles];
    const BATCH_SIZE = 3;

    for (let i = 0; i < queue.length; i += BATCH_SIZE) {
        const batch = queue.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(f => uploadSingleFile(f));
        
        const batchResults = await Promise.all(batchPromises);
        
        // Update state with results
        batchResults.forEach(updatedFile => {
            setFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
        });
    }

    setUploading(false);
    
    const allSuccess = files.filter(f => f.status !== 'success').length === 0; 
    // Note: checking current state is safer, but we need to rely on the latest batch updates
    // The loop updates state, but 'files' in this scope is stale.
    // However, the UI updates automatically. 
    
    if (allSuccess) {
       // Optional: Auto-toast on complete success
    }
  };

  const removeFile = (id) => {
    setFiles(prev => {
        const newFiles = prev.filter(f => f.id !== id);
        // If we removed the primary, assign new primary if exists
        if (prev.find(f => f.id === id)?.isPrimary && newFiles.length > 0) {
            newFiles[0].isPrimary = true;
        }
        return newFiles;
    });
  };

  const setPrimary = (id) => {
    setFiles(prev => {
      const targetIndex = prev.findIndex(f => f.id === id);
      if (targetIndex < 0) return prev;
      
      const newFiles = [...prev];
      const [item] = newFiles.splice(targetIndex, 1);
      
      // Update primary flags
      const updatedFiles = [item, ...newFiles].map((f, idx) => ({
        ...f,
        isPrimary: idx === 0
      }));
      
      return updatedFiles;
    });
  };

  const retryUpload = (id) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'pending', error: null } : f));
    // Trigger generic upload which picks up pending
    setTimeout(startUpload, 100);
  };

  const clearAll = () => {
      setFiles([]);
  };

  // Stats
  const totalFiles = files.length;
  const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const uploadedFiles = files.filter(f => f.status === 'success').length;
  const overallProgress = totalFiles === 0 ? 0 : Math.round((files.reduce((acc, f) => acc + f.progress, 0) / (totalFiles * 100)) * 100);

  return (
    <div className="space-y-4 w-full">
      {/* Upload Area */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl p-6 md:p-10 text-center transition-all duration-200 ease-in-out group",
          isDragging ? "border-blue-500 bg-blue-50/50 scale-[1.01]" : "border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/50",
          files.length === 0 ? "py-16" : "py-6"
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept="image/png, image/jpeg, image/gif, image/webp"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
        
        <div className="flex flex-col items-center justify-center gap-3">
          <div className={cn("p-4 rounded-full bg-slate-100 dark:bg-slate-800 transition-colors group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30", isDragging && "bg-blue-100 animate-pulse")}>
            <Upload className={cn("w-8 h-8 text-slate-400 group-hover:text-blue-600", isDragging && "text-blue-600")} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {isDragging ? "Drop images now" : "Drag & drop images here or click to select"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Supports: JPG, PNG, WEBP (Max 5MB each, 20MB total)
            </p>
          </div>
          <Button 
            type="button" 
            variant="secondary" 
            onClick={() => fileInputRef.current?.click()}
            className="mt-2"
          >
            Select Images
          </Button>
        </div>
      </div>

      {/* Progress & Actions Bar */}
      {files.length > 0 && (
        <Card className="p-4 border shadow-sm bg-white dark:bg-slate-900">
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center text-xs text-slate-500">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{uploadedFiles} of {totalFiles} uploaded</span>
                    <span>{formatBytes(totalSize)} / 20MB</span>
                </div>
                
                {/* Overall Progress Bar */}
                {(uploading || overallProgress > 0) && (
                    <div className="space-y-1">
                        <Progress value={overallProgress} className="h-2" />
                        <div className="flex justify-between text-[10px] text-slate-400">
                            <span>{overallProgress}% Complete</span>
                            {uploading && <span className="animate-pulse text-blue-500 font-medium">Uploading...</span>}
                        </div>
                    </div>
                )}

                <div className="flex gap-2 justify-end">
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={clearAll}
                        disabled={uploading}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                        <Trash2 className="w-4 h-4 mr-2" /> Clear All
                    </Button>
                    {files.some(f => f.status === 'pending' || f.status === 'error') && (
                        <Button 
                            type="button" 
                            size="sm" 
                            onClick={startUpload}
                            disabled={uploading}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {uploading ? (
                                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                            ) : (
                                <><ArrowUp className="w-4 h-4 mr-2" /> Upload Pending</>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </Card>
      )}

      {/* Image Grid */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div 
            layout
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {files.map((file) => (
              <motion.div
                key={file.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className={cn(
                    "relative group rounded-lg border overflow-hidden bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md",
                    file.isPrimary && "ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-slate-950"
                )}
              >
                {/* Thumbnail */}
                <div 
                    className="aspect-square relative cursor-pointer bg-slate-100 dark:bg-slate-800"
                    onClick={() => setPreviewImage(file)}
                >
                    {file.preview ? (
                        <img 
                            src={file.preview} 
                            alt={file.name} 
                            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" 
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <ImageIcon className="w-10 h-10 opacity-50" />
                        </div>
                    )}
                    
                    {/* Status Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-8 w-8 rounded-full bg-white/90 hover:bg-white text-slate-700"
                            onClick={(e) => { e.stopPropagation(); setPreviewImage(file); }}
                            title="Preview"
                        >
                            <ImageIcon className="w-4 h-4" />
                        </Button>
                        {!file.isPrimary && (
                            <Button 
                                variant="secondary" 
                                size="icon" 
                                className="h-8 w-8 rounded-full bg-white/90 hover:bg-white text-yellow-500"
                                onClick={(e) => { e.stopPropagation(); setPrimary(file.id); }}
                                title="Set as Primary"
                            >
                                <Star className="w-4 h-4" />
                            </Button>
                        )}
                    </div>

                    {/* Primary Badge */}
                    {file.isPrimary && (
                        <div className="absolute top-2 left-2 z-10">
                            <Badge className="bg-blue-600 hover:bg-blue-700 text-[10px] shadow-sm">Primary</Badge>
                        </div>
                    )}

                    {/* Status Icons */}
                    <div className="absolute top-2 right-2 z-10">
                        {file.status === 'success' && <CheckCircle className="w-5 h-5 text-green-500 bg-white rounded-full shadow-sm" />}
                        {file.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500 bg-white rounded-full shadow-sm" />}
                        {file.status === 'uploading' && (
                            <div className="w-5 h-5 rounded-full border-2 border-white border-t-blue-500 animate-spin shadow-sm" />
                        )}
                    </div>
                </div>

                {/* File Info */}
                <div className="p-3 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate" title={file.name}>{file.name}</p>
                            <p className="text-[10px] text-slate-500">{file.size > 0 ? formatBytes(file.size) : 'Unknown size'}</p>
                        </div>
                        <button 
                            type="button"
                            onClick={() => removeFile(file.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            title="Remove"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Progress Bar for individual file */}
                    {file.status === 'uploading' && (
                        <Progress value={file.progress} className="h-1" />
                    )}

                    {/* Error Message & Retry */}
                    {file.status === 'error' && (
                        <div className="flex items-center justify-between gap-2 mt-1">
                            <span className="text-[10px] text-red-500 truncate max-w-[100px]" title={file.error}>{file.error || 'Failed'}</span>
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 text-slate-500 hover:text-blue-600"
                                onClick={() => retryUpload(file.id)}
                                title="Retry"
                            >
                                <RefreshCw className="w-3 h-3" />
                            </Button>
                        </div>
                    )}
                </div>
              </motion.div>
            ))}
            
            {/* Add More Button (Card Style) */}
            <motion.button
                layout
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg aspect-square hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
            >
                <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                    <Plus className="w-6 h-6 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300" />
                </div>
                <span className="text-xs font-medium text-slate-500">Add More</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black/95 border-none h-[80vh]">
            <div className="relative w-full h-full flex items-center justify-center">
                <button 
                    onClick={() => setPreviewImage(null)}
                    className="absolute top-4 right-4 z-50 p-2 bg-black/50 text-white rounded-full hover:bg-white/20 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
                {previewImage && (
                    <img 
                        src={previewImage.preview} 
                        alt={previewImage.name} 
                        className="max-w-full max-h-full object-contain" 
                    />
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
                    <p className="font-medium text-sm">{previewImage?.name}</p>
                    <p className="text-xs opacity-70">{formatBytes(previewImage?.size)}</p>
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MultiImageUploader;
import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ImageUploadField({ 
  onImageSelect, 
  onImageRemove, 
  initialImageUrl = null, 
  imageLabel = "Image", 
  imageNumber = 1 
}) {
  const [preview, setPreview] = useState(initialImageUrl);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  useEffect(() => {
    setPreview(initialImageUrl);
  }, [initialImageUrl]);

  const handleFile = (file) => {
    setError(null);

    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Invalid file type. Use JPG, PNG, WebP, or GIF.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File too large. Maximum size is 5MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    if (onImageSelect) onImageSelect(file);
  };

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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (onImageRemove) onImageRemove();
  };

  return (
    <div className="w-full space-y-2">
      <label className="text-sm font-semibold text-slate-700">{imageLabel}</label>
      
      <div 
        className={cn(
          "relative border-2 border-dashed rounded-xl transition-all duration-200 ease-in-out flex flex-col items-center justify-center p-4 min-h-[160px] cursor-pointer group overflow-hidden bg-slate-50",
          isDragging ? "border-blue-500 bg-blue-50 scale-[1.02]" : "border-slate-300 hover:border-slate-400 hover:bg-slate-100",
          error && "border-red-300 bg-red-50"
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !preview && fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          className="hidden" 
          ref={fileInputRef} 
          accept={ALLOWED_TYPES.join(',')} 
          onChange={onFileInputChange}
        />

        {preview ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img 
              src={preview} 
              alt={`Preview ${imageNumber}`} 
              className="max-h-[140px] max-w-full object-contain rounded-md shadow-sm"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-md transform translate-x-1/4 -translate-y-1/4 transition-transform hover:scale-110 z-10"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-2 pointer-events-none">
            <div className="p-3 bg-white rounded-full shadow-sm group-hover:shadow text-slate-400 group-hover:text-blue-500 transition-colors">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Click or drag image here</p>
              <p className="text-xs text-slate-500 mt-1">JPG, PNG, WebP up to 5MB</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-500 font-medium animate-in slide-in-from-top-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
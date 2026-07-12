'use client';

import { useCallback, useState, useEffect } from 'react';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onRemove?: () => void;
  accept?: string;
  maxSizeMB?: number;
  selectedFile?: File | null;
  existingUrl?: string;
  disabled?: boolean;
  className?: string;
}

const truncateFilename = (name: string, maxLen = 28) => {
  if (!name) return '';
  if (name.length <= maxLen) return name;
  const extIndex = name.lastIndexOf('.');
  if (extIndex !== -1 && name.length - extIndex <= 6) {
    const ext = name.substring(extIndex);
    const base = name.substring(0, extIndex);
    return base.substring(0, maxLen - ext.length - 3) + '...' + ext;
  }
  return name.substring(0, maxLen - 3) + '...';
};

export function FileUpload({
  onFileSelect,
  onRemove,
  accept = 'image/jpeg,image/png,image/webp,image/gif,application/pdf',
  maxSizeMB = 10,
  selectedFile,
  existingUrl,
  disabled,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`File too large. Maximum size is ${maxSizeMB}MB.`);
        return;
      }
      onFileSelect(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
    },
    [maxSizeMB, onFileSelect]
  );

  // Global Ctrl+V / Cmd+V paste support when this component is mounted
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled) return;
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        const file = files[0];
        // Check if the pasted file type is accepted
        const allowedTypes = accept.split(',');
        const isAllowed = allowedTypes.some(type => {
          if (type.includes('/*')) {
            return file.type.startsWith(type.replace('/*', ''));
          }
          return file.type === type;
        });

        if (isAllowed) {
          handleFile(file);
        } else if (file.type.startsWith('image/')) {
          // Fallback check if it's an image
          handleFile(file);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleFile, disabled, accept]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemove = () => {
    setPreview(null);
    onRemove?.();
  };

  const hasFile = selectedFile || existingUrl;
  const displayFilename = selectedFile
    ? selectedFile.name
    : existingUrl
    ? existingUrl.split('/').pop() || 'Existing attachment'
    : '';

  return (
    <div className={cn('space-y-2', className)}>
      {hasFile ? (
        <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-accent/20 p-3">
          {preview || (existingUrl && !existingUrl.endsWith('.pdf')) ? (
            <img
              src={preview || existingUrl}
              alt="Preview"
              className="h-14 w-14 rounded-lg object-cover border border-border/30"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" title={displayFilename}>
              {truncateFilename(displayFilename)}
            </p>
            {selectedFile && (
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            onClick={handleRemove}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all duration-200 min-h-[120px]',
            isDragging
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-border/40 hover:border-primary/40 hover:bg-accent/10',
            disabled && 'opacity-50 pointer-events-none'
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Upload className="h-5 w-5 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Drop file, paste (Ctrl+V) or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP, GIF, or PDF (max {maxSizeMB}MB)</p>
          </div>
          <input
            type="file"
            accept={accept}
            onChange={handleChange}
            className="hidden"
            disabled={disabled}
          />
        </label>
      )}
    </div>
  );
}

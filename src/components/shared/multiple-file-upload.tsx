'use client';

import { useCallback, useState, useEffect } from 'react';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MultipleFileUploadProps {
  onFilesChange: (files: File[]) => void;
  onRemoveExisting?: (url: string) => void;
  accept?: string;
  maxSizeMB?: number;
  selectedFiles: File[];
  existingUrls: string[];
  disabled?: boolean;
  className?: string;
}

const truncateFilename = (name: string, maxLen = 22) => {
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

export function MultipleFileUpload({
  onFilesChange,
  onRemoveExisting,
  accept = 'image/jpeg,image/jpg,image/png,image/webp,image/gif,application/pdf',
  maxSizeMB = 10,
  selectedFiles = [],
  existingUrls = [],
  disabled,
  className,
}: MultipleFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  // Generate previews for newly selected files
  useEffect(() => {
    const newPreviews: Record<string, string> = {};
    const readers: FileReader[] = [];

    selectedFiles.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews((prev) => ({ ...prev, [file.name]: reader.result as string }));
        };
        reader.readAsDataURL(file);
        readers.push(reader);
      }
    });

    return () => {
      // Cleanup (none strictly needed as FileReader resolves automatically)
    };
  }, [selectedFiles]);

  const handleFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const validFiles: File[] = [];
      const allowedTypes = accept.split(',');

      Array.from(newFiles).forEach((file) => {
        if (file.size > maxSizeMB * 1024 * 1024) {
          alert(`File "${file.name}" is too large. Max size is ${maxSizeMB}MB.`);
          return;
        }

        const isAllowed = allowedTypes.some((type) => {
          if (type.includes('/*')) {
            return file.type.startsWith(type.replace('/*', ''));
          }
          return file.type === type;
        });

        if (isAllowed || file.type.startsWith('image/')) {
          validFiles.push(file);
        } else {
          alert(`File format of "${file.name}" is not supported.`);
        }
      });

      if (validFiles.length > 0) {
        onFilesChange([...selectedFiles, ...validFiles]);
      }
    },
    [maxSizeMB, selectedFiles, onFilesChange, accept]
  );

  // Ctrl+V paste support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled) return;
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        handleFiles(Array.from(files));
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleFiles, disabled]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files) {
        handleFiles(Array.from(e.dataTransfer.files));
      }
    },
    [handleFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(Array.from(e.target.files));
      }
    },
    [handleFiles]
  );

  const removeSelectedFile = (indexToRemove: number) => {
    const file = selectedFiles[indexToRemove];
    if (file) {
      setPreviews((prev) => {
        const next = { ...prev };
        delete next[file.name];
        return next;
      });
    }
    onFilesChange(selectedFiles.filter((_, i) => i !== indexToRemove));
  };

  const removeExistingFile = (urlToRemove: string) => {
    onRemoveExisting?.(urlToRemove);
  };

  const hasFiles = selectedFiles.length > 0 || existingUrls.length > 0;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Upload Dropzone */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 cursor-pointer transition-all duration-200 min-h-[100px]',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border/40 hover:border-primary/40 hover:bg-accent/10',
          disabled && 'opacity-50 pointer-events-none'
        )}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Upload className="h-4.5 w-4.5 text-primary" />
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold">Drop files, paste (Ctrl+V) or click to browse</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">JPEG, PNG, WebP, GIF, or PDF (up to {maxSizeMB}MB each)</p>
        </div>
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          disabled={disabled}
          multiple
        />
      </label>

      {/* Attachments List */}
      {hasFiles && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
          {/* Existing Files */}
          {existingUrls.map((url, index) => {
            const displayFilename = url.split('/').pop() || 'Invoice Receipt';
            const isPdf = url.toLowerCase().endsWith('.pdf');

            return (
              <div key={`existing-${index}`} className="flex items-center gap-2.5 rounded-xl border border-border/30 bg-accent/10 p-2.5">
                {!isPdf ? (
                  <img
                    src={url}
                    alt="Existing"
                    className="h-11 w-11 rounded-lg object-cover border border-border/20 shrink-0"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate text-foreground" title={displayFilename}>
                    {truncateFilename(displayFilename)}
                  </p>
                  <p className="text-[9px] text-emerald-500 font-bold uppercase">Saved</p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => removeExistingFile(url)}
                  disabled={disabled}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}

          {/* New Selected Files */}
          {selectedFiles.map((file, index) => {
            const displayFilename = file.name;
            const isImage = file.type.startsWith('image/');
            const previewUrl = previews[file.name];

            return (
              <div key={`selected-${index}`} className="flex items-center gap-2.5 rounded-xl border border-border/30 bg-accent/20 p-2.5">
                {isImage && previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-11 w-11 rounded-lg object-cover border border-border/20 shrink-0"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate text-foreground font-medium" title={displayFilename}>
                    {truncateFilename(displayFilename)}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => removeSelectedFile(index)}
                  disabled={disabled}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

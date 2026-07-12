'use client';

import { useEffect, useCallback } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  isOpen: boolean;
  onClose: () => void;
  isPdf?: boolean;
}

export function ImageLightbox({ src, alt, isOpen, onClose, isPdf }: ImageLightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 rounded-xl bg-white/10 text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            window.open(src, '_blank');
          }}
        >
          <Download className="h-5 w-5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 rounded-xl bg-white/10 text-white hover:bg-white/20"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div
        className="max-w-[90vw] max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {isPdf ? (
          <iframe
            src={src}
            className="w-[85vw] h-[85vh] rounded-xl border-0 bg-white"
            title={alt || 'PDF Viewer'}
          />
        ) : (
          <img
            src={src}
            alt={alt || 'Attachment'}
            className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
          />
        )}
      </div>
    </div>
  );
}

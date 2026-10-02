"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardTemplate } from '@/lib/card-templates';

interface CreditCardVisualProps {
  template: CardTemplate;
  cardNumber?: string | null;
  lastFourDigits?: string | null;
  cardHolderName?: string | null;
  expiryDate?: string | null;
  cvv?: string | null;
  outstandingBalance?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  forceFlat?: boolean;
}

export function CreditCardVisual({
  template,
  cardNumber,
  lastFourDigits,
  cardHolderName,
  expiryDate,
  cvv,
  outstandingBalance, // Optional, can be used to show somewhere if needed, but not specified in instructions to render it on the card directly.
  className,
  size = 'md',
  forceFlat = false,
}: CreditCardVisualProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showCvv, setShowCvv] = useState(false);

  const sizeClasses = {
    sm: 'w-[260px]',
    md: 'w-full max-w-[340px]',
    lg: 'w-full max-w-[400px]',
    full: 'w-full max-w-none',
  };

  const formattedCardNumber = () => {
    if (cardNumber) {
      const clean = cardNumber.replace(/\s+/g, '');
      return clean.replace(/(.{4})/g, '$1 ').trim();
    }
    if (lastFourDigits) {
      return `•••• •••• •••• ${lastFourDigits}`;
    }
    return '•••• •••• •••• ••••';
  };

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
    // Hide CVV when flipping to front
    if (isFlipped) {
      setTimeout(() => setShowCvv(false), 300);
    }
  };

  const handleCvvToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCvv(!showCvv);
  };

  const getNetworkLogo = (brand: string) => {
    switch (brand) {
      case 'visa':
        return <div className="font-bold italic text-2xl tracking-tighter text-white">VISA</div>;
      case 'master':
        return (
          <div className="relative flex items-center h-8 w-12">
            <div className="absolute left-0 w-8 h-8 rounded-full bg-red-500 opacity-80 mix-blend-multiply" />
            <div className="absolute right-0 w-8 h-8 rounded-full bg-yellow-500 opacity-80 mix-blend-multiply" />
          </div>
        );
      case 'amex':
        return (
          <div className="border border-white/40 p-1 bg-blue-600 rounded-sm">
            <div className="text-white font-bold text-xs tracking-wide">AMEX</div>
          </div>
        );
      case 'rupay':
        return (
          <div className="font-bold italic text-xl text-orange-500">RuPay</div>
        );
      default:
        return null;
    }
  };

  const PatternOverlay = () => {
    if (!template.pattern) {
      return (
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent transform -rotate-45" />
      );
    }

    // A collection of CSS patterns simulating the requested designs
    switch (template.pattern) {
      case 'guilloche':
        return (
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: 'radial-gradient(circle at center, transparent 0, transparent 4px, currentColor 4px, currentColor 5px)',
              backgroundSize: '20px 20px',
              color: 'white'
            }}
          />
        );
      case 'geometric':
        return (
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'linear-gradient(45deg, currentColor 25%, transparent 25%, transparent 75%, currentColor 75%, currentColor), linear-gradient(45deg, currentColor 25%, transparent 25%, transparent 75%, currentColor 75%, currentColor)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 10px 10px',
              color: 'white'
            }}
          />
        );
      case 'waves':
        return (
          <div className="absolute inset-0 opacity-10 overflow-hidden">
             <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <path d="M-20,50 Q40,10 100,50 T220,50" fill="none" stroke="white" strokeWidth="2"/>
              <path d="M-20,70 Q40,30 100,70 T220,70" fill="none" stroke="white" strokeWidth="2"/>
              <path d="M-20,90 Q40,50 100,90 T220,90" fill="none" stroke="white" strokeWidth="2"/>
            </svg>
          </div>
        );
      case 'mandala':
        return (
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'radial-gradient(circle, currentColor 2px, transparent 2px)',
              backgroundSize: '20px 20px',
              color: 'white'
            }}
          />
        );
      case 'aurora':
        return (
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent transform -rotate-12 scale-150" />
        );
      case 'facets':
        return (
          <div className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: 'linear-gradient(30deg, currentColor 12%, transparent 12.5%, transparent 87%, currentColor 87.5%, currentColor), linear-gradient(150deg, currentColor 12%, transparent 12.5%, transparent 87%, currentColor 87.5%, currentColor), linear-gradient(30deg, currentColor 12%, transparent 12.5%, transparent 87%, currentColor 87.5%, currentColor), linear-gradient(150deg, currentColor 12%, transparent 12.5%, transparent 87%, currentColor 87.5%, currentColor), linear-gradient(60deg, currentColor 25%, transparent 25.5%, transparent 75%, currentColor 75%, currentColor), linear-gradient(60deg, currentColor 25%, transparent 25.5%, transparent 75%, currentColor 75%, currentColor)',
              backgroundSize: '40px 70px',
              backgroundPosition: '0 0, 0 0, 20px 35px, 20px 35px, 0 0, 20px 35px',
              color: 'white'
            }}
          />
        );
      default:
        return null;
    }
  };

    if (forceFlat) {
    return (
      <div className={cn("relative cursor-pointer w-full m-0 p-0", className)} onClick={handleCardClick} style={{ width: "100%", maxWidth: "100%", margin: 0 }}>
        <div 
          className="absolute inset-0 overflow-hidden rounded-[inherit]"
          style={{ background: template.gradient }}
        >
          <PatternOverlay />
          <div className={cn("relative z-10 w-full h-full p-5 md:p-6 flex flex-col justify-between", template.textColor)}>
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight">{template.logoText}</span>
                <span className="text-xs opacity-80 font-medium tracking-wider mt-1">{template.cardTitle}</span>
              </div>
              <div className="flex-shrink-0 scale-110">
                {getNetworkLogo(template.brand)}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div 
                className={cn(
                  "w-12 h-9 rounded-md relative overflow-hidden flex flex-col justify-evenly",
                  template.chipStyle === 'gold' 
                    ? "bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600"
                    : "bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400"
                )}
              >
                <div className="w-full h-[1px] bg-black/20" />
                <div className="w-full h-[1px] bg-black/20" />
                <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-black/20 transform -translate-x-1/2" />
                <div className="absolute w-[60%] h-[50%] border border-black/20 left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-[2px]" />
              </div>
              <Wifi className="w-6 h-6 opacity-70 rotate-90" />
            </div>
            <div className="font-mono text-xl tracking-[0.15em] pt-2 pb-1 drop-shadow-sm">
              {formattedCardNumber()}
            </div>
            <div className="flex justify-between items-end pb-1">
              <div className="flex flex-col">
                <span className="text-xs opacity-80 uppercase tracking-widest mb-1">Card Holder</span>
                <span className="font-semibold text-sm uppercase truncate max-w-[180px]">
                  {cardHolderName || 'YOUR NAME'}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] opacity-80 uppercase tracking-wider mb-1">Valid Thru</span>
                <span className="font-mono text-sm font-medium">{expiryDate || 'MM/YY'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "relative aspect-[1.586/1] cursor-pointer",
        sizeClasses[size],
        className
      )}
      style={{ perspective: '1000px' }}
      onClick={handleCardClick}
    >
      <motion.div
        className="w-full h-full relative preserve-3d"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        {/* Front Face */}
        <div 
          className="absolute inset-0 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 backface-hidden"
          style={{ background: template.gradient, backfaceVisibility: 'hidden' }}
        >
          <PatternOverlay />
          
          <div className={cn("relative z-10 w-full h-full p-5 flex flex-col justify-between", template.textColor)}>
            {/* Top Row */}
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight">{template.logoText}</span>
                <span className="text-xs opacity-80 font-medium tracking-wider mt-1">{template.cardTitle}</span>
              </div>
              <div className="flex-shrink-0">
                {getNetworkLogo(template.brand)}
              </div>
            </div>

            {/* Chip & Contactless */}
            <div className="flex items-center gap-3">
              <div 
                className={cn(
                  "w-11 h-8 rounded-md relative overflow-hidden flex flex-col justify-evenly",
                  template.chipStyle === 'gold' 
                    ? "bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600"
                    : "bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400"
                )}
              >
                <div className="w-full h-[1px] bg-black/20" />
                <div className="w-full h-[1px] bg-black/20" />
                <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-black/20 transform -translate-x-1/2" />
                <div className="absolute w-[60%] h-[50%] border border-black/20 left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-[2px]" />
              </div>
              <Wifi className="w-5 h-5 opacity-70 rotate-90" />
            </div>

            {/* Card Number */}
            <div className="font-mono text-xl tracking-[0.15em] pt-2 pb-1 drop-shadow-sm">
              {formattedCardNumber()}
            </div>

            {/* Bottom Row */}
            <div className="flex justify-between items-end pb-1">
              <div className="flex flex-col">
                <span className="text-xs opacity-80 uppercase tracking-widest mb-1">Card Holder</span>
                <span className="font-semibold text-sm uppercase truncate max-w-[180px]">
                  {cardHolderName || 'YOUR NAME'}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] opacity-80 uppercase tracking-wider mb-1">Valid Thru</span>
                <span className="font-mono text-sm font-medium">{expiryDate || 'MM/YY'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Back Face */}
        <div 
          className="absolute inset-0 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 backface-hidden"
          style={{ 
            background: template.gradient, 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)' 
          }}
        >
          <div className="w-full h-full relative flex flex-col text-white">
            {/* Magstripe */}
            <div className="w-full h-[15%] bg-black mt-6" />
            
            <div className="px-4 py-4 space-y-4 flex-1">
              {/* Signature & CVV */}
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white/90 h-8 rounded-sm flex items-center px-3">
                  <span className="font-handwriting text-slate-800 text-lg italic opacity-50">
                    {cardHolderName || 'Authorized Signature'}
                  </span>
                </div>
                <div className="bg-white text-slate-900 h-8 px-3 rounded-sm flex items-center justify-between min-w-[70px]">
                  <span className="font-mono font-bold text-sm tracking-widest">
                    {showCvv ? (cvv || '123') : '•••'}
                  </span>
                </div>
                <button 
                  onClick={handleCvvToggle}
                  className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white"
                  type="button"
                >
                  {showCvv ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Bank info */}
              <div className="text-[10px] opacity-60 leading-tight">
                <p>This card is non-transferable and must be returned upon request.</p>
                <p className="mt-1">For queries: 1800-111-2222 or visit {template.brand === 'amex' ? 'americanexpress.com' : 'our website'}</p>
              </div>
            </div>

            {/* Network logo bottom right */}
            <div className="absolute bottom-4 right-4 scale-75 opacity-80">
              {getNetworkLogo(template.brand)}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

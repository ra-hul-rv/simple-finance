'use client';

import { cn } from '@/lib/utils';

interface AppLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

const sizeMap = {
  xs: { icon: 24, bar: { w: 4.5, rx: 1, gap: 6.5 }, container: 'h-6 w-6' },
  sm: { icon: 28, bar: { w: 5, rx: 1.2, gap: 7 }, container: 'h-7 w-7' },
  md: { icon: 32, bar: { w: 5.5, rx: 1.3, gap: 8 }, container: 'h-8 w-8' },
  lg: { icon: 40, bar: { w: 6, rx: 1.5, gap: 9 }, container: 'h-10 w-10' },
};

export function AppLogo({ size = 'md', className, showText }: AppLogoProps) {
  const s = sizeMap[size];

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className={cn(s.container, 'relative shrink-0')}>
        <svg
          viewBox="0 0 512 512"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
          aria-label="Simple Finance"
        >
          <defs>
            <linearGradient id="sf-logo-bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
              <stop stopColor="var(--gradient-from)" />
              <stop offset="1" stopColor="var(--gradient-to)" />
            </linearGradient>
          </defs>
          {/* Rounded square background */}
          <rect width="512" height="512" rx="112" fill="url(#sf-logo-bg)" />
          {/* Three ascending bars — growth/finance motif */}
          <rect x="112" y="296" width="80" height="112" rx="18" fill="white" fillOpacity=".55" />
          <rect x="216" y="200" width="80" height="208" rx="18" fill="white" fillOpacity=".78" />
          <rect x="320" y="104" width="80" height="304" rx="18" fill="white" />
        </svg>
      </div>
      {showText && (
        <span className="text-lg font-bold tracking-tight">Simple Finance</span>
      )}
    </div>
  );
}

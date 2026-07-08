'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
  trend?: number;
  trendLabel?: string;
  icon?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'gradient' | 'glass';
  gradientClass?: string;
  style?: React.CSSProperties;
}

export function StatCard({
  title,
  value,
  prefix = '₹',
  suffix,
  trend,
  trendLabel,
  icon,
  className,
  variant = 'default',
  gradientClass,
  style,
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const getTrendIcon = () => {
    if (!trend || trend === 0) return <Minus className="h-3 w-3" />;
    return trend > 0 ? (
      <TrendingUp className="h-3 w-3" />
    ) : (
      <TrendingDown className="h-3 w-3" />
    );
  };

  const getTrendColor = () => {
    if (!trend || trend === 0) return 'text-muted-foreground';
    return trend > 0 ? 'text-success' : 'text-destructive';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Card
        className={cn(
          'relative overflow-hidden transition-all duration-200 card-hover',
          variant === 'glass' && 'glass',
          variant === 'gradient' && gradientClass,
          className
        )}
        style={style}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className={cn(
                'text-xs font-medium uppercase tracking-wider',
                variant === 'gradient' ? 'text-white/70' : 'text-muted-foreground'
              )}>
                {title}
              </p>
              <div className="flex items-baseline gap-1">
                {prefix && (
                  <span className={cn(
                    'text-sm font-medium',
                    variant === 'gradient' ? 'text-white/80' : 'text-muted-foreground'
                  )}>
                    {prefix}
                  </span>
                )}
                <motion.span
                  key={String(displayValue)}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'text-2xl font-bold tabular-nums tracking-tight',
                    variant === 'gradient' ? 'text-white' : 'text-foreground'
                  )}
                >
                  {typeof displayValue === 'number'
                    ? displayValue.toLocaleString('en-IN')
                    : displayValue}
                </motion.span>
                {suffix && (
                  <span className={cn(
                    'text-sm font-medium',
                    variant === 'gradient' ? 'text-white/80' : 'text-muted-foreground'
                  )}>
                    {suffix}
                  </span>
                )}
              </div>
              {trend !== undefined && (
                <div className={cn('flex items-center gap-1 text-xs font-medium', getTrendColor())}>
                  {getTrendIcon()}
                  <span>{Math.abs(trend)}%</span>
                  {trendLabel && (
                    <span className={cn(
                      variant === 'gradient' ? 'text-white/60' : 'text-muted-foreground'
                    )}>
                      {trendLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
            {icon && (
              <div className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl',
                variant === 'gradient'
                  ? 'bg-white/20'
                  : 'bg-primary/10'
              )}>
                {icon}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

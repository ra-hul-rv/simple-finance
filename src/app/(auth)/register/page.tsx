'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Sparkles, Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [passwordValue, setPasswordValue] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length >= 8) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[a-z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass)) score += 25;
    return score;
  };

  const strength = getPasswordStrength(passwordValue);

  const getStrengthColor = (score: number) => {
    if (score <= 25) return 'bg-destructive';
    if (score <= 50) return 'bg-orange-500';
    if (score <= 75) return 'bg-yellow-500';
    return 'bg-success';
  };

  const getStrengthLabel = (score: number) => {
    if (score === 0) return '';
    if (score <= 25) return 'Weak';
    if (score <= 50) return 'Fair';
    if (score <= 75) return 'Good';
    return 'Strong';
  };

  const onSubmit = (values: RegisterFormValues) => {
    startTransition(async () => {
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: values.name,
            email: values.email,
            password: values.password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || 'Registration failed');
        } else {
          toast.success('Account created successfully! Please sign in.');
          router.push('/login');
        }
      } catch (err) {
        console.error(err);
        toast.error('An unexpected error occurred. Please try again.');
      }
    });
  };

  return (
    <Card className="glass relative overflow-hidden border-border bg-card/60 backdrop-blur-xl animate-fade-up">
      <CardHeader className="space-y-2 text-center pb-6">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl gradient-primary animate-glow">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Create your account</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Sign up to start tracking your finances
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="label-uppercase text-muted-foreground">Full Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              className="bg-background/40"
              disabled={isPending}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="label-uppercase text-muted-foreground">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              className="bg-background/40"
              disabled={isPending}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="label-uppercase text-muted-foreground">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="pr-10 bg-background/40"
                disabled={isPending}
                {...register('password', {
                  onChange: (e) => setPasswordValue(e.target.value),
                })}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isPending}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passwordValue && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Password Strength:</span>
                  <span className="font-semibold text-foreground">{getStrengthLabel(strength)}</span>
                </div>
                <Progress value={strength} className="w-full">
                  <ProgressTrack className="h-1.5 bg-muted rounded-full overflow-hidden w-full">
                    <ProgressIndicator className={cn("h-full transition-all", getStrengthColor(strength))} style={{ width: `${strength}%` }} />
                  </ProgressTrack>
                </Progress>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1.5 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    {passwordValue.length >= 8 ? <Check className="h-3 w-3 text-success" /> : <X className="h-3 w-3 text-destructive" />}
                    At least 8 characters
                  </div>
                  <div className="flex items-center gap-1">
                    {/[A-Z]/.test(passwordValue) ? <Check className="h-3 w-3 text-success" /> : <X className="h-3 w-3 text-destructive" />}
                    Uppercase letter
                  </div>
                  <div className="flex items-center gap-1">
                    {/[a-z]/.test(passwordValue) ? <Check className="h-3 w-3 text-success" /> : <X className="h-3 w-3 text-destructive" />}
                    Lowercase letter
                  </div>
                  <div className="flex items-center gap-1">
                    {/[0-9]/.test(passwordValue) ? <Check className="h-3 w-3 text-success" /> : <X className="h-3 w-3 text-destructive" />}
                    At least one number
                  </div>
                </div>
              </div>
            )}
            {errors.password && (
              <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="label-uppercase text-muted-foreground">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="pr-10 bg-background/40"
                disabled={isPending}
                {...register('confirmPassword')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isPending}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pt-4 pb-6">
          <Button
            type="submit"
            className="w-full font-semibold transition-all hover:opacity-90"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registering...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium transition-all">
              Sign In
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

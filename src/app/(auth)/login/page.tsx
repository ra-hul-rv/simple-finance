'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signIn } from 'next-auth/react';
import { useState, useTransition, Suspense } from 'react';
import { toast } from 'sonner';
import { Sparkles, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    startTransition(async () => {
      try {
        const result = await signIn('credentials', {
          email: values.email,
          password: values.password,
          redirect: false,
        });

        if (result?.error) {
          toast.error('Invalid email or password');
        } else {
          toast.success('Successfully logged in!');
          router.push(callbackUrl);
          router.refresh();
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
        <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Enter your email and password to sign in
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="label-uppercase text-muted-foreground">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline transition-all"
              >
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="pr-10 bg-background/40"
                disabled={isPending}
                {...register('password')}
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
            {errors.password && (
              <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
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
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium transition-all">
              Sign Up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Card className="glass border-border bg-card/60 backdrop-blur-xl p-6 flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground mt-2">Loading authentication portal...</p>
      </Card>
    }>
      <LoginForm />
    </Suspense>
  );
}

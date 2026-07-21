'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, KeyRound, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ProfileTab({ session }: { session: any }) {
  const [isPending, startTransition] = useTransition();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isWiping, setIsWiping] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/settings/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword, newPassword }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to change password');
        }

        toast.success('Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  };

  const handleWipeData = async () => {
    if (wipeConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setIsWiping(true);
    try {
      const res = await fetch('/api/settings/reset', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to wipe data');
      
      toast.success('All data has been wiped successfully');
      setWipeConfirmText('');
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsWiping(false);
    }
  };

  const initials = session?.user?.name
    ? session.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : 'U';

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="glass border-border bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-500" />
            Profile Details
          </CardTitle>
          <CardDescription>Manage your account profile and credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-xl border border-border/20 bg-background/20">
            <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
              {initials}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{session?.user?.name}</h3>
              <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-border bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-amber-500" />
            Change Password
          </CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Current Password</Label>
            <Input 
              type="password" 
              value={currentPassword} 
              onChange={e => setCurrentPassword(e.target.value)} 
              className="bg-background/50"
            />
          </div>
          <div className="grid gap-2">
            <Label>New Password</Label>
            <Input 
              type="password" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              className="bg-background/50"
            />
          </div>
          <div className="grid gap-2">
            <Label>Confirm New Password</Label>
            <Input 
              type="password" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              className="bg-background/50"
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t border-border/5 pt-4">
          <Button onClick={handlePasswordChange} disabled={isPending || !currentPassword || !newPassword} className="gradient-primary text-white">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-rose-500/20 bg-rose-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-rose-500">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-rose-500/70">Irreversible destructive actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 space-y-4">
            <div>
              <h4 className="font-semibold text-rose-500">Wipe All Data</h4>
              <p className="text-sm text-rose-500/80 mt-1">
                This will permanently delete all your transactions, categories, budgets, and templates. Your user account and settings will remain intact.
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <Input
                placeholder="Type DELETE to confirm"
                value={wipeConfirmText}
                onChange={(e) => setWipeConfirmText(e.target.value)}
                className="max-w-[250px] border-rose-500/30 bg-background/50 text-rose-500 placeholder:text-rose-500/40 focus-visible:ring-rose-500"
              />
              <Button
                variant="destructive"
                onClick={handleWipeData}
                disabled={wipeConfirmText !== 'DELETE' || isWiping}
                className="font-bold"
              >
                {isWiping ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Wipe Everything
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

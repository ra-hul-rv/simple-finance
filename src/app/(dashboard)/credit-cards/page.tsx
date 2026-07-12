'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function CreditCardsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/accounts');
  }, [router]);

  return (
    <div className="flex h-[60vh] items-center justify-center gap-2 text-muted-foreground text-sm">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      Redirecting to unified accounts ledger...
    </div>
  );
}

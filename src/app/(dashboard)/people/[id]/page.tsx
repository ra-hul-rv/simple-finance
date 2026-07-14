'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, ArrowUpRight, ArrowDownRight, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { use } from 'react';

interface PersonDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  transactions: any[];
  loans: any[];
  emis: any[];
}

export default function PersonProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPerson();
  }, [resolvedParams.id]);

  const fetchPerson = async () => {
    try {
      const res = await fetch(`/api/people/${resolvedParams.id}`);
      if (res.ok) {
        const data = await res.json();
        setPerson(data);
      } else {
        router.push('/people');
        toast.error('Person not found');
      }
    } catch (error) {
      console.error('Failed to fetch person', error);
      toast.error('Failed to load contact');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!person) return null;

  // Calculate balances
  const totalLent = person.loans.reduce((acc, loan) => acc + Number(loan.outstandingBalance), 0);
  const activeEmis = person.emis.filter(e => e.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader 
          title={person.name} 
          description={person.email || person.phone || 'Contact Profile'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl border-border/40 shadow-sm col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Financial Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <ArrowUpRight className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase">Total Owed To You</span>
                </div>
                <div className="text-2xl font-black">
                  {formatCurrency(totalLent, 'INR')}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-primary">
                  <IndianRupee className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase">Active EMIs</span>
                </div>
                <div className="text-2xl font-black">
                  {activeEmis}
                </div>
              </div>
            </div>
            
            {person.notes && (
              <div className="mt-6 p-4 rounded-xl bg-muted/50 text-sm text-muted-foreground border border-border/40">
                <strong className="text-foreground">Notes:</strong> {person.notes}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/40 shadow-sm md:row-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {person.transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No linked transactions</p>
            ) : (
              person.transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border/40 transition-colors">
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm line-clamp-1">{tx.description}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(tx.date, 'dd MMM yyyy')}</span>
                  </div>
                  <div className={`font-bold text-sm ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-foreground'}`}>
                    {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(Number(tx.amount), 'INR')}
                  </div>
                </div>
              ))
            )}
            <Button variant="outline" className="w-full rounded-xl mt-4" onClick={() => router.push('/transactions')}>
              View All
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

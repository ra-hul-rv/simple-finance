'use client';

import { useEffect, useState, useTransition } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Edit2,
  Trash2,
  Wallet,
  CreditCard as CardIcon,
  Building,
  Loader2,
  ChevronRight,
  ArrowLeftRight,
  Search,
  Filter,
  Percent,
  Calendar,
  Award,
  ShieldCheck,
  Briefcase,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { useFormDraft } from '@/hooks/use-form-draft';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Account {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  accountNumber: string | null;
  balance: number;
  openingBalance: number;
  currency: string;
  interestRate: number | null;
  creditLimit: number | null;
  color: string;
  icon: string;
  notes: string | null;
  creditCard?: CreditCardDetail | null;
}

interface CreditCardDetail {
  id: string;
  cardName: string;
  lastFourDigits: string | null;
  cardNumber: string | null;
  cardHolderName: string | null;
  expiryDate: string | null;
  cvv: string | null;
  template: string | null;
  notes: string | null;
  creditLimit: number;
  outstandingBalance: number;
  availableCredit: number;
  dueDate: number | null;
  statementDate: number | null;
  minimumDue: number | null;
  interestRate: number | null;
  rewardsBalance: number;
  color: string;
  lastPaidDate?: string | null;
  order: number;
}

const CARD_TEMPLATES = [
  { id: 'STANDARD', name: 'Standard (Theme Color)', brand: 'visa', bg: 'bg-gradient-to-br from-slate-900 to-indigo-950', text: 'text-white' },
  { id: 'SBI_CASHBACK', name: 'SBI Cashback Credit Card', brand: 'visa', bg: 'bg-gradient-to-br from-[#0c2340] via-[#1d428a] to-[#008080]', text: 'text-white', logoText: 'SBI Card', cardTitle: 'CASHBACK' },
  { id: 'ICICI_RUBYX', name: 'ICICI Rubyx Credit Card', brand: 'visa', bg: 'bg-gradient-to-br from-[#1e1e24] via-[#2f3e46] to-[#5c677d]', text: 'text-[#e5c158]', logoText: 'ICICI Bank', cardTitle: 'RUBYX' },
  { id: 'AMEX_TRAVEL', name: 'American Express Platinum Travel', brand: 'amex', bg: 'bg-gradient-to-br from-[#b8c6db] via-[#f5f7fa] to-[#a3bded]', text: 'text-slate-800', logoText: 'AMEX', cardTitle: 'PLATINUM TRAVEL' },
  { id: 'ICICI_AMAZON_PAY', name: 'ICICI Amazon Pay Credit Card', brand: 'visa', bg: 'bg-gradient-to-br from-[#111] via-[#232f3e] to-[#37475a]', text: 'text-[#ff9900]', logoText: 'Amazon Pay | ICICI', cardTitle: 'Amazon Pay' },
  { id: 'FEDERAL_SCAPIA', name: 'Federal Bank Scapia Credit Card', brand: 'visa', bg: 'bg-gradient-to-br from-[#030712] via-[#0b1528] to-[#122b54]', text: 'text-[#10b981]', logoText: 'Scapia | Federal', cardTitle: 'SCAPIA' },
  { id: 'AXIS_FLIPKART', name: 'Axis Flipkart Credit Card', brand: 'master', bg: 'bg-gradient-to-br from-[#00539c] via-[#0074d9] to-[#ffaa00]', text: 'text-white', logoText: 'Axis Bank | Flipkart', cardTitle: 'Flipkart' },
  { id: 'AXIS_MYZONE', name: 'Axis My Zone Credit Card', brand: 'master', bg: 'bg-gradient-to-br from-[#800020] via-[#a8204e] to-[#ff6b8b]', text: 'text-white', logoText: 'Axis Bank', cardTitle: 'MY ZONE' },
  { id: 'AXIS_AIRTEL', name: 'Axis Airtel Credit Card', brand: 'master', bg: 'bg-gradient-to-br from-[#e11d48] via-[#4c0519] to-[#0f172a]', text: 'text-white', logoText: 'Axis Bank | airtel', cardTitle: 'Airtel' },
  { id: 'HDFC_TATA_NEU', name: 'HDFC Tata Neu Card Infinity', brand: 'rupay', bg: 'bg-gradient-to-br from-[#09090b] via-[#18181b] to-[#c2410c]', text: 'text-[#eab308]', logoText: 'HDFC Bank | Tata Neu', cardTitle: 'INFINITY' },
  { id: 'YES_BANK_KIWI', name: 'Yes Bank Kiwi Credit Card', brand: 'rupay', bg: 'bg-gradient-to-br from-[#0284c7] via-[#0f172a] to-[#22c55e]', text: 'text-white', logoText: 'Kiwi | YES BANK', cardTitle: 'Kiwi' },
  { id: 'AMEX_REWARDS', name: 'American Express Membership Rewards', brand: 'amex', bg: 'bg-gradient-to-br from-[#ffd700] via-[#b8860b] to-[#18181b]', text: 'text-yellow-100', logoText: 'AMEX', cardTitle: 'MRCC' },
  { id: 'SBM_NOVIO', name: 'SBM Novio Credit Card', brand: 'visa', bg: 'bg-gradient-to-br from-[#1a1c29] via-[#2c3e50] to-[#000000]', text: 'text-white', logoText: 'SBM Bank | Novio', cardTitle: 'NOVIO' },
];

function getOrdinalSuffix(i: number) {
  const j = i % 10;
  const k = i % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

export default function UnifiedAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Dialog forms
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('SAVINGS');
  const [institution, setInstitution] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [balance, setBalance] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [icon, setIcon] = useState('wallet');
  const [notes, setNotes] = useState('');

  // Credit card specific form states
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [lastFourDigits, setLastFourDigits] = useState('');
  const [cardTemplate, setCardTemplate] = useState('STANDARD');
  const [statementDate, setStatementDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [cardNotes, setCardNotes] = useState('');
  const [rewardsBalance, setRewardsBalance] = useState('0');
  const [minimumDue, setMinimumDue] = useState('');

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      if (!res.ok) throw new Error('Failed to load accounts');
      const data = await res.json();

      // Fetch credit card details for credit card type accounts
      const cardsRes = await fetch('/api/credit-cards');
      const cardsData = cardsRes.ok ? await cardsRes.json() : [];

      const hydrated = data.map((acc: Account) => {
        if (acc.type === 'CREDIT_CARD') {
          const cc = cardsData.find((c: any) => c.accountId === acc.id);
          return { ...acc, creditCard: cc };
        }
        return acc;
      });

      setAccounts(hydrated);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load financial accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const initialValues = {
    name: '',
    type: 'SAVINGS',
    institution: '',
    accountNumber: '',
    balance: '0',
    openingBalance: '0',
    interestRate: '',
    creditLimit: '',
    color: '#6366f1',
    icon: 'wallet',
    notes: '',
    cardName: '',
    cardNumber: '',
    cardHolderName: '',
    expiryDate: '',
    cvv: '',
    lastFourDigits: '',
    cardTemplate: 'STANDARD',
    statementDate: '',
    dueDate: '',
    cardNotes: '',
    rewardsBalance: '0',
    minimumDue: ''
  };

  const { clearDraft } = useFormDraft(
    'account',
    initialValues,
    { name, type, institution, accountNumber, balance, openingBalance, interestRate, creditLimit, color, icon, notes, cardName, cardNumber, cardHolderName, expiryDate, cvv, lastFourDigits, cardTemplate, statementDate, dueDate, cardNotes, rewardsBalance, minimumDue },
    (vals) => {
      setName(vals.name || '');
      setType(vals.type || 'SAVINGS');
      setInstitution(vals.institution || '');
      setAccountNumber(vals.accountNumber || '');
      setBalance(vals.balance || '0');
      setOpeningBalance(vals.openingBalance || '0');
      setInterestRate(vals.interestRate || '');
      setCreditLimit(vals.creditLimit || '');
      setColor(vals.color || '#6366f1');
      setIcon(vals.icon || 'wallet');
      setNotes(vals.notes || '');
      setCardName(vals.cardName || '');
      setCardNumber(vals.cardNumber || '');
      setCardHolderName(vals.cardHolderName || '');
      setExpiryDate(vals.expiryDate || '');
      setCvv(vals.cvv || '');
      setLastFourDigits(vals.lastFourDigits || '');
      setCardTemplate(vals.cardTemplate || 'STANDARD');
      setStatementDate(vals.statementDate || '');
      setDueDate(vals.dueDate || '');
      setCardNotes(vals.cardNotes || '');
      setRewardsBalance(vals.rewardsBalance || '0');
      setMinimumDue(vals.minimumDue || '');
    },
    isDialogOpen && !editingAccount
  );

  const handleOpenAddDialog = () => {
    setEditingAccount(null);
    setName('');
    setType('SAVINGS');
    setInstitution('');
    setAccountNumber('');
    setBalance('0');
    setOpeningBalance('0');
    setInterestRate('');
    setCreditLimit('');
    setColor('#6366f1');
    setIcon('wallet');
    setNotes('');
    setCardName('');
    setCardNumber('');
    setCardHolderName('');
    setExpiryDate('');
    setCvv('');
    setLastFourDigits('');
    setCardTemplate('STANDARD');
    setStatementDate('');
    setDueDate('');
    setCardNotes('');
    setRewardsBalance('0');
    setMinimumDue('');
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (account: Account) => {
    setEditingAccount(account);
    setName(account.name);
    setType(account.type);
    setInstitution(account.institution || '');
    setAccountNumber(account.accountNumber || '');
    setBalance(Math.abs(account.balance).toString());
    setOpeningBalance(account.openingBalance.toString());
    setInterestRate(account.interestRate?.toString() || '');
    setCreditLimit(account.creditLimit?.toString() || '');
    setColor(account.color);
    setIcon(account.icon);
    setNotes(account.notes || '');

    if (account.type === 'CREDIT_CARD' && account.creditCard) {
      const cc = account.creditCard;
      setCardName(cc.cardName);
      setCardNumber(cc.cardNumber || '');
      setCardHolderName(cc.cardHolderName || '');
      setExpiryDate(cc.expiryDate || '');
      setCvv(cc.cvv || '');
      setLastFourDigits(cc.lastFourDigits || '');
      setCardTemplate(cc.template || 'STANDARD');
      setStatementDate(cc.statementDate?.toString() || '');
      setDueDate(cc.dueDate?.toString() || '');
      setCardNotes(cc.notes || '');
      setRewardsBalance(cc.rewardsBalance.toString());
      setMinimumDue(cc.minimumDue?.toString() || '');
    } else {
      setCardName('');
      setCardNumber('');
      setCardHolderName('');
      setExpiryDate('');
      setCvv('');
      setLastFourDigits('');
      setCardTemplate('STANDARD');
      setStatementDate('');
      setDueDate('');
      setCardNotes('');
      setRewardsBalance('0');
      setMinimumDue('');
    }

    setIsDialogOpen(true);
  };

  const handleSaveDraft = () => {
    const draftValues = { name, type, institution, accountNumber, balance, openingBalance, interestRate, creditLimit, color, icon, notes, cardName, cardNumber, cardHolderName, expiryDate, cvv, lastFourDigits, cardTemplate, statementDate, dueDate, cardNotes, rewardsBalance, minimumDue };
    localStorage.setItem('sf_draft_account', JSON.stringify(draftValues));
    toast.success('Account details saved as draft locally!');
    setIsDialogOpen(false);
  };

  const handleSaveAccount = () => {
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    startTransition(async () => {
      try {
        let finalBalance = parseFloat(balance || '0');
        // Credit card balances are liabilities (negative inside Ledger balance)
        if (type === 'CREDIT_CARD') {
          finalBalance = -Math.abs(finalBalance);
        }

        const payload = {
          name,
          type,
          institution: institution.trim() || null,
          accountNumber: accountNumber.trim() || null,
          balance: finalBalance,
          openingBalance: parseFloat(openingBalance || '0'),
          currency: 'INR',
          interestRate: interestRate ? parseFloat(interestRate) : null,
          creditLimit: creditLimit ? parseFloat(creditLimit) : null,
          color,
          icon,
          notes: notes.trim() || null,
        };

        const url = editingAccount ? `/api/accounts/${editingAccount.id}` : '/api/accounts';
        const method = editingAccount ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error('Failed to save account');

        const accountData = await res.json();

        // If it's a Credit Card type, create or update the CreditCard details
        if (type === 'CREDIT_CARD') {
          const ccPayload = {
            cardName: cardName || name,
            lastFourDigits: lastFourDigits || cardNumber.slice(-4) || '0000',
            cardNumber: cardNumber || null,
            cardHolderName: cardHolderName || null,
            expiryDate: expiryDate || null,
            cvv: cvv || null,
            creditLimit: parseFloat(creditLimit || '0'),
            outstandingBalance: Math.abs(finalBalance),
            statementDate: statementDate ? parseInt(statementDate) : null,
            dueDate: dueDate ? parseInt(dueDate) : null,
            template: cardTemplate,
            notes: cardNotes || null,
            color: color,
            accountId: accountData.id,
            rewardsBalance: parseFloat(rewardsBalance || '0'),
            minimumDue: minimumDue ? parseFloat(minimumDue) : null,
            interestRate: interestRate ? parseFloat(interestRate) : null,
          };

          const ccUrl = editingAccount && editingAccount.creditCard 
            ? `/api/credit-cards/${editingAccount.creditCard.id}`
            : '/api/credit-cards';
          
          const ccMethod = editingAccount && editingAccount.creditCard ? 'PUT' : 'POST';

          await fetch(ccUrl, {
            method: ccMethod,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ccPayload),
          });
        }

        toast.success(editingAccount ? 'Account updated successfully' : 'Account created successfully');
        if (!editingAccount) {
          clearDraft();
        }
        setIsDialogOpen(false);
        fetchAccounts();
      } catch (err) {
        console.error(err);
        toast.error('Failed to save account settings');
      }
    });
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account? All associated transactions will be deleted.')) {
      return;
    }

    try {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete account');
      toast.success('Account deleted successfully');
      fetchAccounts();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete account');
    }
  };

  const assetAccounts = accounts.filter(a => a.type !== 'CREDIT_CARD');
  const cardAccounts = accounts
    .filter(a => a.type === 'CREDIT_CARD')
    .sort((a, b) => {
      const orderA = a.creditCard?.order ?? 0;
      const orderB = b.creditCard?.order ?? 0;
      return orderA - orderB;
    });

  const totalAssets = assetAccounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const totalLiabilities = cardAccounts.reduce((sum, a) => sum + Math.abs(Number(a.balance)), 0);

  const filteredAssets = assetAccounts.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (a.institution && a.institution.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === 'ALL' || a.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const filteredCards = cardAccounts.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (a.institution && a.institution.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === 'ALL' || typeFilter === 'CREDIT_CARD';
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader title="Accounts & Credit Cards" description="Manage checking, savings, demat sheets, wallet cash, and card cycles in a single panel">
        <div className="flex items-center gap-3">
          <Link href="/transactions?action=transfer" className="h-9 gap-1.5 px-4 border border-border/40 hover:bg-accent/40 rounded-xl inline-flex items-center text-xs font-semibold bg-background/20 text-foreground transition-all duration-200">
            <ArrowLeftRight className="h-4 w-4" />
            Transfer Funds
          </Link>
          <Button onClick={handleOpenAddDialog} className="h-9 gap-1.5 px-4 rounded-xl gradient-primary text-white font-semibold shadow-md">
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        </div>
      </PageHeader>

      {/* Aggregate Overview Card */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total Cash & Assets" value={totalAssets} variant="glass" />
        <StatCard title="Total Cards Outstanding" value={totalLiabilities} prefix="₹" icon={<CardIcon className="h-4 w-4 text-destructive" />} />
        <StatCard title="Net Liquid Net Worth" value={totalAssets - totalLiabilities} variant="default" />
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card/30 p-4 rounded-xl border border-border/40 backdrop-blur-md">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search accounts or bank..." 
            className="pl-10 bg-background/30 border-border/40 h-10 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val || 'ALL')}>
            <SelectTrigger className="w-[180px] bg-background/30 border-border/40 h-10 rounded-xl">
              <SelectValue placeholder="All Assets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Account Types</SelectItem>
              <SelectItem value="SAVINGS">Savings Account</SelectItem>
              <SelectItem value="CURRENT">Current Account</SelectItem>
              <SelectItem value="CASH">Cash Wallet</SelectItem>
              <SelectItem value="CREDIT_CARD">Credit Cards</SelectItem>
              <SelectItem value="FIXED_DEPOSIT">Fixed Deposits</SelectItem>
              <SelectItem value="STOCKS">Stocks Demat</SelectItem>
              <SelectItem value="MUTUAL_FUNDS">Mutual Funds</SelectItem>
              <SelectItem value="CRYPTO">Crypto Wallet</SelectItem>
              <SelectItem value="LOAN">Loan Ledgers</SelectItem>
              <SelectItem value="EPF">EPF (Retirement)</SelectItem>
              <SelectItem value="PPF">PPF Account</SelectItem>
              <SelectItem value="NPS">NPS Account</SelectItem>
              <SelectItem value="OTHER">Other Assets</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Assets Section */}
          {filteredAssets.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-bold tracking-tight text-foreground uppercase tracking-widest text-[11px] text-muted-foreground">Cash, Savings & Investments</h2>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredAssets.map((acc) => {
                  const isSavings = acc.type === 'SAVINGS';
                  return (
                    <Card
                      key={acc.id}
                      className={cn(
                        "relative overflow-hidden transition-all duration-200 card-hover border border-border/40 rounded-xl",
                        isSavings ? "bg-gradient-to-br from-card to-emerald-950/10" : "bg-card"
                      )}
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: acc.color }} />
                      <CardHeader className="flex flex-row items-start justify-between pb-3 pl-6">
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground bg-accent/40 px-2 py-0.5 rounded-full">
                            {acc.type.replace('_', ' ')}
                          </span>
                          <CardTitle className="text-base font-bold truncate max-w-[180px] pt-1">
                            {acc.name}
                          </CardTitle>
                          {acc.institution && (
                            <CardDescription className="flex items-center gap-1 text-xs">
                              <Building className="h-3 w-3 shrink-0" />
                              {acc.institution}
                            </CardDescription>
                          )}
                        </div>
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold"
                          style={{ backgroundColor: acc.color }}
                        >
                          <Wallet className="h-4 w-4" />
                        </div>
                      </CardHeader>
                      <CardContent className="pl-6 space-y-4">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs text-muted-foreground">Ledger Balance</span>
                          <span className="text-xl font-bold tabular-nums tracking-tight text-foreground">
                            {formatCurrency(acc.balance, 'INR')}
                          </span>
                        </div>
                        
                        {acc.interestRate && (
                          <div className="flex justify-between text-xs text-muted-foreground border-t border-border/30 pt-3">
                            <span className="flex items-center gap-1"><Percent className="h-3 w-3" /> Yield interest</span>
                            <span className="font-semibold">{acc.interestRate}% p.a.</span>
                          </div>
                        )}

                        {acc.accountNumber && (
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Account No.</span>
                            <span className="font-mono">{acc.accountNumber}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center border-t border-border/30 pt-3">
                          <Link
                            href={`/accounts/${acc.id}`}
                            className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
                          >
                            View ledger
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                          <div className="flex gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-lg hover:bg-accent"
                              onClick={() => handleOpenEditDialog(acc)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteAccount(acc.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section Divider */}
          {filteredAssets.length > 0 && filteredCards.length > 0 && (
            <div className="section-divider">
              <span className="section-divider-label">
                <Layers className="h-3.5 w-3.5" /> Liabilities & Cards
              </span>
            </div>
          )}

          {/* Credit Cards Section */}
          {filteredCards.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CardIcon className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-bold tracking-tight text-foreground uppercase tracking-widest text-[11px] text-muted-foreground">Credit Cards & Billings</h2>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCards.map((acc) => {
                  const cc = acc.creditCard;
                  if (!cc) {
                    // Credit Card Account exists but card properties not configured
                    return (
                      <Card key={acc.id} className="glass relative overflow-hidden border border-border/40 rounded-xl">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: acc.color }} />
                        <CardHeader className="pl-6 pb-2">
                          <CardTitle className="text-base font-bold">{acc.name}</CardTitle>
                          <CardDescription>Setup card cycles & outstanding limit details</CardDescription>
                        </CardHeader>
                        <CardContent className="pl-6 pt-4 flex flex-col justify-center items-center text-center space-y-3">
                          <p className="text-xs text-muted-foreground">Card billing configuration is missing for this ledger.</p>
                          <Button size="sm" onClick={() => handleOpenEditDialog(acc)} className="rounded-xl h-8 text-xs font-semibold">
                            Configure Card
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  }

                  const usagePct = cc.creditLimit > 0 ? (cc.outstandingBalance / cc.creditLimit) * 100 : 0;
                  const template = CARD_TEMPLATES.find((t) => t.id === (cc.template || 'STANDARD')) || CARD_TEMPLATES[0];

                  return (
                    <Card
                      key={acc.id}
                      className="glass relative overflow-hidden border-border/40 rounded-xl card-hover"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: acc.color }} />
                      <CardHeader className="pl-6 pb-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-0.5">
                            <CardTitle className="text-base font-bold truncate max-w-[160px]">{cc.cardName}</CardTitle>
                            {cc.lastFourDigits && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                (•••• {cc.lastFourDigits})
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-lg hover:bg-accent"
                              onClick={() => handleOpenEditDialog(acc)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteAccount(acc.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pl-6 space-y-4">
                        {/* Visual Card Body */}
                        <div
                          className={cn(
                            "rounded-xl p-3 flex flex-col justify-between relative overflow-hidden shadow-md border border-white/10 aspect-[2.3/1] text-white"
                          )}
                          style={template.id === 'STANDARD' ? { background: `linear-gradient(135deg, ${acc.color}dd, #18181b)` } : {}}
                        >
                          <div className={cn("absolute inset-0 z-0 pointer-events-none", template.bg)} />
                          <div className="absolute inset-0 bg-black/10 z-0" />
                          <div className="absolute w-[200%] h-full top-0 -left-1/2 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 transform -rotate-45 pointer-events-none" />

                          <div className="flex justify-between items-start z-10">
                            <div className="flex flex-col">
                              <span className="text-[8px] opacity-70 uppercase tracking-widest">{template.logoText || acc.institution || 'Credit Card'}</span>
                              <span className="font-semibold text-[11px] tracking-wide truncate max-w-[130px]">{template.cardTitle || cc.cardName}</span>
                            </div>
                            <div className="flex flex-col items-end opacity-90">
                              {template.brand === 'visa' && <span className="font-bold italic text-xs tracking-wider">VISA</span>}
                              {template.brand === 'master' && (
                                <div className="flex items-center -space-x-1">
                                  <div className="w-3.5 h-3.5 rounded-full bg-red-500/80 mix-blend-multiply" />
                                  <div className="w-3.5 h-3.5 rounded-full bg-yellow-500/80 mix-blend-multiply" />
                                </div>
                              )}
                              {template.brand === 'amex' && <span className="font-bold text-[8px] border border-current px-1 tracking-wider uppercase">Amex</span>}
                              {template.brand === 'rupay' && <span className="font-bold italic text-[10px] tracking-widest text-orange-400">RuPay</span>}
                            </div>
                          </div>

                          <div className="mt-2 z-10 flex flex-col">
                            <p className="text-[7px] opacity-60 tracking-wider">CARD NUMBER</p>
                            <p className="text-xs font-mono tracking-[0.18em]">
                              {cc.cardNumber ? cc.cardNumber : `•••• •••• •••• ${cc.lastFourDigits || '0000'}`}
                            </p>
                          </div>

                          <div className="flex justify-between items-end text-[9px] z-10 mt-1">
                            <div className="space-y-0.5">
                              <p className="text-[7px] opacity-60 uppercase tracking-wider">Card Holder</p>
                              <p className="font-medium tracking-wide truncate max-w-[130px] uppercase">{cc.cardHolderName || 'VALID USER'}</p>
                            </div>
                            <div className="space-y-0.5 text-right">
                              <p className="text-[7px] opacity-60 uppercase tracking-wider">Expiry</p>
                              <p className="font-medium font-mono">{cc.expiryDate || '12/29'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Limit and progress bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Usage</span>
                            <span className={cn("font-semibold", usagePct > 80 && "text-destructive")}>{usagePct.toFixed(1)}%</span>
                          </div>
                          <Progress
                            value={usagePct}
                            className="h-2 rounded-full"
                            trackClassName="bg-white/5"
                            indicatorClassName={usagePct > 80 ? 'bg-destructive' : 'gradient-primary'}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs border-t border-border/30 pt-3">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Outstanding</p>
                            <p className="font-bold text-sm text-destructive">{formatCurrency(cc.outstandingBalance)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Available Limit</p>
                            <p className="font-bold text-sm text-success">{formatCurrency(cc.availableCredit)}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-[10px] bg-accent/20 rounded-xl p-2.5 border border-border/20">
                          <div className="flex flex-col">
                            <span className="text-muted-foreground font-semibold">Statement Date</span>
                            <span className="font-medium mt-0.5">
                              {cc.statementDate ? `${cc.statementDate}${getOrdinalSuffix(cc.statementDate)}` : '—'}
                            </span>
                          </div>
                          <div className="flex flex-col border-l border-border/30 pl-2.5">
                            <span className="text-muted-foreground font-semibold">Due Date</span>
                            <span className="font-semibold text-destructive mt-0.5">
                              {cc.dueDate ? `${cc.dueDate}${getOrdinalSuffix(cc.dueDate)}` : '—'}
                            </span>
                          </div>
                          <div className="flex flex-col border-l border-border/30 pl-2.5">
                            <span className="text-muted-foreground font-semibold">Last Paid</span>
                            <span className="font-semibold text-success mt-0.5 truncate" title={cc.lastPaidDate ? new Date(cc.lastPaidDate).toLocaleDateString('en-IN') : undefined}>
                              {cc.lastPaidDate ? new Date(cc.lastPaidDate).toLocaleDateString('en-IN') : 'No history'}
                            </span>
                          </div>
                        </div>

                        <div className="border-t border-border/30 pt-3 flex justify-between items-center">
                          <Link
                            href={`/accounts/${acc.id}`}
                            className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
                          >
                            View Card Ledger
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {filteredAssets.length === 0 && filteredCards.length === 0 && (
            <div className="flex flex-col items-center justify-center border border-dashed rounded-xl p-12 text-center bg-card/20 border-border/40">
              <Wallet className="h-10 w-10 text-muted-foreground/60 mb-2 animate-pulse-soft" />
              <p className="text-sm font-semibold">No accounts found matching your queries</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Create your first savings account or credit card to begin.</p>
              <Button size="sm" onClick={handleOpenAddDialog} className="rounded-xl h-9">
                Add Account
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Account form Dialog - Spacious and Premium */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={cn("form-spacious max-h-[85vh] lg:max-h-[90vh] overflow-y-auto scrollbar-thin transition-all duration-300", type === 'CREDIT_CARD' ? 'sm:max-w-[650px] lg:max-w-[780px] lg:p-8' : 'sm:max-w-[480px] lg:max-w-[580px] lg:p-8')}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">{editingAccount ? 'Edit Account' : 'Create Financial Account'}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure parameters for your liquid asset bank ledger, cash drawer, or billing card.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Account Name</Label>
                <Input
                  placeholder="e.g. HDFC Savings"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isPending}
                  className="h-11 px-4 rounded-xl border-border/40 bg-background/20"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Account Type</Label>
                <Select value={type} onValueChange={(val: any) => setType(val || 'SAVINGS')} disabled={isPending}>
                  <SelectTrigger className="bg-background/20 border-border/40 h-11 rounded-xl">
                    <SelectValue placeholder="Type">
                      {type === 'SAVINGS' ? 'Savings Account' : type === 'CURRENT' ? 'Current Checking' : type === 'CASH' ? 'Cash Wallet' : type === 'CREDIT_CARD' ? 'Credit Card' : type === 'FIXED_DEPOSIT' ? 'Fixed Deposit' : type === 'STOCKS' ? 'Stocks Demat' : type === 'MUTUAL_FUNDS' ? 'Mutual Funds' : type === 'CRYPTO' ? 'Crypto Wallet' : type === 'LOAN' ? 'Loan Ledger' : type === 'EPF' ? 'EPF (Retirement)' : type === 'PPF' ? 'PPF Account' : type === 'NPS' ? 'NPS Account' : 'Other Assets'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAVINGS">Savings Account</SelectItem>
                    <SelectItem value="CURRENT">Current Checking</SelectItem>
                    <SelectItem value="CASH">Cash Wallet</SelectItem>
                    <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                    <SelectItem value="FIXED_DEPOSIT">Fixed Deposit</SelectItem>
                    <SelectItem value="STOCKS">Stocks Demat</SelectItem>
                    <SelectItem value="MUTUAL_FUNDS">Mutual Funds</SelectItem>
                    <SelectItem value="CRYPTO">Crypto Wallet</SelectItem>
                    <SelectItem value="LOAN">Loan Ledger</SelectItem>
                    <SelectItem value="EPF">EPF (Retirement)</SelectItem>
                    <SelectItem value="PPF">PPF Account</SelectItem>
                    <SelectItem value="NPS">NPS Account</SelectItem>
                    <SelectItem value="OTHER">Other Assets</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Institution / Bank</Label>
                <Input
                  placeholder="e.g. HDFC Bank"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  disabled={isPending}
                  className="h-11 px-4 rounded-xl border-border/40 bg-background/20"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Account Number (Opt)</Label>
                <Input
                  placeholder="e.g. XXXX 5892"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  disabled={isPending}
                  className="h-11 px-4 rounded-xl border-border/40 bg-background/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">
                  {type === 'CREDIT_CARD' ? 'Outstanding Balance (₹)' : 'Current Balance (₹)'}
                </Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  disabled={isPending}
                  className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Opening Balance (₹)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  disabled={isPending}
                  className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono"
                />
              </div>
            </div>

            {(type === 'SAVINGS' || type === 'FIXED_DEPOSIT' || type === 'LOAN') && (
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Interest Rate (% p.a.)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 3.50"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  disabled={isPending}
                  className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono"
                />
              </div>
            )}

            {type === 'CREDIT_CARD' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="label-uppercase text-muted-foreground">Total Credit Limit (₹)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 200000"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    disabled={isPending}
                    className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="label-uppercase text-muted-foreground">Interest Rate (% p.a.)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 42.00"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    disabled={isPending}
                    className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Theme Color</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    className="w-14 h-11 p-1 border rounded-xl cursor-pointer border-border/40 transition-colors"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    disabled={isPending}
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm font-mono text-muted-foreground">{color}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Icon Symbol</Label>
                <Select value={icon} onValueChange={(val: any) => setIcon(val || 'wallet')} disabled={isPending}>
                  <SelectTrigger className="bg-background/20 border-border/40 h-11 rounded-xl">
                    <SelectValue placeholder="Icon">
                      {icon === 'wallet' ? 'Wallet Icon' : icon === 'banknote' ? 'Banknote Icon' : icon === 'credit-card' ? 'Credit Card Icon' : icon === 'landmark' ? 'Landmark Icon' : 'Trending/Invest Icon'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wallet">Wallet Icon</SelectItem>
                    <SelectItem value="banknote">Banknote Icon</SelectItem>
                    <SelectItem value="credit-card">Credit Card Icon</SelectItem>
                    <SelectItem value="landmark">Landmark Icon</SelectItem>
                    <SelectItem value="trending-up">Trending/Invest Icon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Internal Ledger Notes</Label>
              <Textarea
                placeholder="Branch address, manager contact, yield conditions, special reward points..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isPending}
                className="bg-background/20 border-border/40 min-h-[70px] rounded-xl px-4 py-2"
              />
            </div>

            {/* Credit Card Details Sub-Form */}
            {type === 'CREDIT_CARD' && (
              <div className="space-y-4 border-t border-border/40 pt-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1">
                  <CardIcon className="h-4 w-4" /> Credit Card Cycle & Visual Template
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="label-uppercase text-muted-foreground">Card Name (Alias)</Label>
                    <Input
                      placeholder="e.g. Amazon Pay Card"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      disabled={isPending}
                      className="h-11 px-4 rounded-xl border-border/40 bg-background/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="label-uppercase text-muted-foreground">Card Brand Template</Label>
                    <Select value={cardTemplate} onValueChange={(val: any) => setCardTemplate(val || 'STANDARD')} disabled={isPending}>
                      <SelectTrigger className="bg-background/20 border-border/40 h-11 rounded-xl">
                        <SelectValue placeholder="Template">
                          {CARD_TEMPLATES.find(t => t.id === cardTemplate)?.name || 'Standard (Theme Color)'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {CARD_TEMPLATES.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="label-uppercase text-muted-foreground">Card Number (Optional)</Label>
                    <Input
                      placeholder="XXXX XXXX XXXX XXXX"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      disabled={isPending}
                      className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="label-uppercase text-muted-foreground">Cardholder Name</Label>
                    <Input
                      placeholder="e.g. John Doe"
                      value={cardHolderName}
                      onChange={(e) => setCardHolderName(e.target.value)}
                      disabled={isPending}
                      className="h-11 px-4 rounded-xl border-border/40 bg-background/20"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="label-uppercase text-muted-foreground">Expiry (MM/YY)</Label>
                    <Input
                      placeholder="12/28"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      disabled={isPending}
                      className="h-11 px-2.5 rounded-xl border-border/40 bg-background/20 font-mono text-center"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="label-uppercase text-muted-foreground">CVV</Label>
                    <Input
                      type="password"
                      placeholder="***"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      disabled={isPending}
                      className="h-11 px-2.5 rounded-xl border-border/40 bg-background/20 font-mono text-center"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="label-uppercase text-muted-foreground">Last 4 Digits</Label>
                    <Input
                      placeholder="5892"
                      value={lastFourDigits}
                      onChange={(e) => setLastFourDigits(e.target.value)}
                      disabled={isPending}
                      maxLength={4}
                      className="h-11 px-2.5 rounded-xl border-border/40 bg-background/20 font-mono text-center"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 col-span-1">
                    <Label className="label-uppercase text-muted-foreground">Statement Day (1-31)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="e.g. 15"
                      value={statementDate}
                      onChange={(e) => setStatementDate(e.target.value)}
                      disabled={isPending}
                      className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-1">
                    <Label className="label-uppercase text-muted-foreground">Due Day (1-31)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="e.g. 5"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      disabled={isPending}
                      className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-1">
                    <Label className="label-uppercase text-muted-foreground">Min Due (₹)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 1000"
                      value={minimumDue}
                      onChange={(e) => setMinimumDue(e.target.value)}
                      disabled={isPending}
                      className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="label-uppercase text-muted-foreground">Rewards Point Value (₹)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={rewardsBalance}
                      onChange={(e) => setRewardsBalance(e.target.value)}
                      disabled={isPending}
                      className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="label-uppercase text-muted-foreground">Card Notes</Label>
                    <Input
                      placeholder="e.g. 10% lounge access info"
                      value={cardNotes}
                      onChange={(e) => setCardNotes(e.target.value)}
                      disabled={isPending}
                      className="h-11 px-4 rounded-xl border-border/40 bg-background/20"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2.5 pt-3 border-t border-border/30 flex flex-wrap items-center justify-between sm:justify-end">
            {!editingAccount && (
              <Button type="button" variant="secondary" onClick={handleSaveDraft} disabled={isPending} className="rounded-xl h-11 px-4 text-xs font-semibold mr-auto">
                Save as Draft
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isPending} className="rounded-xl h-11">
              Cancel
            </Button>
            <Button onClick={handleSaveAccount} disabled={isPending} className="gradient-primary text-white font-semibold rounded-xl h-11 px-6 shadow-md">
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving Ledger...
                </>
              ) : (
                'Save Account'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

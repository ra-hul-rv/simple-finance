'use client';

import { useEffect, useState, useTransition } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
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
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Wallet,
  CreditCard as CardIcon,
  Building,
  Loader2,
  ArrowLeftRight,
  Search,
  Filter,
  Briefcase,
  TrendingUp,
  Gift,
  Landmark,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { useFormDraft } from '@/hooks/use-form-draft';
import Link from 'next/link';
import { cn, getRandomColor } from '@/lib/utils';
import { CARD_TEMPLATES, getTemplate } from '@/lib/card-templates';
import { AccountGroup } from '@/components/accounts/account-group';
import { AccountCard } from '@/components/accounts/account-card';
import { CreditCardItem } from '@/components/accounts/credit-card-item';
import { CreditCardVisual } from '@/components/accounts/credit-card-visual';

// ─── Types ────────────────────────────────────────────

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

// ─── Group Definitions ────────────────────────────────

const ACCOUNT_GROUPS = [
  {
    key: 'bank',
    title: 'Bank Accounts',
    types: ['SAVINGS', 'CURRENT'],
    icon: <Landmark className="h-4 w-4" />,
    balanceLabel: 'Total Balance',
  },
  {
    key: 'cards',
    title: 'Credit Cards',
    types: ['CREDIT_CARD'],
    icon: <CardIcon className="h-4 w-4" />,
    balanceLabel: 'Total Outstanding',
    balanceVariant: 'destructive' as const,
  },
  {
    key: 'wallets',
    title: 'Wallets & Gift Cards',
    types: ['CASH', 'WALLET', 'GIFT_CARD'],
    icon: <Gift className="h-4 w-4" />,
    balanceLabel: 'Total Balance',
  },
  {
    key: 'investments',
    title: 'Investments',
    types: ['STOCKS', 'MUTUAL_FUNDS', 'CRYPTO', 'EPF', 'PPF', 'NPS'],
    icon: <TrendingUp className="h-4 w-4" />,
    balanceLabel: 'Total Value',
  },
  {
    key: 'fixed',
    title: 'Fixed Deposits & Loans',
    types: ['FIXED_DEPOSIT', 'LOAN', 'OTHER'],
    icon: <Briefcase className="h-4 w-4" />,
    balanceLabel: 'Total Value',
  },
];

// ─── Component ────────────────────────────────────────

export default function UnifiedAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<'type' | 'activity'>('type');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form — General
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

  // Form — Credit Card
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
  const [showCvvInForm, setShowCvvInForm] = useState(false);

  // ─── Data Fetching ─────────────────────────────────

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      if (!res.ok) throw new Error('Failed to load accounts');
      const data = await res.json();

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

  // ─── Draft Persistence ─────────────────────────────

  const initialValues = {
    name: '', type: 'SAVINGS', institution: '', accountNumber: '',
    balance: '0', openingBalance: '0', interestRate: '', creditLimit: '',
    color: '#6366f1', icon: 'wallet', notes: '',
    cardName: '', cardNumber: '', cardHolderName: '', expiryDate: '',
    cvv: '', lastFourDigits: '', cardTemplate: 'STANDARD',
    statementDate: '', dueDate: '', cardNotes: '', rewardsBalance: '0', minimumDue: '',
  };

  const { clearDraft } = useFormDraft(
    'account',
    initialValues,
    { name, type, institution, accountNumber, balance, openingBalance, interestRate, creditLimit, color, icon, notes, cardName, cardNumber, cardHolderName, expiryDate, cvv, lastFourDigits, cardTemplate, statementDate, dueDate, cardNotes, rewardsBalance, minimumDue },
    (vals) => {
      setName(vals.name || ''); setType(vals.type || 'SAVINGS');
      setInstitution(vals.institution || ''); setAccountNumber(vals.accountNumber || '');
      setBalance(vals.balance || '0'); setOpeningBalance(vals.openingBalance || '0');
      setInterestRate(vals.interestRate || ''); setCreditLimit(vals.creditLimit || '');
      setColor(vals.color || '#6366f1'); setIcon(vals.icon || 'wallet');
      setNotes(vals.notes || ''); setCardName(vals.cardName || '');
      setCardNumber(vals.cardNumber || ''); setCardHolderName(vals.cardHolderName || '');
      setExpiryDate(vals.expiryDate || ''); setCvv(vals.cvv || '');
      setLastFourDigits(vals.lastFourDigits || ''); setCardTemplate(vals.cardTemplate || 'STANDARD');
      setStatementDate(vals.statementDate || ''); setDueDate(vals.dueDate || '');
      setCardNotes(vals.cardNotes || ''); setRewardsBalance(vals.rewardsBalance || '0');
      setMinimumDue(vals.minimumDue || '');
    },
    isDialogOpen && !editingAccount,
  );

  // ─── Dialog Handlers ──────────────────────────────

  const resetForm = () => {
    setName(''); setType('SAVINGS'); setInstitution(''); setAccountNumber('');
    setBalance('0'); setOpeningBalance('0'); setInterestRate(''); setCreditLimit('');
    setColor(getRandomColor()); setIcon('wallet'); setNotes('');
    setCardName(''); setCardNumber(''); setCardHolderName(''); setExpiryDate('');
    setCvv(''); setLastFourDigits(''); setCardTemplate('STANDARD');
    setStatementDate(''); setDueDate(''); setCardNotes('');
    setRewardsBalance('0'); setMinimumDue(''); setShowCvvInForm(false);
  };

  const handleOpenAddDialog = () => {
    setEditingAccount(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (account: Account) => {
    setEditingAccount(account);
    setName(account.name); setType(account.type);
    setInstitution(account.institution || ''); setAccountNumber(account.accountNumber || '');
    setBalance(Math.abs(account.balance).toString()); setOpeningBalance(account.openingBalance.toString());
    setInterestRate(account.interestRate?.toString() || ''); setCreditLimit(account.creditLimit?.toString() || '');
    setColor(account.color); setIcon(account.icon); setNotes(account.notes || '');

    if (account.type === 'CREDIT_CARD' && account.creditCard) {
      const cc = account.creditCard;
      setCardName(cc.cardName); setCardNumber(cc.cardNumber || '');
      setCardHolderName(cc.cardHolderName || ''); setExpiryDate(cc.expiryDate || '');
      setCvv(cc.cvv || ''); setLastFourDigits(cc.lastFourDigits || '');
      setCardTemplate(cc.template || 'STANDARD'); setStatementDate(cc.statementDate?.toString() || '');
      setDueDate(cc.dueDate?.toString() || ''); setCardNotes(cc.notes || '');
      setRewardsBalance(cc.rewardsBalance.toString()); setMinimumDue(cc.minimumDue?.toString() || '');
    } else {
      setCardName(''); setCardNumber(''); setCardHolderName(''); setExpiryDate('');
      setCvv(''); setLastFourDigits(''); setCardTemplate('STANDARD');
      setStatementDate(''); setDueDate(''); setCardNotes(''); setRewardsBalance('0'); setMinimumDue('');
    }
    setShowCvvInForm(false);
    setIsDialogOpen(true);
  };

  const handleSaveDraft = () => {
    const draftValues = { name, type, institution, accountNumber, balance, openingBalance, interestRate, creditLimit, color, icon, notes, cardName, cardNumber, cardHolderName, expiryDate, cvv, lastFourDigits, cardTemplate, statementDate, dueDate, cardNotes, rewardsBalance, minimumDue };
    localStorage.setItem('sf_draft_account', JSON.stringify(draftValues));
    toast.success('Account details saved as draft locally!');
    setIsDialogOpen(false);
  };

  // ─── Save Account ─────────────────────────────────

  const handleSaveAccount = () => {
    if (!name.trim()) { toast.error('Please enter a name'); return; }

    startTransition(async () => {
      try {
        let finalBalance = parseFloat(balance || '0');
        if (type === 'CREDIT_CARD') finalBalance = -Math.abs(finalBalance);

        const payload = {
          name, type,
          institution: institution.trim() || null,
          accountNumber: accountNumber.trim() || null,
          balance: finalBalance,
          openingBalance: parseFloat(openingBalance || '0'),
          currency: 'INR',
          interestRate: interestRate ? parseFloat(interestRate) : null,
          creditLimit: creditLimit ? parseFloat(creditLimit) : null,
          color, icon,
          notes: notes.trim() || null,
        };

        const url = editingAccount ? `/api/accounts/${editingAccount.id}` : '/api/accounts';
        const method = editingAccount ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Failed to save account');
        const accountData = await res.json();

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
            color,
            accountId: accountData.id,
            rewardsBalance: parseFloat(rewardsBalance || '0'),
            minimumDue: minimumDue ? parseFloat(minimumDue) : null,
            interestRate: interestRate ? parseFloat(interestRate) : null,
          };

          const ccUrl = editingAccount && editingAccount.creditCard
            ? `/api/credit-cards/${editingAccount.creditCard.id}`
            : '/api/credit-cards';
          const ccMethod = editingAccount && editingAccount.creditCard ? 'PUT' : 'POST';
          await fetch(ccUrl, { method: ccMethod, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ccPayload) });
        }

        toast.success(editingAccount ? 'Account updated' : 'Account created');
        if (!editingAccount) clearDraft();
        setIsDialogOpen(false);
        fetchAccounts();
      } catch (err) {
        console.error(err);
        toast.error('Failed to save account');
      }
    });
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Delete this account? All associated transactions will be deleted.')) return;
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Account deleted');
      fetchAccounts();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete account');
    }
  };

  // ─── Computed Data ─────────────────────────────────

  const assetAccounts = accounts.filter(a => a.type !== 'CREDIT_CARD');
  const cardAccounts = accounts
    .filter(a => a.type === 'CREDIT_CARD')
    .sort((a, b) => (a.creditCard?.order ?? 0) - (b.creditCard?.order ?? 0));

  const totalAssets = assetAccounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const totalLiabilities = cardAccounts.reduce((sum, a) => sum + Math.abs(Number(a.balance)), 0);
  const totalAvailableCredit = cardAccounts.reduce((sum, a) => sum + (a.creditCard?.availableCredit || 0), 0);

  // Filter by search and type
  const matchesSearch = (a: Account) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return a.name.toLowerCase().includes(q) || (a.institution && a.institution.toLowerCase().includes(q));
  };

  const matchesType = (a: Account) => {
    if (typeFilter === 'ALL') return true;
    return a.type === typeFilter;
  };

  const filteredAccounts = accounts.filter(a => matchesSearch(a) && matchesType(a));

  // Build grouped data
  const groupedData = ACCOUNT_GROUPS.map(group => {
    const groupAccounts = filteredAccounts.filter(a => group.types.includes(a.type));
    const totalBalance = groupAccounts.reduce((sum, a) =>
      group.key === 'cards' ? sum + Math.abs(Number(a.balance)) : sum + Number(a.balance), 0
    );
    return { ...group, accounts: groupAccounts, totalBalance };
  }).filter(g => g.accounts.length > 0);

  // ─── Render ────────────────────────────────────────

  const selectedTemplate = getTemplate(cardTemplate);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader title="Accounts & Cards" description="Manage all your financial accounts, cards, wallets, and investments">
        <div className="flex items-center gap-3">
          <Link href="/transactions?action=transfer" className="h-9 gap-1.5 px-4 border border-border/40 hover:bg-accent/40 rounded-xl inline-flex items-center text-xs font-semibold bg-background/20 text-foreground transition-all duration-200">
            <ArrowLeftRight className="h-4 w-4" />
            Transfer
          </Link>
          <Button onClick={handleOpenAddDialog} className="h-9 gap-1.5 px-4 rounded-xl gradient-primary text-white font-semibold shadow-md">
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        </div>
      </PageHeader>

      {/* ─── Stats Overview ──────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Assets" value={totalAssets} variant="glass" />
        <StatCard title="Cards Outstanding" value={totalLiabilities} prefix="₹" icon={<CardIcon className="h-4 w-4 text-destructive" />} />
        <StatCard title="Available Credit" value={totalAvailableCredit} prefix="₹" icon={<CardIcon className="h-4 w-4 text-emerald-500" />} />
        <StatCard title="Net Worth" value={totalAssets - totalLiabilities} variant="default" />
      </div>

      {/* ─── Search & Filter ─────────────────────────── */}
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
          <div className="hidden sm:flex items-center gap-1.5 border-r border-border/50 pr-3 mr-1">
            <Select value={sortMode} onValueChange={(val: any) => setSortMode(val)}>
              <SelectTrigger className="w-[160px] bg-background/30 border-border/40 h-10 rounded-xl">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="type">Group by Type</SelectItem>
                <SelectItem value="activity">Active Spends First</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val || 'ALL')}>
            <SelectTrigger className="w-[180px] bg-background/30 border-border/40 h-10 rounded-xl">
              <SelectValue placeholder="All Assets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Account Types</SelectItem>
              <SelectItem value="SAVINGS">Savings</SelectItem>
              <SelectItem value="CURRENT">Current</SelectItem>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="CREDIT_CARD">Credit Cards</SelectItem>
              <SelectItem value="WALLET">Wallets</SelectItem>
              <SelectItem value="GIFT_CARD">Gift Cards</SelectItem>
              <SelectItem value="FIXED_DEPOSIT">Fixed Deposits</SelectItem>
              <SelectItem value="STOCKS">Stocks</SelectItem>
              <SelectItem value="MUTUAL_FUNDS">Mutual Funds</SelectItem>
              <SelectItem value="CRYPTO">Crypto</SelectItem>
              <SelectItem value="EPF">EPF</SelectItem>
              <SelectItem value="PPF">PPF</SelectItem>
              <SelectItem value="NPS">NPS</SelectItem>
              <SelectItem value="LOAN">Loans</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ─── Grouped Account Sections ─────────────────── */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : groupedData.length > 0 ? (
        <div className="space-y-6">
          {groupedData.map(group => (
            <AccountGroup
              key={group.key}
              title={group.title}
              icon={group.icon}
              count={group.accounts.length}
              totalBalance={group.totalBalance}
              balanceLabel={group.balanceLabel}
              balanceVariant={group.balanceVariant}
              defaultExpanded
            >
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {group.key === 'cards'
                  ? group.accounts.map(acc => {
                      if (!acc.creditCard) {
                        return (
                          <div key={acc.id} className="flex flex-col items-center justify-center border border-dashed rounded-xl p-8 text-center bg-card/20 border-border/40">
                            <CardIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
                            <p className="text-sm font-semibold">{acc.name}</p>
                            <p className="text-xs text-muted-foreground mt-1 mb-3">Card details not configured</p>
                            <Button size="sm" onClick={() => handleOpenEditDialog(acc)} className="rounded-xl h-8 text-xs">Configure</Button>
                          </div>
                        );
                      }
                      return (
                        <CreditCardItem
                          key={acc.id}
                          accountId={acc.id}
                          accountName={acc.name}
                          accountColor={acc.color}
                          creditCard={acc.creditCard}
                          onEdit={() => handleOpenEditDialog(acc)}
                          onDelete={() => handleDeleteAccount(acc.id)}
                        />
                      );
                    })
                  : group.accounts.map(acc => (
                      <AccountCard
                        key={acc.id}
                        account={acc}
                        onEdit={() => handleOpenEditDialog(acc)}
                        onDelete={() => handleDeleteAccount(acc.id)}
                      />
                    ))
                }
              </div>
            </AccountGroup>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-xl p-12 text-center bg-card/20 border-border/40">
          <Wallet className="h-10 w-10 text-muted-foreground/60 mb-2 animate-pulse-soft" />
          <p className="text-sm font-semibold">No accounts found</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Create your first account to get started.</p>
          <Button size="sm" onClick={handleOpenAddDialog} className="rounded-xl h-9">Add Account</Button>
        </div>
      )}

      {/* ─── Add/Edit Account Dialog ──────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={cn(
          "form-spacious max-h-[85vh] lg:max-h-[90vh] overflow-y-auto scrollbar-thin transition-all duration-300",
          type === 'CREDIT_CARD' ? 'sm:max-w-[700px] lg:max-w-[820px] lg:p-8' : 'sm:max-w-[520px] lg:max-w-[600px] lg:p-8'
        )}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">
              {editingAccount ? 'Edit Account' : 'Create Account'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {type === 'CREDIT_CARD'
                ? 'Configure your credit card details, billing cycle, and visual template.'
                : 'Set up your financial account details.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3">
            {/* ── Section: Basic Info ──────────────────── */}
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest font-bold text-primary/70">Basic Information</p>
              <div className="h-px bg-border/40" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Account Name</Label>
                <Input placeholder="e.g. HDFC Savings" value={name} onChange={(e) => setName(e.target.value)} disabled={isPending} className="h-11 px-4 rounded-xl border-border/40 bg-background/20" />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Account Type</Label>
                <Select value={type} onValueChange={(val: any) => setType(val || 'SAVINGS')} disabled={isPending}>
                  <SelectTrigger className="bg-background/20 border-border/40 h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAVINGS">Savings Account</SelectItem>
                    <SelectItem value="CURRENT">Current Account</SelectItem>
                    <SelectItem value="CASH">Cash Wallet</SelectItem>
                    <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                    <SelectItem value="WALLET">Digital Wallet</SelectItem>
                    <SelectItem value="GIFT_CARD">Gift Card / Prepaid</SelectItem>
                    <SelectItem value="FIXED_DEPOSIT">Fixed Deposit</SelectItem>
                    <SelectItem value="STOCKS">Stocks / Demat</SelectItem>
                    <SelectItem value="MUTUAL_FUNDS">Mutual Funds</SelectItem>
                    <SelectItem value="CRYPTO">Crypto Wallet</SelectItem>
                    <SelectItem value="LOAN">Loan Ledger</SelectItem>
                    <SelectItem value="EPF">EPF</SelectItem>
                    <SelectItem value="PPF">PPF</SelectItem>
                    <SelectItem value="NPS">NPS</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Institution / Bank</Label>
                <Input placeholder="e.g. HDFC Bank" value={institution} onChange={(e) => setInstitution(e.target.value)} disabled={isPending} className="h-11 px-4 rounded-xl border-border/40 bg-background/20" />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Account Number</Label>
                <Input placeholder="e.g. XXXX 5892" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} disabled={isPending} className="h-11 px-4 rounded-xl border-border/40 bg-background/20" />
              </div>
            </div>

            {/* ── Section: Balance ─────────────────────── */}
            <div className="space-y-1 pt-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-primary/70">Balance & Financials</p>
              <div className="h-px bg-border/40" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">
                  {type === 'CREDIT_CARD' ? 'Outstanding Balance (₹)' : 'Current Balance (₹)'}
                </Label>
                <Input type="number" placeholder="0.00" value={balance} onChange={(e) => setBalance(e.target.value)} disabled={isPending} className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Opening Balance (₹)</Label>
                <Input type="number" placeholder="0.00" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} disabled={isPending} className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono" />
              </div>
            </div>

            {(type === 'SAVINGS' || type === 'FIXED_DEPOSIT' || type === 'LOAN') && (
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Interest Rate (% p.a.)</Label>
                <Input type="number" step="0.01" placeholder="e.g. 3.50" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} disabled={isPending} className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono" />
              </div>
            )}

            {type === 'CREDIT_CARD' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="label-uppercase text-muted-foreground">Total Credit Limit (₹)</Label>
                    <Input type="number" placeholder="e.g. 200000" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} disabled={isPending} className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="label-uppercase text-muted-foreground">Interest Rate (% p.a.)</Label>
                    <Input type="number" step="0.01" placeholder="e.g. 42.00" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} disabled={isPending} className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono" />
                  </div>
                </div>

                {/* ── Section: Card Details ────────────── */}
                <div className="space-y-1 pt-2">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-primary/70">Card Details</p>
                  <div className="h-px bg-border/40" />
                </div>

                {/* Live Card Preview */}
                <div className="flex justify-center py-2">
                  <CreditCardVisual
                    template={selectedTemplate}
                    cardNumber={cardNumber}
                    lastFourDigits={lastFourDigits}
                    cardHolderName={cardHolderName}
                    expiryDate={expiryDate}
                    cvv={cvv}
                    size="sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="label-uppercase text-muted-foreground">Card Template</Label>
                  <Select value={cardTemplate} onValueChange={setCardTemplate} disabled={isPending}>
                    <SelectTrigger className="bg-background/20 border-border/40 h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CARD_TEMPLATES.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="label-uppercase text-muted-foreground">Card Display Name</Label>
                    <Input placeholder="e.g. ICICI Rubyx" value={cardName} onChange={(e) => setCardName(e.target.value)} disabled={isPending} className="h-11 px-4 rounded-xl border-border/40 bg-background/20" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="label-uppercase text-muted-foreground">Card Holder Name</Label>
                    <Input placeholder="JOHN DOE" value={cardHolderName} onChange={(e) => setCardHolderName(e.target.value)} disabled={isPending} className="h-11 px-4 rounded-xl border-border/40 bg-background/20 uppercase" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="label-uppercase text-muted-foreground">Card Number</Label>
                    <Input placeholder="1234 5678 9012 3456" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} disabled={isPending} className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="label-uppercase text-muted-foreground">Expiry (MM/YY)</Label>
                    <Input placeholder="12/29" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} disabled={isPending} className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="label-uppercase text-muted-foreground">CVV</Label>
                    <div className="relative">
                      <Input
                        type={showCvvInForm ? 'text' : 'password'}
                        placeholder="•••"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        disabled={isPending}
                        className="h-11 px-4 pr-10 rounded-xl border-border/40 bg-background/20 font-mono"
                        maxLength={4}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCvvInForm(!showCvvInForm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showCvvInForm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="label-uppercase text-muted-foreground">Last 4 Digits (if no full number)</Label>
                  <Input placeholder="1234" value={lastFourDigits} onChange={(e) => setLastFourDigits(e.target.value)} disabled={isPending} className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono" maxLength={4} />
                </div>

                {/* ── Section: Billing Cycle ───────────── */}
                <div className="space-y-1 pt-2">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-primary/70">Billing Cycle</p>
                  <div className="h-px bg-border/40" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="label-uppercase text-muted-foreground">Statement Date (day)</Label>
                    <Input type="number" min={1} max={31} placeholder="e.g. 15" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} disabled={isPending} className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="label-uppercase text-muted-foreground">Due Date (day)</Label>
                    <Input type="number" min={1} max={31} placeholder="e.g. 5" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={isPending} className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="label-uppercase text-muted-foreground">Minimum Due (₹)</Label>
                    <Input type="number" placeholder="0.00" value={minimumDue} onChange={(e) => setMinimumDue(e.target.value)} disabled={isPending} className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="label-uppercase text-muted-foreground">Rewards Points Balance</Label>
                  <Input type="number" placeholder="0" value={rewardsBalance} onChange={(e) => setRewardsBalance(e.target.value)} disabled={isPending} className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono" />
                </div>

                <div className="space-y-1.5">
                  <Label className="label-uppercase text-muted-foreground">Card Notes</Label>
                  <Textarea placeholder="Any notes about this card..." value={cardNotes} onChange={(e) => setCardNotes(e.target.value)} disabled={isPending} rows={2} className="rounded-xl border-border/40 bg-background/20" />
                </div>
              </>
            )}

            {/* ── Color & Notes (all types) ────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Accent Color</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 rounded-xl cursor-pointer border border-border/40" />
                  <Input value={color} onChange={(e) => setColor(e.target.value)} className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono text-xs flex-1" />
                </div>
              </div>
              {type !== 'CREDIT_CARD' && (
                <div className="space-y-1.5">
                  <Label className="label-uppercase text-muted-foreground">Notes</Label>
                  <Textarea placeholder="Any notes..." value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isPending} rows={2} className="rounded-xl border-border/40 bg-background/20" />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!editingAccount && (
              <Button variant="outline" onClick={handleSaveDraft} disabled={isPending} className="rounded-xl">
                Save Draft
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isPending} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleSaveAccount} disabled={isPending} className="rounded-xl gradient-primary text-white font-semibold shadow-md">
              {isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving...</> : editingAccount ? 'Save Changes' : 'Create Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

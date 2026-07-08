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
import { Badge } from '@/components/ui/badge';
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';
import { CreditCard as CardIcon, Plus, Calendar, Loader2, Award, Edit2, Trash2, ShieldCheck, Flame, Percent, GripVertical, Search } from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface CreditCard {
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
  accountId: string;
  account: { name: string };
}

interface Account {
  id: string;
  name: string;
  type: string;
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
  if (j == 1 && k != 11) return "st";
  if (j == 2 && k != 12) return "nd";
  if (j == 3 && k != 13) return "rd";
  return "th";
}

function SortableCreditCard({
  card,
  handleOpenEditDialog,
  handleDeleteCard,
  setViewingNotes,
  setIsNotesDialogOpen,
}: {
  card: CreditCard;
  handleOpenEditDialog: (c: CreditCard) => void;
  handleDeleteCard: (id: string) => void;
  setViewingNotes: (c: CreditCard) => void;
  setIsNotesDialogOpen: (open: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const usagePct = (card.outstandingBalance / card.creditLimit) * 100;
  const cardTemplate = CARD_TEMPLATES.find((t) => t.id === (card.template || 'STANDARD')) || CARD_TEMPLATES[0];

  return (
    <Card ref={setNodeRef} style={style} className={cn("glass relative overflow-hidden border-border bg-card/60 backdrop-blur-xl transition-all duration-200", isDragging ? 'shadow-2xl scale-105' : 'card-hover')}>
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: card.color || '#ea580c' }} />

      <CardHeader className="pl-6 pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div {...attributes} {...listeners} className="cursor-grab hover:bg-white/10 p-1 rounded -ml-2 text-muted-foreground">
                <GripVertical className="h-4 w-4" />
              </div>
              <CardTitle className="text-lg font-bold">
                {card.cardName}
              </CardTitle>
              {card.lastFourDigits && (
                <span className="text-xs text-muted-foreground font-mono">
                  (•••• {card.lastFourDigits})
                </span>
              )}
            </div>
            <CardDescription className="text-xs ml-6">Linked Ledger: {card.account.name}</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7 rounded hover:bg-accent" onClick={() => handleOpenEditDialog(card)}>
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteCard(card.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pl-6 space-y-4">
        {/* Visual Glassmorphic Card Details */}
        <div
          onClick={() => { setViewingNotes(card); setIsNotesDialogOpen(true); }}
          className={cn(
            "rounded-xl p-5 flex flex-col justify-between relative overflow-hidden shadow-lg border border-white/20 aspect-[1.8/1] cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl group",
            cardTemplate.bg,
            cardTemplate.text
          )}
          style={cardTemplate.id === 'STANDARD' ? { background: `linear-gradient(135deg, ${card.color}bb, #171717f0)` } : {}}
        >
          <div className="absolute inset-0 bg-black/0 group-hover:bg-white/5 transition-colors z-0 pointer-events-none" />
          {/* Decorative elements for premium feel */}
          {cardTemplate.id === 'STANDARD' && <div className="absolute top-0 right-0 w-32 h-32 rounded-full filter blur-3xl opacity-20" style={{ backgroundColor: card.color }} />}
          {cardTemplate.brand === 'amex' && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-[40px] border-black/5 rounded-full filter blur-sm pointer-events-none" />}
          <div className="absolute w-[200%] h-full top-0 -left-1/2 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 transform -rotate-45 pointer-events-none" />

          <div className="flex justify-between items-start z-10">
            <div className="flex flex-col">
              <span className="text-[10px] opacity-70 uppercase tracking-widest">{cardTemplate.logoText || 'Card Provider'}</span>
              <span className="font-semibold text-sm tracking-wide">{cardTemplate.cardTitle || card.cardName}</span>
            </div>
            {/* Brand Logo */}
            <div className="flex flex-col items-end opacity-90">
               {cardTemplate.brand === 'visa' && <span className="font-bold italic text-lg tracking-wider">VISA</span>}
               {cardTemplate.brand === 'master' && (
                 <div className="flex items-center -space-x-2">
                   <div className="w-5 h-5 rounded-full bg-red-500/80 mix-blend-multiply" />
                   <div className="w-5 h-5 rounded-full bg-yellow-500/80 mix-blend-multiply" />
                 </div>
               )}
               {cardTemplate.brand === 'amex' && <span className="font-bold text-xs border border-current px-1 tracking-wider uppercase">Amex</span>}
               {cardTemplate.brand === 'rupay' && <span className="font-bold italic text-sm tracking-widest text-orange-400">RuPay</span>}
            </div>
          </div>

          <div className="flex-1 mt-6 z-10 flex flex-col justify-end">
            <p className="text-[10px] opacity-60 tracking-wider">CARD NUMBER</p>
            <p className="text-lg md:text-xl font-mono tracking-[0.2em] md:tracking-[0.25em] drop-shadow-md">
              {card.cardNumber ? (card.cardNumber.length === 16 ? card.cardNumber.match(/.{1,4}/g)?.join(' ') : card.cardNumber) : `•••• •••• •••• ${card.lastFourDigits || '0000'}`}
            </p>
          </div>

          <div className="flex justify-between items-end text-xs z-10 mt-4">
            <div className="space-y-1">
              <p className="text-[9px] opacity-60 uppercase tracking-wider">Card Holder</p>
              <p className="font-medium tracking-wide truncate max-w-[150px] uppercase drop-shadow-sm">{card.cardHolderName || 'VALID USER'}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[9px] opacity-60 uppercase tracking-wider">Valid Thru</p>
              <p className="font-medium font-mono drop-shadow-sm">{card.expiryDate || '12/29'}</p>
            </div>
          </div>
        </div>

        {/* Outstanding & Limit Metrics */}
        <div className="grid grid-cols-2 gap-4 text-sm pt-2">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Outstanding</p>
            <p className="text-base font-bold text-destructive">{formatCurrency(card.outstandingBalance)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Credit Limit</p>
            <p className="text-base font-bold">{formatCurrency(card.creditLimit)}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Credit Usage</span>
            <span className={usagePct > 80 ? 'text-destructive font-medium' : ''}>{usagePct.toFixed(1)}%</span>
          </div>
          <Progress 
            value={usagePct} 
            className="h-2"
            trackClassName="bg-white/5"
            indicatorClassName={usagePct > 80 ? 'bg-destructive' : 'gradient-primary'}
          />
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-2">
          {card.statementDate && (
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1.5 rounded-md bg-white/5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Statement</p>
                <p className="font-medium">{card.statementDate}{getOrdinalSuffix(card.statementDate)}</p>
              </div>
            </div>
          )}
          {card.dueDate && (
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1.5 rounded-md bg-destructive/10 text-destructive">
                <Calendar className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Due Date</p>
                <p className="font-medium text-destructive">{card.dueDate}{getOrdinalSuffix(card.dueDate)}</p>
              </div>
            </div>
          )}
          {card.interestRate && (
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1.5 rounded-md bg-orange-500/10 text-orange-500">
                <Percent className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Interest Rate</p>
                <p className="font-medium">{card.interestRate}%</p>
              </div>
            </div>
          )}
          {card.rewardsBalance > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1.5 rounded-md bg-yellow-500/10 text-yellow-500">
                <Award className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rewards</p>
                <p className="font-medium">{formatCurrency(card.rewardsBalance)}</p>
              </div>
            </div>
          )}
          {card.minimumDue && (
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
                <ShieldCheck className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Min Due</p>
                <p className="font-medium">{formatCurrency(card.minimumDue)}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CreditCardsPage() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [isPending, startTransition] = useTransition();

  const [cardName, setCardName] = useState('');
  const [lastFourDigits, setLastFourDigits] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [outstandingBalance, setOutstandingBalance] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [statementDate, setStatementDate] = useState('');
  const [minimumDue, setMinimumDue] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [rewardsBalance, setRewardsBalance] = useState('');
  const [color, setColor] = useState('#ea580c');
  const [accountId, setAccountId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [template, setTemplate] = useState('STANDARD');
  const [notes, setNotes] = useState('');

  // Notes Dialog State
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [viewingNotes, setViewingNotes] = useState<CreditCard | null>(null);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState('ALL');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchCreditCards = async () => {
    try {
      const res = await fetch('/api/credit-cards');
      const data = await res.json();
      setCards(data);

      const accRes = await fetch('/api/accounts');
      const accData = await accRes.json();
      const ccAccounts = accData.filter((a: any) => a.type === 'CREDIT_CARD');
      setAccounts(ccAccounts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditCards();
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = cards.findIndex((item) => item.id === active.id);
      const newIndex = cards.findIndex((item) => item.id === over.id);

      const newCards = arrayMove(cards, oldIndex, newIndex);
      
      // Update local state immediately
      const updatedCards = newCards.map((c, index) => ({ ...c, order: index }));
      setCards(updatedCards);

      // Save to backend
      try {
        const payload = updatedCards.map((c) => ({ id: c.id, order: c.order }));
        await fetch('/api/credit-cards/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error('Failed to reorder cards', err);
        toast.error('Failed to save order');
      }
    }
  };

  const filteredCards = cards.filter((card) => {
    const matchesSearch = card.cardName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (card.cardNumber && card.cardNumber.includes(searchQuery)) ||
                          (card.lastFourDigits && card.lastFourDigits.includes(searchQuery));
    if (!matchesSearch) return false;

    if (brandFilter !== 'ALL') {
      const template = CARD_TEMPLATES.find(t => t.id === (card.template || 'STANDARD')) || CARD_TEMPLATES[0];
      if (template.brand !== brandFilter) return false;
    }

    return true;
  });

  const handleOpenAddDialog = () => {
    if (accounts.length === 0) {
      toast.error('Please create a Credit Card type Account first');
      return;
    }
    setEditingCard(null);
    setCardName('');
    setLastFourDigits('');
    setCardNumber('');
    setCardHolderName('');
    setExpiryDate('');
    setCvv('');
    setTemplate('STANDARD');
    setNotes('');
    setCreditLimit('');
    setOutstandingBalance('');
    setDueDate('');
    setStatementDate('');
    setMinimumDue('');
    setInterestRate('');
    setRewardsBalance('0');
    setColor('#ea580c');
    setAccountId(accounts[0]?.id || '');
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (card: CreditCard) => {
    setEditingCard(card);
    setCardName(card.cardName);
    setLastFourDigits(card.lastFourDigits || '');
    setCardNumber(card.cardNumber || '');
    setCardHolderName(card.cardHolderName || '');
    setExpiryDate(card.expiryDate || '');
    setCvv(card.cvv || '');
    setTemplate(card.template || 'STANDARD');
    setNotes(card.notes || '');
    setCreditLimit(card.creditLimit.toString());
    setOutstandingBalance(card.outstandingBalance.toString());
    setDueDate(card.dueDate?.toString() || '');
    setStatementDate(card.statementDate?.toString() || '');
    setMinimumDue(card.minimumDue?.toString() || '');
    setInterestRate(card.interestRate?.toString() || '');
    setRewardsBalance(card.rewardsBalance.toString());
    setColor(card.color);
    setAccountId(card.accountId);
    setIsDialogOpen(true);
  };

  const handleSaveCard = () => {
    if (!cardName.trim()) {
      toast.error('Please enter a card name');
      return;
    }
    if (!creditLimit || parseFloat(creditLimit) <= 0) {
      toast.error('Please enter a valid limit');
      return;
    }
    if (!accountId) {
      toast.error('Please select an account ledger');
      return;
    }

    const payload = {
      cardName,
      lastFourDigits: lastFourDigits || (cardNumber && cardNumber.length >= 4 ? cardNumber.replace(/\s+/g, '').slice(-4) : null) || null,
      cardNumber: cardNumber || null,
      cardHolderName: cardHolderName || null,
      expiryDate: expiryDate || null,
      cvv: cvv || null,
      template: template || 'STANDARD',
      notes: notes || null,
      creditLimit: parseFloat(creditLimit),
      outstandingBalance: parseFloat(outstandingBalance || '0'),
      dueDate: dueDate ? parseInt(dueDate) : null,
      statementDate: statementDate ? parseInt(statementDate) : null,
      minimumDue: minimumDue ? parseFloat(minimumDue) : null,
      interestRate: interestRate ? parseFloat(interestRate) : null,
      rewardsBalance: parseFloat(rewardsBalance || '0'),
      color,
      accountId,
    };

    startTransition(async () => {
      try {
        const url = editingCard ? `/api/credit-cards/${editingCard.id}` : '/api/credit-cards';
        const method = editingCard ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to save card');
        }

        toast.success(editingCard ? 'Credit card updated' : 'Credit card linked');
        setIsDialogOpen(false);
        fetchCreditCards();
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to save card');
      }
    });
  };

  const handleDeleteCard = async (id: string) => {
    if (!confirm('Are you sure you want to delete this credit card integration? Linked transactions will not be deleted but card parameters will be wiped.')) {
      return;
    }

    try {
      const res = await fetch(`/api/credit-cards/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete card');
      toast.success('Credit card integration removed');
      fetchCreditCards();
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove credit card');
    }
  };

  const totalLimit = cards.reduce((sum, c) => sum + c.creditLimit, 0);
  const totalOutstanding = cards.reduce((sum, c) => sum + c.outstandingBalance, 0);
  const totalAvailable = totalLimit - totalOutstanding;

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <PageHeader title="Credit Cards" description="Monitor limits, outstanding balances, payment calendars, and card details" />
        <Button onClick={handleOpenAddDialog} className="gradient-primary text-white font-semibold">
          <Plus className="mr-1.5 h-4 w-4" />
          Link Card
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Credit Limit"
          value={totalLimit}
          prefix="₹"
          icon={<CardIcon className="h-4 w-4 text-primary" />}
        />
        <StatCard
          title="Consolidated Outstanding"
          value={totalOutstanding}
          prefix="₹"
          icon={<Calendar className="h-4 w-4 text-destructive" />}
        />
        <StatCard
          title="Available Credit"
          value={totalAvailable}
          prefix="₹"
          icon={<Calendar className="h-4 w-4 text-success" />}
        />
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card/40 p-4 rounded-xl border border-white/5 backdrop-blur-md">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search cards..." 
            className="pl-9 bg-white/5 border-white/10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Label className="text-sm text-muted-foreground whitespace-nowrap">Brand:</Label>
          <Select value={brandFilter} onValueChange={(val) => setBrandFilter(val || 'ALL')}>
            <SelectTrigger className="w-[140px] bg-white/5 border-white/10">
              <SelectValue placeholder="All Brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Brands</SelectItem>
              <SelectItem value="visa">Visa</SelectItem>
              <SelectItem value="master">Mastercard</SelectItem>
              <SelectItem value="amex">Amex</SelectItem>
              <SelectItem value="rupay">RuPay</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Virtual Credit Cards Render Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid gap-6 lg:grid-cols-2">
          <SortableContext items={filteredCards.map(c => c.id)} strategy={rectSortingStrategy}>
            {filteredCards.map((card) => (
              <SortableCreditCard
                key={card.id}
                card={card}
                handleOpenEditDialog={handleOpenEditDialog}
                handleDeleteCard={handleDeleteCard}
                setViewingNotes={setViewingNotes}
                setIsNotesDialogOpen={setIsNotesDialogOpen}
              />
            ))}
          </SortableContext>
          {filteredCards.length === 0 && (
            <div className="col-span-2 text-center py-10 text-muted-foreground text-sm">
              {cards.length === 0 
                ? 'No credit cards linked yet. Click "Link Card" to configure templates.' 
                : 'No cards match your current search/filters.'}
            </div>
          )}
        </div>
      </DndContext>

      {/* Add/Edit Card Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[450px] glass border-border bg-card/90 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>{editingCard ? 'Update Credit Card' : 'Link Credit Card Ledger'}</DialogTitle>
            <DialogDescription>
              Assign credit limit, due dates, interest rates, and rewards parameters to a credit card.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Card Template</Label>
                <Select value={template} onValueChange={(val) => setTemplate(val || 'STANDARD')} disabled={isPending}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {CARD_TEMPLATES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="label-uppercase text-muted-foreground">Card Name (Alias)</Label>
                  <Input
                    placeholder="e.g. Shopping Card"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="label-uppercase text-muted-foreground">Cardholder Name</Label>
                  <Input
                    placeholder="e.g. John Doe"
                    value={cardHolderName}
                    onChange={(e) => setCardHolderName(e.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Card Number (Optional)</Label>
                <Input
                  placeholder="e.g. 4111 1111 1111 1111"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="label-uppercase text-muted-foreground">Last 4 (Auto)</Label>
                  <Input
                    placeholder="e.g. 1111"
                    maxLength={4}
                    value={lastFourDigits}
                    onChange={(e) => setLastFourDigits(e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="label-uppercase text-muted-foreground">Expiry (MM/YY)</Label>
                  <Input
                    placeholder="12/29"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="label-uppercase text-muted-foreground">CVV</Label>
                  <Input
                    placeholder="123"
                    type="password"
                    maxLength={4}
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Notes (Optional)</Label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="e.g. Lounge access details, customer care number..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Credit Limit (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 200000"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Outstanding (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 15000"
                  value={outstandingBalance}
                  onChange={(e) => setOutstandingBalance(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Statement Date (1-31)</Label>
                <Input
                  type="number"
                  placeholder="25"
                  value={statementDate}
                  onChange={(e) => setStatementDate(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Due Date (1-31)</Label>
                <Input
                  type="number"
                  placeholder="15"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Minimum Due (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 1240"
                  value={minimumDue}
                  onChange={(e) => setMinimumDue(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Interest Rate (% p.a.)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 42"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Linked Ledger Account</Label>
                <Select value={accountId} onValueChange={(val) => setAccountId(val || '')} disabled={isPending}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select Account">
                      {accounts.find(a => a.id === accountId)?.name || 'Select Account'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Card Theme Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    className="w-12 h-9 p-0.5 border rounded-lg cursor-pointer bg-background"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    disabled={isPending}
                  />
                  <span className="text-xs font-mono">{color}</span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Rewards Points Balance</Label>
              <Input
                type="number"
                placeholder="0"
                value={rewardsBalance}
                onChange={(e) => setRewardsBalance(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSaveCard} disabled={isPending} className="gradient-primary">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : 'Save Card Details'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Notes Dialog */}
      <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
        <DialogContent className="sm:max-w-[400px] glass border-border bg-card/90 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Card Notes & Details</DialogTitle>
            <DialogDescription>
              {viewingNotes?.cardName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {viewingNotes?.notes ? (
              <div className="whitespace-pre-wrap text-sm text-foreground bg-white/5 p-4 rounded-xl border border-white/10">
                {viewingNotes.notes}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center italic py-4">
                No notes have been added for this card yet.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNotesDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

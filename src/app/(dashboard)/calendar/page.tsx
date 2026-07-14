'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from '@/components/ui/sheet';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  addMonths, 
  subMonths, 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday 
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Loader2,
  TrendingUp,
  TrendingDown,
  Repeat,
  Tag
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  type: 'TRANSACTION' | 'RECURRING' | 'SUBSCRIPTION' | 'FIXED_DEPOSIT';
  date: string;
  title: string;
  amount: number;
  flowType: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INFO';
  color?: string;
  data: any;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Drawer state
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'TRANSACTIONS' | 'BILLS'>('ALL');
  const [flowTypeFilter, setFlowTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [categoryIdFilter, setCategoryIdFilter] = useState<string>('ALL');

  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(console.error);
  }, []);

  const fetchEvents = async (date: Date) => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      // Fetch a bit wider to cover the calendar grid (start of first week to end of last week)
      const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

      const res = await fetch(`/api/calendar/events?startDate=${gridStart.toISOString()}&endDate=${gridEnd.toISOString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      } else {
        throw new Error('Failed to fetch events');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(currentDate);
  }, [currentDate]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const dateFormat = 'd';
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getEventsForDay = (day: Date) => {
    return events.filter(e => isSameDay(new Date(e.date), day))
      .filter(e => {
        if (typeFilter === 'TRANSACTIONS') return e.type === 'TRANSACTION';
        if (typeFilter === 'BILLS') return e.type !== 'TRANSACTION';
        return true;
      })
      .filter(e => {
        if (flowTypeFilter === 'ALL') return true;
        return e.flowType === flowTypeFilter;
      })
      .filter(e => {
        if (categoryIdFilter === 'ALL') return true;
        return e.data?.categoryId === categoryIdFilter;
      });
  };

  const renderCellData = (day: Date, dayEvents: CalendarEvent[]) => {
    if (dayEvents.length === 0) return null;

    let income = 0;
    let expense = 0;
    const billsAndSubs = dayEvents.filter(e => e.type !== 'TRANSACTION');

    dayEvents.forEach(e => {
      if (e.flowType === 'INCOME') income += e.amount;
      if (e.flowType === 'EXPENSE') expense += e.amount;
    });

    const net = income - expense;
    // Determine cell tint
    let tintClass = '';
    if (net > 0) tintClass = 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20';
    else if (net < 0) tintClass = 'bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/20';

    return {
      income,
      expense,
      billsAndSubs,
      tintClass
    };
  };

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Financial Calendar" 
          description="Track cash flow, bills, and subscriptions across the month" 
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border p-1 bg-card">
            <Button 
              size="sm" 
              variant={typeFilter === 'ALL' ? 'secondary' : 'ghost'} 
              className={cn("h-7 px-3 text-xs", typeFilter === 'ALL' && "shadow-sm")}
              onClick={() => setTypeFilter('ALL')}
            >
              All
            </Button>
            <Button 
              size="sm" 
              variant={typeFilter === 'TRANSACTIONS' ? 'secondary' : 'ghost'} 
              className={cn("h-7 px-3 text-xs", typeFilter === 'TRANSACTIONS' && "shadow-sm")}
              onClick={() => setTypeFilter('TRANSACTIONS')}
            >
              Transactions
            </Button>
            <Button 
              size="sm" 
              variant={typeFilter === 'BILLS' ? 'secondary' : 'ghost'} 
              className={cn("h-7 px-3 text-xs", typeFilter === 'BILLS' && "shadow-sm")}
              onClick={() => setTypeFilter('BILLS')}
            >
              Bills & Subs
            </Button>
          </div>
          <Select value={flowTypeFilter} onValueChange={(val: any) => setFlowTypeFilter(val)}>
            <SelectTrigger className="w-[110px] h-9">
              <SelectValue placeholder="Flow Type">
                {flowTypeFilter === 'ALL' ? 'All Flows' : 
                 flowTypeFilter === 'INCOME' ? 'Income' : 
                 flowTypeFilter === 'EXPENSE' ? 'Expense' : flowTypeFilter}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Flows</SelectItem>
              <SelectItem value="INCOME">Income</SelectItem>
              <SelectItem value="EXPENSE">Expense</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryIdFilter} onValueChange={(val: any) => setCategoryIdFilter(val)}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Category">
                {categoryIdFilter === 'ALL' ? 'All Categories' : categories.find(c => c.id === categoryIdFilter)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden glass border-border/50">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-foreground w-40">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={handleToday} className="mr-2">
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 border-b border-border/50 bg-muted/20">
          {weekDays.map((day) => (
            <div key={day} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 grid grid-cols-7 grid-rows-5 md:grid-rows-auto overflow-y-auto">
          {days.map((day, idx) => {
            const dayEvents = getEventsForDay(day);
            const cellData = renderCellData(day, dayEvents);
            
            return (
              <div
                key={day.toISOString()}
                onClick={() => {
                  setSelectedDay(day);
                  setDrawerOpen(true);
                }}
                className={cn(
                  "min-h-[100px] border-b border-r border-border/30 p-2 cursor-pointer transition-colors relative flex flex-col gap-1",
                  !isSameMonth(day, monthStart) ? "bg-muted/10 opacity-60" : "bg-card/30 hover:bg-accent/40",
                  isToday(day) && "ring-1 ring-inset ring-primary bg-primary/5",
                  cellData?.tintClass,
                  idx % 7 === 6 && "border-r-0"
                )}
              >
                <div className="flex justify-between items-start">
                  <span className={cn(
                    "text-sm font-semibold flex h-6 w-6 items-center justify-center rounded-full",
                    isToday(day) ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  )}>
                    {format(day, dateFormat)}
                  </span>
                  
                  {/* Indicators for bills/subs */}
                  {cellData && cellData.billsAndSubs.length > 0 && (
                    <div className="flex -space-x-1">
                      {cellData.billsAndSubs.slice(0, 3).map((b, i) => (
                        <div 
                          key={i} 
                          className="h-2 w-2 rounded-full ring-1 ring-background" 
                          style={{ backgroundColor: b.color || '#f59e0b' }} 
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-end gap-1 mt-2">
                  {cellData && cellData.income > 0 && (
                    <div className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded truncate">
                      +{formatCurrency(cellData.income, 'INR')}
                    </div>
                  )}
                  {cellData && cellData.expense > 0 && (
                    <div className="text-[10px] font-semibold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded truncate">
                      -{formatCurrency(cellData.expense, 'INR')}
                    </div>
                  )}
                  {cellData && cellData.billsAndSubs.length > 0 && (
                    <div className="text-[9px] text-muted-foreground font-medium truncate mt-0.5">
                      {cellData.billsAndSubs.length} bill{cellData.billsAndSubs.length > 1 ? 's' : ''} due
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Day Details Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          {selectedDay && (
            <>
              <SheetHeader className="p-6 border-b border-border/50 bg-muted/20">
                <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  {format(selectedDay, 'MMMM d, yyyy')}
                </SheetTitle>
                <SheetDescription>
                  {isToday(selectedDay) ? "Today's financial overview" : "Financial overview for this day"}
                </SheetDescription>
              </SheetHeader>
              
              <ScrollArea className="flex-1 p-6">
                {(() => {
                  const dayEvents = getEventsForDay(selectedDay);
                  if (dayEvents.length === 0) {
                    return (
                      <div className="text-center py-12 text-muted-foreground">
                        <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>No transactions or bills for this day.</p>
                      </div>
                    );
                  }

                  const transactions = dayEvents.filter(e => e.type === 'TRANSACTION');
                  const bills = dayEvents.filter(e => e.type !== 'TRANSACTION');

                  return (
                    <div className="space-y-6">
                      {/* Summary Metrics */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                          <p className="text-xs font-semibold text-emerald-600 uppercase mb-1">Total In</p>
                          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(dayEvents.reduce((acc, e) => e.flowType === 'INCOME' ? acc + e.amount : acc, 0), 'INR')}
                          </p>
                        </div>
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
                          <p className="text-xs font-semibold text-rose-600 uppercase mb-1">Total Out</p>
                          <p className="text-xl font-bold text-rose-700 dark:text-rose-400">
                            {formatCurrency(dayEvents.reduce((acc, e) => e.flowType === 'EXPENSE' ? acc + e.amount : acc, 0), 'INR')}
                          </p>
                        </div>
                      </div>

                      {/* Scheduled Bills & Subs */}
                      {bills.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Repeat className="h-4 w-4 text-primary" />
                            Scheduled & Due
                          </h3>
                          <div className="space-y-2">
                            {bills.map(bill => (
                              <div key={bill.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card">
                                <div className="flex items-center gap-3">
                                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: bill.color || '#f59e0b' }} />
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">{bill.title}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase">{bill.type}</p>
                                  </div>
                                </div>
                                <span className={cn(
                                  "font-bold text-sm",
                                  bill.flowType === 'INCOME' ? "text-emerald-500" : "text-rose-500"
                                )}>
                                  {bill.flowType === 'INCOME' ? '+' : '-'}{formatCurrency(bill.amount, 'INR')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Transactions */}
                      {transactions.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Tag className="h-4 w-4 text-primary" />
                            Transactions
                          </h3>
                          <div className="space-y-2">
                            {transactions.map(tx => (
                              <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card">
                                <div className="min-w-0 flex-1 mr-4">
                                  <p className="text-sm font-semibold text-foreground truncate">{tx.title}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {tx.data.account?.name} {tx.data.category ? `• ${tx.data.category.name}` : ''}
                                  </p>
                                </div>
                                <span className={cn(
                                  "font-bold text-sm shrink-0",
                                  tx.flowType === 'INCOME' ? "text-emerald-500" : 
                                  tx.flowType === 'EXPENSE' ? "text-rose-500" : "text-muted-foreground"
                                )}>
                                  {tx.flowType === 'INCOME' ? '+' : tx.flowType === 'EXPENSE' ? '-' : ''}
                                  {formatCurrency(tx.amount, 'INR')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

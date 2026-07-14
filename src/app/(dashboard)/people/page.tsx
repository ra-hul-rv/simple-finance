'use client';

import { useEffect, useState, useTransition } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
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
import { Plus, Users, Mail, Phone, Edit2, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';

interface Person {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

export default function PeoplePage() {
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPeople();
  }, []);

  const fetchPeople = async () => {
    try {
      const res = await fetch('/api/people');
      if (res.ok) {
        const data = await res.json();
        setPeople(data);
      }
    } catch (error) {
      console.error('Failed to fetch people', error);
      toast.error('Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (person?: Person) => {
    if (person) {
      setEditingId(person.id);
      setName(person.name);
      setEmail(person.email || '');
      setPhone(person.phone || '');
      setNotes(person.notes || '');
    } else {
      setEditingId(null);
      setName('');
      setEmail('');
      setPhone('');
      setNotes('');
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    startTransition(async () => {
      try {
        const url = editingId ? `/api/people/${editingId}` : '/api/people';
        const method = editingId ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone, notes }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || 'Failed to save');
        }

        toast.success(editingId ? 'Contact updated' : 'Contact created');
        setIsDialogOpen(false);
        fetchPeople();
      } catch (error: any) {
        toast.error(error.message || 'Failed to save contact');
      }
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/people/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      
      toast.success('Contact deleted');
      setDeleteId(null);
      fetchPeople();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete contact');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="People & Contacts" 
          description="Manage your friends, family, and financial contacts"
        />
        <Button onClick={() => handleOpenDialog()} className="rounded-xl shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Add Contact
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : people.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center text-center p-12 bg-card rounded-2xl border border-border shadow-sm">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No contacts yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Add people to track who you are lending money to, or paying EMIs for.
            </p>
            <Button onClick={() => handleOpenDialog()}>Add Contact</Button>
          </div>
        ) : (
          people.map((person) => (
            <Card key={person.id} className="group overflow-hidden rounded-2xl border-border/60 hover:shadow-md hover:border-primary/20 transition-all duration-300">
              <CardContent className="p-0">
                <div 
                  className="p-5 cursor-pointer relative"
                  onClick={() => router.push(`/people/${person.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-lg">
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-base line-clamp-1 group-hover:text-primary transition-colors">{person.name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          View profile <ArrowRight className="h-3 w-3" />
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-muted-foreground mt-4 border-t border-border/40 pt-4">
                    {person.email ? (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{person.email}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground/50">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span>No email</span>
                      </div>
                    )}
                    
                    {person.phone ? (
                      <div className="flex items-center gap-2 truncate">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{person.phone}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground/50">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>No phone</span>
                      </div>
                    )}
                  </div>

                  <div className="absolute top-4 right-4 flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => handleOpenDialog(person)}
                      className="h-8 w-8 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => setDeleteId(person.id)}
                      className="h-8 w-8 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-border/40 rounded-2xl">
          <div className="p-6 pb-4 border-b border-border/40 bg-muted/10">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {editingId ? 'Edit Contact' : 'Add New Contact'}
              </DialogTitle>
              <DialogDescription>
                Store details for friends or family you share expenses with.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Full Name *</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="John Doe"
                className="bg-background/50 h-11"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Email (Optional)</Label>
                <Input 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="john@example.com"
                  type="email"
                  className="bg-background/50 h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Phone (Optional)</Label>
                <Input 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="+1 234 567 890"
                  className="bg-background/50 h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Notes (Optional)</Label>
              <Textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                placeholder="Any additional info..."
                className="bg-background/50 min-h-[100px] resize-none"
              />
            </div>
          </div>
          <DialogFooter className="p-6 pt-4 border-t border-border/40 bg-muted/10">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isPending} className="rounded-xl h-11">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending} className="rounded-xl h-11 px-6 shadow-md">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? 'Save Changes' : 'Create Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Contact"
        description="Are you sure you want to delete this person? Their associated loans and EMIs will be deleted. Standard transactions linked to them will remain in your ledger but the link to the person will be lost. This cannot be undone."
        confirmLabel="Delete Person"
        variant="destructive"
        loading={isPending}
      />
    </div>
  );
}

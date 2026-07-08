import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Category {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
}

interface CategorySelectorProps {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
  typeFilter: 'INCOME' | 'EXPENSE' | 'ALL';
  disabled?: boolean;
}

export function CategorySelector({
  categories,
  value,
  onChange,
  typeFilter,
  disabled = false,
}: CategorySelectorProps) {
  const [rootId, setRootId] = useState<string>('NONE');
  const [sub1Id, setSub1Id] = useState<string>('NONE');
  const [sub2Id, setSub2Id] = useState<string>('NONE');

  // Derive initial hierarchy based on the incoming `value` (the selected category ID)
  useEffect(() => {
    if (!value || value === 'NONE') {
      setRootId('NONE');
      setSub1Id('NONE');
      setSub2Id('NONE');
      return;
    }

    const selectedCategory = categories.find((c) => c.id === value);
    if (!selectedCategory) return;

    if (!selectedCategory.parentId) {
      // It is a root category
      setRootId(selectedCategory.id);
      setSub1Id('NONE');
      setSub2Id('NONE');
    } else {
      const parent = categories.find((c) => c.id === selectedCategory.parentId);
      if (parent && !parent.parentId) {
        // It is a sub1 category
        setRootId(parent.id);
        setSub1Id(selectedCategory.id);
        setSub2Id('NONE');
      } else if (parent && parent.parentId) {
        // It is a sub2 category
        setRootId(parent.parentId);
        setSub1Id(parent.id);
        setSub2Id(selectedCategory.id);
      }
    }
  }, [value, categories]);

  const filteredRoots = categories.filter(
    (c) => !c.parentId && (typeFilter === 'ALL' || c.type === typeFilter)
  );
  
  const filteredSub1 = rootId !== 'NONE'
    ? categories.filter((c) => c.parentId === rootId)
    : [];

  const filteredSub2 = sub1Id !== 'NONE'
    ? categories.filter((c) => c.parentId === sub1Id)
    : [];

  const handleRootChange = (newRoot: string | null) => {
    const val = newRoot || 'NONE';
    setRootId(val);
    setSub1Id('NONE');
    setSub2Id('NONE');
    onChange(val === 'NONE' ? '' : val);
  };

  const handleSub1Change = (newSub1: string | null) => {
    const val = newSub1 || 'NONE';
    setSub1Id(val);
    setSub2Id('NONE');
    onChange(val === 'NONE' ? rootId : val);
  };

  const handleSub2Change = (newSub2: string | null) => {
    const val = newSub2 || 'NONE';
    setSub2Id(val);
    onChange(val === 'NONE' ? sub1Id : val);
  };

  return (
    <div className="space-y-3 w-full">
      {/* Root Category */}
      <div className="space-y-1.5 w-full">
        <Label className="label-uppercase text-muted-foreground">Category</Label>
        <Select value={rootId} onValueChange={handleRootChange} disabled={disabled}>
          <SelectTrigger className="bg-background w-full">
            <SelectValue placeholder="Select Category">
              {rootId === 'NONE' ? 'No Category' : categories.find(c => c.id === rootId)?.name || 'Select Category'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">No Category</SelectItem>
            {filteredRoots.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sub Level 1 */}
      {rootId !== 'NONE' && filteredSub1.length > 0 && (
        <div className="space-y-1.5 ml-4 border-l-2 border-primary/20 pl-4 animate-in fade-in slide-in-from-top-2 w-[calc(100%-1rem)]">
          <Label className="label-uppercase text-muted-foreground">Subcategory</Label>
          <Select value={sub1Id} onValueChange={handleSub1Change} disabled={disabled}>
            <SelectTrigger className="bg-background w-full">
              <SelectValue placeholder="Select Subcategory">
                {sub1Id === 'NONE' ? 'None' : categories.find(c => c.id === sub1Id)?.name || 'Select Subcategory'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">None</SelectItem>
              {filteredSub1.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Sub Level 2 */}
      {sub1Id !== 'NONE' && filteredSub2.length > 0 && (
        <div className="space-y-1.5 ml-8 border-l-2 border-primary/20 pl-4 animate-in fade-in slide-in-from-top-2 w-[calc(100%-2rem)]">
          <Label className="label-uppercase text-muted-foreground">Detailed Category</Label>
          <Select value={sub2Id} onValueChange={handleSub2Change} disabled={disabled}>
            <SelectTrigger className="bg-background w-full">
              <SelectValue placeholder="Select Detail">
                {sub2Id === 'NONE' ? 'None' : categories.find(c => c.id === sub2Id)?.name || 'Select Detail'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">None</SelectItem>
              {filteredSub2.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

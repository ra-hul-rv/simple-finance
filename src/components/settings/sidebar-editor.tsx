'use client';

import { useState, useTransition } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GripVertical, Eye, EyeOff, RotateCcw, LayoutDashboard, ChevronDown, ChevronRight, Edit2, Check, X, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export type SidebarItemNode = {
  id: string;
  title: string | null;
  isHidden: boolean;
};

export type SidebarSectionNode = {
  id: string;
  title: string | null;
  isCollapsed: boolean;
  items: SidebarItemNode[];
};

export type SidebarLayout = {
  version: number;
  sections: SidebarSectionNode[];
};

export const DEFAULT_SIDEBAR_LAYOUT: SidebarLayout = {
  version: 1,
  sections: [
    {
      id: 'overview',
      title: 'Overview',
      isCollapsed: false,
      items: [
        { id: 'dashboard', title: null, isHidden: false },
        { id: 'inbox', title: null, isHidden: false },
        { id: 'accounts', title: null, isHidden: false },
        { id: 'transactions', title: null, isHidden: false },
        { id: 'income', title: null, isHidden: false },
        { id: 'categories', title: null, isHidden: false },
        { id: 'people', title: null, isHidden: false },
      ]
    },
    {
      id: 'finance',
      title: 'Finance',
      isCollapsed: false,
      items: [
        { id: 'budgets', title: null, isHidden: false },
        { id: 'recurring', title: null, isHidden: false },
        { id: 'groups', title: null, isHidden: false },
        { id: 'fixed-deposits', title: null, isHidden: false },
        { id: 'investments', title: null, isHidden: false },
        { id: 'lending', title: null, isHidden: false },
        { id: 'shopping', title: null, isHidden: false },
        { id: 'vault', title: null, isHidden: false },
        { id: 'automations', title: null, isHidden: false },
      ]
    },
    {
      id: 'insights',
      title: 'Insights',
      isCollapsed: false,
      items: [
        { id: 'calendar', title: null, isHidden: false },
        { id: 'analytics', title: null, isHidden: false },
        { id: 'reports', title: null, isHidden: false },
      ]
    }
  ]
};

// --- SORTABLE ITEM COMPONENT ---
function SortableItem({
  item,
  isEditing,
  editValue,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
  onToggleHide,
}: {
  item: SidebarItemNode;
  isEditing: boolean;
  editValue: string;
  onEditStart: () => void;
  onEditChange: (val: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onToggleHide: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, data: { type: 'item', item } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const displayName = item.title || item.id.charAt(0).toUpperCase() + item.id.slice(1).replace(/-/g, ' ');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center justify-between p-2 mb-1 rounded-lg border border-border/50 bg-background/50 text-sm transition-colors ${
        item.isHidden ? 'opacity-50 line-through' : ''
      }`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div {...attributes} {...listeners} className="cursor-grab hover:text-primary text-muted-foreground p-1">
          <GripVertical className="h-4 w-4" />
        </div>
        
        {isEditing ? (
          <div className="flex items-center gap-1 flex-1">
            <Input 
              value={editValue} 
              onChange={e => onEditChange(e.target.value)} 
              className="h-7 text-xs px-2" 
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') onEditSave();
                if (e.key === 'Escape') onEditCancel();
              }}
            />
            <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-500" onClick={onEditSave}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onEditCancel}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex-1 truncate select-none cursor-pointer" onDoubleClick={onEditStart}>
            {displayName}
            {item.title && <span className="text-[10px] ml-2 text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase tracking-wider">Custom</span>}
          </div>
        )}
      </div>

      {!isEditing && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEditStart}>
            <Edit2 className="h-3 w-3 text-muted-foreground" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onToggleHide}>
            {item.isHidden ? <Eye className="h-3 w-3 text-muted-foreground" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
          </Button>
        </div>
      )}
    </div>
  );
}

// --- SORTABLE SECTION COMPONENT ---
function SortableSection({
  section,
  isEditing,
  editValue,
  editingItemId,
  editItemValue,
  showHidden,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
  onToggleCollapse,
  onItemEditStart,
  onItemEditChange,
  onItemEditSave,
  onItemEditCancel,
  onItemToggleHide,
  onDeleteSection,
}: {
  section: SidebarSectionNode;
  isEditing: boolean;
  editValue: string;
  editingItemId: string | null;
  editItemValue: string;
  showHidden: boolean;
  onEditStart: () => void;
  onEditChange: (val: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onToggleCollapse: () => void;
  onItemEditStart: (id: string) => void;
  onItemEditChange: (val: string) => void;
  onItemEditSave: (id: string) => void;
  onItemEditCancel: () => void;
  onItemToggleHide: (id: string) => void;
  onDeleteSection: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id, data: { type: 'section', section } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const visibleItems = showHidden ? section.items : section.items.filter(i => !i.isHidden);
  const itemIds = visibleItems.map(i => i.id);

  return (
    <div ref={setNodeRef} style={style} className="mb-4 bg-card/50 rounded-xl border border-border/50 overflow-hidden">
      {/* SECTION HEADER */}
      <div className="flex items-center gap-2 p-3 bg-muted/30 group">
        <div {...attributes} {...listeners} className="cursor-grab hover:text-primary text-muted-foreground p-1">
          <GripVertical className="h-4 w-4" />
        </div>
        
        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={onToggleCollapse}>
          {section.isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {isEditing ? (
          <div className="flex items-center gap-1 flex-1">
            <Input 
              value={editValue} 
              onChange={e => onEditChange(e.target.value)} 
              className="h-7 text-xs px-2" 
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') onEditSave();
                if (e.key === 'Escape') onEditCancel();
              }}
            />
            <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-500" onClick={onEditSave}>
              <Check className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex-1 font-semibold text-sm uppercase tracking-wider select-none cursor-pointer" onDoubleClick={onEditStart}>
            {section.title || section.id}
          </div>
        )}
        
        {!isEditing && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEditStart}>
              <Edit2 className="h-3 w-3 text-muted-foreground" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" onClick={onDeleteSection}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* SECTION ITEMS */}
      {!section.isCollapsed && (
        <div className="p-2 min-h-[40px]">
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            {visibleItems.map(item => (
              <SortableItem
                key={item.id}
                item={item}
                isEditing={editingItemId === item.id}
                editValue={editItemValue}
                onEditStart={() => onItemEditStart(item.id)}
                onEditChange={onItemEditChange}
                onEditSave={() => onItemEditSave(item.id)}
                onEditCancel={onItemEditCancel}
                onToggleHide={() => onItemToggleHide(item.id)}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  );
}

// --- MAIN COMPONENT ---
export function SidebarEditor({ layout, onApplyLayout }: { layout: string | null; onApplyLayout: (newLayoutString: string) => Promise<void> }) {
  const [isPending, startTransition] = useTransition();
  const [activeLayout, setActiveLayout] = useState<SidebarLayout>(() => {
    if (layout) {
      try { return JSON.parse(layout) as SidebarLayout; } catch (e) {}
    }
    return DEFAULT_SIDEBAR_LAYOUT;
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'section' | 'item' | null>(null);
  const [showHidden, setShowHidden] = useState(false);

  // Editing state
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setActiveType(event.active.data.current?.type);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      setActiveType(null);
      return;
    }

    if (active.id !== over.id) {
      const activeTypeStr = active.data.current?.type;
      const overTypeStr = over.data.current?.type;
      
      setActiveLayout((prev) => {
        const newLayout = JSON.parse(JSON.stringify(prev)) as SidebarLayout;

        if (activeTypeStr === 'section' && overTypeStr === 'section') {
          const oldIndex = newLayout.sections.findIndex(s => s.id === active.id);
          const newIndex = newLayout.sections.findIndex(s => s.id === over.id);
          newLayout.sections = arrayMove(newLayout.sections, oldIndex, newIndex);
        } else if (activeTypeStr === 'item') {
          // Find source and destination sections/indices
          let sourceSectionIndex = -1;
          let sourceItemIndex = -1;
          let destSectionIndex = -1;
          let destItemIndex = -1;

          newLayout.sections.forEach((sec, sIdx) => {
            const iIdx = sec.items.findIndex(i => i.id === active.id);
            if (iIdx !== -1) {
              sourceSectionIndex = sIdx;
              sourceItemIndex = iIdx;
            }
          });

          if (overTypeStr === 'item') {
            newLayout.sections.forEach((sec, sIdx) => {
              const iIdx = sec.items.findIndex(i => i.id === over.id);
              if (iIdx !== -1) {
                destSectionIndex = sIdx;
                destItemIndex = iIdx;
              }
            });
          } else if (overTypeStr === 'section') {
            destSectionIndex = newLayout.sections.findIndex(s => s.id === over.id);
            destItemIndex = newLayout.sections[destSectionIndex].items.length;
          }

          if (sourceSectionIndex !== -1 && destSectionIndex !== -1) {
            const itemToMove = newLayout.sections[sourceSectionIndex].items[sourceItemIndex];
            newLayout.sections[sourceSectionIndex].items.splice(sourceItemIndex, 1);
            newLayout.sections[destSectionIndex].items.splice(destItemIndex, 0, itemToMove);
          }
        }
        return newLayout;
      });
    }

    setActiveId(null);
    setActiveType(null);
  };

  const handleSaveToServer = () => {
    startTransition(async () => {
      try {
        const layoutString = JSON.stringify(activeLayout);
        await onApplyLayout(layoutString);
        
        localStorage.setItem('sf_sidebar_layout', layoutString);
        window.dispatchEvent(new Event('sf_sidebar_updated'));
        
        toast.success('Sidebar layout saved successfully');
      } catch (err: any) {
        toast.error(err.message || 'Failed to save layout');
      }
    });
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset your sidebar to the default layout?')) {
      setActiveLayout(DEFAULT_SIDEBAR_LAYOUT);
    }
  };

  const sectionIds = activeLayout.sections.map(s => s.id);

  return (
    <Card className="glass border-border bg-card/60 backdrop-blur-xl">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-amber-500" />
              Customize Sidebar
            </CardTitle>
            <CardDescription>Drag and drop to rearrange your workspace. Double-click to rename.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              const id = `section_${Date.now()}`;
              setActiveLayout(prev => ({
                ...prev,
                sections: [...prev.sections, { id, title: 'New Section', isCollapsed: false, items: [] }]
              }));
              setEditingSectionId(id);
              setEditValue('New Section');
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowHidden(!showHidden)}>
              {showHidden ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showHidden ? 'Hide Hidden' : 'View Hidden'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="bg-background/30 rounded-xl p-4 m-6 mt-0 border border-border/50">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
            {activeLayout.sections.map(section => (
              <SortableSection
                key={section.id}
                section={section}
                isEditing={editingSectionId === section.id}
                editValue={editValue}
                editingItemId={editingItemId}
                editItemValue={editValue}
                showHidden={showHidden}
                onEditStart={() => {
                  setEditingSectionId(section.id);
                  setEditValue(section.title || section.id);
                  setEditingItemId(null);
                }}
                onEditChange={setEditValue}
                onEditSave={() => {
                  setActiveLayout(prev => {
                    const next = { ...prev };
                    const sec = next.sections.find(s => s.id === section.id);
                    if (sec) sec.title = editValue.trim() || null;
                    return next;
                  });
                  setEditingSectionId(null);
                }}
                onEditCancel={() => setEditingSectionId(null)}
                onToggleCollapse={() => {
                  setActiveLayout(prev => {
                    const next = { ...prev };
                    const sec = next.sections.find(s => s.id === section.id);
                    if (sec) sec.isCollapsed = !sec.isCollapsed;
                    return next;
                  });
                }}
                onItemEditStart={(itemId) => {
                  setEditingItemId(itemId);
                  const item = section.items.find(i => i.id === itemId);
                  setEditValue(item?.title || item?.id || '');
                  setEditingSectionId(null);
                }}
                onItemEditChange={setEditValue}
                onItemEditSave={(itemId) => {
                  setActiveLayout(prev => {
                    const next = JSON.parse(JSON.stringify(prev)) as SidebarLayout;
                    for (const s of next.sections) {
                      const i = s.items.find(it => it.id === itemId);
                      if (i) {
                        i.title = editValue.trim() || null;
                        break;
                      }
                    }
                    return next;
                  });
                  setEditingItemId(null);
                }}
                onItemEditCancel={() => setEditingItemId(null)}
                onItemToggleHide={(itemId) => {
                  setActiveLayout(prev => {
                    const next = JSON.parse(JSON.stringify(prev)) as SidebarLayout;
                    for (const s of next.sections) {
                      const i = s.items.find(it => it.id === itemId);
                      if (i) {
                        i.isHidden = !i.isHidden;
                        break;
                      }
                    }
                    return next;
                  });
                }}
                onDeleteSection={() => {
                  setActiveLayout(prev => {
                    if (prev.sections.length <= 1) return prev; // Don't delete the last section
                    const next = JSON.parse(JSON.stringify(prev)) as SidebarLayout;
                    const secIndex = next.sections.findIndex(s => s.id === section.id);
                    if (secIndex === -1) return next;
                    
                    const sec = next.sections[secIndex];
                    const targetIndex = secIndex > 0 ? secIndex - 1 : secIndex + 1;
                    
                    // Move items to adjacent section
                    next.sections[targetIndex].items.push(...sec.items);
                    
                    // Remove section
                    next.sections.splice(secIndex, 1);
                    return next;
                  });
                }}
              />
            ))}
          </SortableContext>
          
          <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
            {activeId ? (
              activeType === 'section' ? (
                <div className="bg-card border-2 border-primary rounded-xl p-3 shadow-2xl flex items-center">
                  <GripVertical className="h-4 w-4 mr-2" />
                  <span className="font-semibold uppercase tracking-wider">{activeLayout.sections.find(s => s.id === activeId)?.title || activeId}</span>
                </div>
              ) : (
                <div className="bg-card border-2 border-primary rounded-lg p-2 shadow-xl flex items-center">
                  <GripVertical className="h-4 w-4 mr-2" />
                  <span>
                    {activeLayout.sections.flatMap(s => s.items).find(i => i.id === activeId)?.title || activeId}
                  </span>
                </div>
              )
            ) : null}
          </DragOverlay>
        </DndContext>
      </CardContent>

      <CardFooter className="flex justify-between border-t border-border/50 pt-4 px-6 pb-6">
        <Button variant="outline" onClick={handleReset} className="text-muted-foreground">
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
        <Button onClick={handleSaveToServer} disabled={isPending} className="gradient-primary">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Apply Layout Changes
        </Button>
      </CardFooter>
    </Card>
  );
}

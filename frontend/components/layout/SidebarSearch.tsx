import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, Command, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface NavigationItem {
  title: string;
  href: string;
  description?: string;
  category: string;
  isNew?: boolean;
  isImportant?: boolean;
  badge?: string | number;
}

interface SidebarSearchProps {
  isOpen: boolean;
  onClose: () => void;
  navigationItems: NavigationItem[];
}

export const SidebarSearch: React.FC<SidebarSearchProps> = ({ 
  isOpen, 
  onClose, 
  navigationItems 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  // Filter navigation items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return navigationItems;
    
    const query = searchQuery.toLowerCase();
    return navigationItems.filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
  }, [searchQuery, navigationItems]);

  // Group filtered items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, NavigationItem[]> = {};
    filteredItems.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredItems.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredItems.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            handleNavigate(filteredItems[selectedIndex].href);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const handleNavigate = (href: string) => {
    router.push(href);
    onClose();
    setSearchQuery('');
  };

  const handleItemClick = (item: NavigationItem) => {
    handleNavigate(item.href);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search navigation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 p-0 text-sm placeholder:text-muted-foreground focus-visible:ring-0"
            autoFocus
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="max-h-[300px]">
          {Object.keys(groupedItems).length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {searchQuery ? `No results found for "${searchQuery}"` : 'Start typing to search...'}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="space-y-1">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {category}
                  </h4>
                  {items.map((item, index) => {
                    const globalIndex = filteredItems.indexOf(item);
                    return (
                      <div
                        key={item.href}
                        className={cn(
                          'flex items-center justify-between p-2 text-sm rounded-md cursor-pointer hover:bg-accent',
                          globalIndex === selectedIndex && 'bg-accent'
                        )}
                        onClick={() => handleItemClick(item)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.title}</span>
                            {item.isNew && (
                              <Badge variant="secondary" className="text-xs">
                                New
                              </Badge>
                            )}
                            {item.isImportant && (
                              <Badge variant="destructive" className="text-xs">
                                Important
                              </Badge>
                            )}
                            {item.badge && (
                              <Badge variant="outline" className="text-xs">
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <Command className="h-3 w-3 text-muted-foreground ml-2" />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="text-xs text-muted-foreground border-t pt-3">
          <div className="flex items-center justify-between">
            <span>Use ↑↓ to navigate</span>
            <span>Press Enter to select • Esc to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};

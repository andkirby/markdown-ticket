import React, { useState, useEffect } from 'react';
import { TocItem } from '../../utils/tableOfContents';

interface TableOfContentsProps {
  items: TocItem[];
}

export default function TableOfContents({ items }: TableOfContentsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleIds(prev => {
          const newSet = new Set(prev);
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              newSet.add(entry.target.id);
            } else {
              newSet.delete(entry.target.id);
            }
          });
          return newSet;
        });
      },
      { rootMargin: '-0% 0px -10% 0px' }
    );

    items.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3 py-2 text-sm border border-border rounded-lg bg-card/95 backdrop-blur-sm shadow-lg hover:bg-muted/50 transition-colors flex items-center gap-2"
      >
        <span>ToC</span>
        <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
          ▶
        </span>
      </button>
      
      {isExpanded && (
        <div className="absolute bottom-full right-0 mb-1 w-80 border border-border rounded-lg bg-card/95 backdrop-blur-sm shadow-lg z-50" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          <div className="px-4 py-3">
            <div className="text-sm font-medium mb-2">Table of Contents</div>
            <nav className="space-y-1">
              {items.map((item, index) => (
                <button
                  key={index}
                  onClick={() => scrollToHeading(item.id)}
                  className={`block w-full text-left text-sm transition-colors ${
                    visibleIds.has(item.id) ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                  } ${
                    item.level === 1 ? 'font-medium' : 
                    item.level === 2 ? 'pl-4' :
                    item.level === 3 ? 'pl-8' :
                    item.level === 4 ? 'pl-12' :
                    item.level === 5 ? 'pl-16' : 'pl-20'
                  }`}
                >
                  {item.text}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}

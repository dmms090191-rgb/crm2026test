import { useRef, useEffect, type ReactNode } from 'react';

interface DualScrollWrapperProps {
  children: ReactNode;
  deps?: unknown[];
}

export default function DualScrollWrapper({ children, deps = [] }: DualScrollWrapperProps) {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const topInnerRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef<'top' | 'bottom' | null>(null);

  useEffect(() => {
    const el = bottomScrollRef.current;
    if (!el) return;
    const sync = () => {
      if (topInnerRef.current) topInnerRef.current.style.width = el.scrollWidth + 'px';
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    const mo = new MutationObserver(sync);
    mo.observe(el, { childList: true, subtree: true });
    return () => { ro.disconnect(); mo.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const handleTopScroll = () => {
    if (syncingRef.current === 'bottom') { syncingRef.current = null; return; }
    syncingRef.current = 'top';
    if (bottomScrollRef.current && topScrollRef.current) {
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const handleBottomScroll = () => {
    if (syncingRef.current === 'top') { syncingRef.current = null; return; }
    syncingRef.current = 'bottom';
    if (topScrollRef.current && bottomScrollRef.current) {
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
  };

  return (
    <>
      <div
        ref={topScrollRef}
        onScroll={handleTopScroll}
        className="dual-scroll-top"
      >
        <div ref={topInnerRef} className="dual-scroll-top-inner" />
      </div>
      <div ref={bottomScrollRef} onScroll={handleBottomScroll} className="overflow-x-auto">
        {children}
      </div>
    </>
  );
}

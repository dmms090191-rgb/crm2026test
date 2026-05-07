import { useState, useRef, useCallback } from 'react';

interface UsePinInputOptions {
  onEnter?: () => void;
  onDigitEntered?: () => void;
}

export function usePinInput(options: UsePinInputOptions = {}) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const onEnterRef = useRef(options.onEnter);
  const onDigitEnteredRef = useRef(options.onDigitEntered);
  onEnterRef.current = options.onEnter;
  onDigitEnteredRef.current = options.onDigitEntered;

  const handlePinInput = useCallback((index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    if (digit) onDigitEnteredRef.current?.();
    setDigits(prev => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < 5) {
      setTimeout(() => pinRefs.current[index + 1]?.focus(), 0);
    }
  }, []);

  const handlePinKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        setDigits(prev => { const n = [...prev]; n[index] = ''; return n; });
      } else if (index > 0) {
        pinRefs.current[index - 1]?.focus();
        setDigits(prev => { const n = [...prev]; n[index - 1] = ''; return n; });
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      pinRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      pinRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      onEnterRef.current?.();
    }
  }, [digits]);

  const handlePinFocus = useCallback((index: number) => {
    pinRefs.current[index]?.select();
  }, []);

  return { digits, setDigits, pinRefs, handlePinInput, handlePinKeyDown, handlePinFocus };
}

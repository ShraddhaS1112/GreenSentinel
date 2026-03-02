/**
 * Green Sentinel - Info Tooltip Component
 *
 * Shows farmer-friendly explanations of technical terms.
 * Rendered via portal so parent transforms (framer-motion cards)
 * never cause overflow or horizontal scroll on mobile.
 */

import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { getTermExplanation } from '@/utils/farmerFriendly';
import { usePreferencesStore } from '@/stores/preferencesStore';

const TOOLTIP_WIDTH = 240;
const EDGE_MARGIN = 10;

interface InfoTooltipProps {
  term: string;
  children?: React.ReactNode;
  /** position prop kept for API compat but layout is now auto-calculated */
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md';
}

export default function InfoTooltip({
  term,
  children,
  size = 'sm',
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);
  const { language } = usePreferencesStore();

  const explanation = getTermExplanation(term, language);
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  const openTooltip = useCallback(() => {
    if (!btnRef.current) {
      setIsOpen(v => !v);
      return;
    }
    const rect = btnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;

    // Center the tooltip on the button, then clamp to viewport
    const idealLeft = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
    const clampedLeft = Math.max(EDGE_MARGIN, Math.min(idealLeft, vw - TOOLTIP_WIDTH - EDGE_MARGIN));

    // Place above the button by default; flip below if not enough space
    const spaceAbove = rect.top;
    const placeBelow = spaceAbove < 90;

    setTooltipStyle({
      position: 'fixed',
      left: clampedLeft,
      top: placeBelow ? rect.bottom + 8 : rect.top - 8,
      transform: placeBelow ? 'none' : 'translateY(-100%)',
      width: TOOLTIP_WIDTH,
      zIndex: 9999,
    });
    setIsOpen(v => !v);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  return (
    <span className="relative inline-flex items-center">
      {children && <span className="mr-1">{children}</span>}
      <button
        ref={btnRef}
        onClick={openTooltip}
        onBlur={() => setTimeout(close, 150)}
        className={`${iconSize} text-slate-400 hover:text-slate-600 transition-colors focus:outline-none flex-shrink-0`}
        aria-label={`Info about ${explanation.simple}`}
      >
        <Info className="w-full h-full" />
      </button>

      {isOpen && createPortal(
        <>
          {/* Invisible backdrop — closes tooltip on tap outside */}
          <div className="fixed inset-0 z-[9998]" onClick={close} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.12 }}
            style={tooltipStyle}
          >
            <div className="bg-slate-800 text-white rounded-xl shadow-xl p-3 break-words">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="font-semibold text-green-400 text-sm leading-snug">
                  {explanation.simple}
                </span>
                <button
                  onClick={close}
                  className="text-slate-400 hover:text-white flex-shrink-0 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {explanation.detail}
              </p>
            </div>
          </motion.div>
        </>,
        document.body
      )}
    </span>
  );
}

/**
 * Inline explanation component for labels
 */
export function ExplainedLabel({
  term,
  label,
  className = '',
}: {
  term: string;
  label?: string;
  className?: string;
}) {
  const { language } = usePreferencesStore();
  const explanation = getTermExplanation(term, language);

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span>{label || explanation.simple}</span>
      <InfoTooltip term={term} size="sm" />
    </span>
  );
}

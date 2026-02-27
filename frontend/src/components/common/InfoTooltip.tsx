/**
 * Green Sentinel - Info Tooltip Component
 *
 * Shows farmer-friendly explanations of technical terms.
 * Click or tap to see what technical metrics mean.
 */

import { useState } from 'react';
import { Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTermExplanation } from '@/utils/farmerFriendly';
import { usePreferencesStore } from '@/stores/preferencesStore';

interface InfoTooltipProps {
  term: string;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md';
}

export default function InfoTooltip({
  term,
  children,
  position = 'top',
  size = 'sm',
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { language } = usePreferencesStore();

  const explanation = getTermExplanation(term, language);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-slate-800',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-slate-800',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-slate-800',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-slate-800',
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <span className="relative inline-flex items-center">
      {children && <span className="mr-1">{children}</span>}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        className={`${iconSize} text-slate-400 hover:text-slate-600 transition-colors focus:outline-none`}
        aria-label={`Info about ${explanation.simple}`}
      >
        <Info className="w-full h-full" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 ${positionClasses[position]}`}
          >
            <div className="bg-slate-800 text-white rounded-lg shadow-lg p-3 w-64 text-left">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-semibold text-green-400">{explanation.simple}</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-white p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {explanation.detail}
              </p>
            </div>
            {/* Arrow */}
            <div className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

/**
 * Inline explanation component for labels
 * Shows simple term with info button
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

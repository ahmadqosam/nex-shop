import React from 'react';
import { Zap } from 'lucide-react';

interface FlashSaleBadgeProps {
  className?: string;
  showIcon?: boolean;
}

const FlashSaleBadge: React.FC<FlashSaleBadgeProps> = ({ className = '', showIcon = true }) => {
  return (
    <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-600 text-white text-xs font-bold uppercase tracking-wider shadow-sm ${className}`}>
      {showIcon && <Zap size={12} fill="currentColor" />}
      <span>Flash Sale</span>
    </div>
  );
};

export default FlashSaleBadge;

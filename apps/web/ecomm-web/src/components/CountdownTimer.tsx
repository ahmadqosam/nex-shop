'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface CountdownTimerProps {
  endTime: string;
  onExpired?: () => void;
  mode?: 'compact' | 'full';
  className?: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ 
  endTime, 
  onExpired, 
  mode = 'compact',
  className = ''
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  const calculateTimeLeft = useCallback(() => {
    const end = new Date(endTime);
    if (isNaN(end.getTime())) {
      return null;
    }
    
    const difference = end.getTime() - new Date().getTime();
    
    if (difference <= 0) {
      if (onExpired) onExpired();
      return null;
    }

    return {
      hours: Math.floor((difference / (1000 * 60 * 60))),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }, [endTime, onExpired]);

  useEffect(() => {
    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (!remaining) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  if (!timeLeft) return null;

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  if (mode === 'compact') {
    return (
      <div className={`text-xs font-medium text-red-600 ${className}`}>
        Ends in: {formatNumber(timeLeft.hours)}:{formatNumber(timeLeft.minutes)}:{formatNumber(timeLeft.seconds)}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex flex-col items-center">
        <div className="bg-red-600 text-white rounded-md w-12 h-12 flex items-center justify-center text-xl font-bold">
          {formatNumber(timeLeft.hours)}
        </div>
        <span className="text-[10px] uppercase font-semibold text-secondary mt-1">Hrs</span>
      </div>
      <span className="text-xl font-bold text-red-600 -mt-4">:</span>
      <div className="flex flex-col items-center">
        <div className="bg-red-600 text-white rounded-md w-12 h-12 flex items-center justify-center text-xl font-bold">
          {formatNumber(timeLeft.minutes)}
        </div>
        <span className="text-[10px] uppercase font-semibold text-secondary mt-1">Min</span>
      </div>
      <span className="text-xl font-bold text-red-600 -mt-4">:</span>
      <div className="flex flex-col items-center">
        <div className="bg-red-600 text-white rounded-md w-12 h-12 flex items-center justify-center text-xl font-bold">
          {formatNumber(timeLeft.seconds)}
        </div>
        <span className="text-[10px] uppercase font-semibold text-secondary mt-1">Sec</span>
      </div>
    </div>
  );
};

export default CountdownTimer;

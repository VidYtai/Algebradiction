import React from 'react';

interface LoadingSpinnerProps {
  heading: string;
  subheading: string;
  compact?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ heading, subheading, compact = false }) => {
  return (
    <div className={`flex flex-col justify-center items-center ${compact ? 'p-2 my-1' : 'p-4 sm:p-6 my-4'}`} aria-live="polite" aria-busy="true">
      <div className={`${compact ? 'w-8 h-8 border-2' : 'w-12 h-12 sm:w-16 sm:h-16 border-4'} border-dashed rounded-full animate-spin border-sky-500`}>
        <div className={`w-full h-full rounded-full border-dashed animate-spin-reverse border-sky-300 opacity-75 ${compact ? 'border-2' : 'border-4'}`}></div>
      </div>
      <p className={`font-semibold text-sky-300 tracking-wider text-center ${compact ? 'mt-2 text-sm' : 'mt-3 sm:mt-4 text-base sm:text-lg md:text-xl'}`}>{heading}</p>
      <p className={`text-slate-400 text-center ${compact ? 'text-xs' : 'text-xs sm:text-sm'}`}>{subheading}</p>
    </div>
  );
};

export default LoadingSpinner;
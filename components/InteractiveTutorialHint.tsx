import React, { useEffect, useState, useRef } from 'react';
import { TutorialStep } from '../types';

interface InteractiveTutorialHintProps {
  tutorialId: TutorialStep;
  isActive: boolean;
  targetSelector: string | (() => HTMLElement | null | undefined); 
  title?: string;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  onDismiss: (tutorialId: TutorialStep) => void;
  highlightTarget?: boolean;
  nextButtonText?: string;
  showSkipAllButton?: boolean;
  onSkipAll?: () => void;
  overlayClassName?: string; 
  onVisibilityChange?: (tutorialId: TutorialStep, isVisible: boolean) => void;
}

const InteractiveTutorialHint: React.FC<InteractiveTutorialHintProps> = ({
  tutorialId,
  isActive,
  targetSelector,
  title,
  text,
  position = 'bottom',
  onDismiss,
  highlightTarget = true,
  nextButtonText = 'Got it',
  showSkipAllButton = false,
  onSkipAll,
  overlayClassName, 
  onVisibilityChange,
}) => {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [hintPosition, setHintPosition] = useState<React.CSSProperties>({});
  const hintRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false); 
  const isVisibleRef = useRef(isVisible); // Ref to track isVisible for cleanup

  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  useEffect(() => {
    let element: HTMLElement | null | undefined = null;
    if (typeof targetSelector === 'string') {
      element = document.querySelector(targetSelector);
    } else if (typeof targetSelector === 'function') {
      element = targetSelector();
    }
    setTargetElement(element || null);

    if (isActive && (element || position === 'center')) {
      if (element && highlightTarget) {
        element.style.position = 'relative'; 
        element.style.zIndex = '10001'; 
        element.classList.add('tutorial-highlight-target');
      }

      const targetRect = element ? element.getBoundingClientRect() : { top: 0, left: 0, width: 0, height: 0, bottom:0, right: 0 };
      const hintBubbleWidth = Math.min(300, window.innerWidth - 32); 
      const hintBubbleHeightEstimate = hintRef.current?.offsetHeight || (title ? 150 : 120); 
      const offset = 10;

      let top = 0, left = 0;

      switch (position) {
        case 'top':
          top = targetRect.top - hintBubbleHeightEstimate - offset;
          left = targetRect.left + (targetRect.width / 2) - (hintBubbleWidth / 2);
          break;
        case 'bottom':
          top = targetRect.bottom + offset;
          left = targetRect.left + (targetRect.width / 2) - (hintBubbleWidth / 2);
          break;
        case 'left':
          top = targetRect.top + (targetRect.height / 2) - (hintBubbleHeightEstimate / 2);
          left = targetRect.left - hintBubbleWidth - offset;
          break;
        case 'right':
          top = targetRect.top + (targetRect.height / 2) - (hintBubbleHeightEstimate / 2);
          left = targetRect.right + offset;
          break;
        case 'top-left':
          top = targetRect.top - hintBubbleHeightEstimate - offset;
          left = targetRect.left;
          break;
        case 'top-right':
          top = targetRect.top - hintBubbleHeightEstimate - offset;
          left = targetRect.right - hintBubbleWidth;
          break;
        case 'bottom-left':
          top = targetRect.bottom + offset;
          left = targetRect.left;
          break;
        case 'bottom-right':
          top = targetRect.bottom + offset;
          left = targetRect.right - hintBubbleWidth;
          break;
        case 'center':
           top = window.innerHeight / 2 - hintBubbleHeightEstimate / 2;
           left = window.innerWidth / 2 - hintBubbleWidth / 2;
           break;
      }
      
      if (left < offset) left = offset;
      if (left + hintBubbleWidth > window.innerWidth - offset) left = window.innerWidth - hintBubbleWidth - offset;
      if (top < offset) top = offset;
      if (top + hintBubbleHeightEstimate > window.innerHeight - offset) top = window.innerHeight - hintBubbleHeightEstimate - offset;

      setHintPosition({ top: `${top}px`, left: `${left}px`, width: `${hintBubbleWidth}px` });
      if (!isVisible) {
        setIsVisible(true);
        onVisibilityChange?.(tutorialId, true);
      }
      if (hintRef.current) hintRef.current.focus();

    } else {
      if (isVisible) {
        setIsVisible(false);
        onVisibilityChange?.(tutorialId, false);
      }
      if (targetElement && highlightTarget) { // Ensure cleanup if targetElement was set but now inactive
        targetElement.style.position = '';
        targetElement.style.zIndex = '';
        targetElement.classList.remove('tutorial-highlight-target');
      }
    }

    return () => {
      if (element && highlightTarget) {
        element.style.position = '';
        element.style.zIndex = '';
        element.classList.remove('tutorial-highlight-target');
      }
      // If component unmounts while visible, report it as not visible.
      // isVisibleRef.current is used because isVisible state might be stale in cleanup.
      if (isVisibleRef.current) {
        onVisibilityChange?.(tutorialId, false);
      }
    };
  }, [isActive, targetSelector, position, highlightTarget, title, text, tutorialId, onVisibilityChange, isVisible, targetElement]); 
  

  const handleDismiss = () => {
    onDismiss(tutorialId); // This will set isActive to false, triggering the useEffect above
    // The useEffect will then call onVisibilityChange(tutorialId, false)
  };
  
  if (!isActive || !isVisible) {
    return null;
  }
  
  const handleOverlayClick = () => {
    if (!showSkipAllButton && onDismiss) {
      handleDismiss();
    }
  }

  const defaultOverlayClass = "fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[10000]";

  return (
    <>
      {(highlightTarget || position === 'center') && (
         <div 
            className={overlayClassName || defaultOverlayClass} 
            onClick={handleOverlayClick} 
        />
      )}
      <div
        ref={hintRef}
        style={{ 
    ...hintPosition, 
    backgroundColor: 'rgba(109, 40, 217, 0.9)' 
  }}
        className={`fixed p-3 sm:p-4 backdrop-blur-lg text-slate-100 rounded-lg shadow-2xl z-[10002] border border-violet-500/70 transform transition-opacity duration-300 ease-in-out ${isVisible ? 'opacity-100 animate-fadeIn' : 'opacity-0'}`}
        role="dialog"
        aria-labelledby={`tutorial-title-${tutorialId}`}
        aria-describedby={`tutorial-text-${tutorialId}`}
        tabIndex={-1}
      >
        {title && <h3 id={`tutorial-title-${tutorialId}`} className="text-base sm:text-lg md:text-xl font-bold text-sky-300 mb-1.5 sm:mb-2">{title}</h3>}
        <p id={`tutorial-text-${tutorialId}`} className="text-xs sm:text-sm md:text-base leading-relaxed text-slate-200 mb-3 sm:mb-4">{text}</p>
        <div className="flex flex-col xs:flex-row justify-between items-center gap-2">
            <button
            onClick={handleDismiss}
            className="w-full xs:w-auto bg-sky-500 hover:bg-sky-400 text-white font-semibold py-1.5 px-3 sm:py-2 sm:px-4 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-violet-700 border border-sky-400/80 text-xs sm:text-sm"
            >
            {nextButtonText}
            </button>
            {showSkipAllButton && onSkipAll && (
                 <button
                    onClick={onSkipAll}
                    className="w-full xs:w-auto text-[10px] xs:text-xs text-violet-300 hover:text-violet-200 py-1.5 px-2 sm:py-2 sm:px-3 rounded-md transition-colors duration-200 hover:bg-violet-600/70"
                >
                    Skip All Tutorials
                </button>
            )}
        </div>
      </div>
    </>
  );
};

export default InteractiveTutorialHint;
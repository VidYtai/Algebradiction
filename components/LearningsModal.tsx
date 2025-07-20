import React, { useState } from 'react';
import { LearningEntry } from '../types';

interface LearningsModalProps {
  isOpen: boolean;
  onClose: () => void;
  learnings: LearningEntry[];
}

const LearningsModal: React.FC<LearningsModalProps> = ({ isOpen, onClose, learnings }) => {
  const [expandedLevels, setExpandedLevels] = useState<{ [level: number]: boolean }>({});

  if (!isOpen) return null;

  const toggleLevel = (level: number) => {
    setExpandedLevels(prev => ({
      ...prev,
      [level]: !prev[level],
    }));
  };

  const groupedLearnings: { [level: number]: LearningEntry[] } = learnings.reduce((acc, learning) => {
    if (!acc[learning.level]) {
      acc[learning.level] = [];
    }
    acc[learning.level].push(learning);
    return acc;
  }, {} as { [level: number]: LearningEntry[] });

  const sortedLevels = Object.keys(groupedLearnings).map(Number).sort((a, b) => a - b);

  for (const level in groupedLearnings) {
    groupedLearnings[level].sort((a, b) => a.timestamp - b.timestamp);
  }

  return (
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-50 transition-opacity duration-300 ease-in-out animate-fadeIn" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="learnings-modal-title"
      onClick={onClose} 
    >
      <div 
        className="glassmorphic-surface p-4 sm:p-5 md:p-6 rounded-xl shadow-2xl max-w-xl w-full max-h-[95vh] sm:max-h-[85vh] flex flex-col border border-sky-500/50"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-slate-700/80">
          <h2 id="learnings-modal-title" className="text-xl sm:text-2xl md:text-3xl font-bold text-sky-400">
            📖 My Learnings
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-sky-400 text-2xl sm:text-3xl font-light rounded-full p-1 leading-none hover:bg-slate-700/50 transition-colors"
            aria-label="Close my learnings"
          >
            &times;
          </button>
        </div>

        <div className="flex-grow overflow-y-auto pr-1 sm:pr-2 space-y-2.5 sm:space-y-3">
          {learnings.length === 0 ? (
            <p className="text-slate-400 text-center py-8 sm:py-10 text-sm sm:text-base">
              Your knowledge book is empty for now. Win cases to fill it with amazing math learnings!
            </p>
          ) : (
            sortedLevels.map(level => (
              <div key={level} className="border border-slate-700/70 rounded-lg overflow-hidden bg-slate-800/40 backdrop-blur-sm">
                <button
                  onClick={() => toggleLevel(level)}
                  className="w-full flex justify-between items-center p-2.5 sm:p-3 bg-slate-700/50 hover:bg-slate-600/60 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 focus:ring-offset-slate-800"
                  aria-expanded={!!expandedLevels[level]}
                  aria-controls={`learnings-level-${level}`}
                >
                  <span className="font-semibold text-base sm:text-lg text-sky-300">Level {level} Learnings</span>
                  <span className={`transform transition-transform duration-200 text-sky-400 text-xl sm:text-2xl ${expandedLevels[level] ? 'rotate-180' : 'rotate-0'}`}>
                    ▼
                  </span>
                </button>
                {expandedLevels[level] && (
                  <div id={`learnings-level-${level}`} className="p-2.5 sm:p-3 bg-slate-800/30">
                    <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 text-slate-300">
                      {groupedLearnings[level].map((learningEntry, index) => (
                        <li key={`${level}-${index}-${learningEntry.timestamp}`} className="pl-1 sm:pl-2 leading-relaxed text-xs sm:text-sm md:text-base">
                          {learningEntry.text}
                          <p className="text-[10px] xs:text-xs text-slate-500 ml-3 sm:ml-4">Learned on: {new Date(learningEntry.timestamp).toLocaleDateString()}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <button
            onClick={onClose}
            className="mt-4 sm:mt-6 w-full sm:w-auto self-center bg-sky-600 hover:bg-sky-700/90 text-white font-semibold py-2 sm:py-2.5 px-5 sm:px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800 border border-sky-500/70 text-sm sm:text-base"
        >
            Close
        </button>
      </div>
    </div>
  );
};

export default LearningsModal;
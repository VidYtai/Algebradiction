import React, { useState } from 'react';
import { TutorialStep } from '../types';
import InteractiveTutorialHint from './InteractiveTutorialHint';

interface ProofBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitProof: (proofText: string) => void;
  isLoading: boolean;
  showTutorial?: boolean;
  onDismissTutorial?: () => void;
  onTutorialVisibilityChange?: (tutorialId: TutorialStep, isVisible: boolean) => void;
  onSkipAllTutorials?: () => void;
}

const ProofBoardModal: React.FC<ProofBoardModalProps> = ({
  isOpen,
  onClose,
  onSubmitProof,
  isLoading,
  showTutorial,
  onDismissTutorial,
  onTutorialVisibilityChange,
  onSkipAllTutorials,
}) => {
  const [proofText, setProofText] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (proofText.trim() && !isLoading) {
      onSubmitProof(proofText);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-50 transition-opacity duration-300 ease-in-out animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proof-board-title"
    >
      <div
        id="proof-board-modal-content"
        className="glassmorphic-surface p-4 sm:p-5 md:p-6 rounded-xl shadow-2xl max-w-2xl w-full border border-emerald-500/50 max-h-[95vh] sm:max-h-[90vh] flex flex-col"
      >
        <div className="flex justify-between items-center mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-slate-700/80">
          <h2 id="proof-board-title" className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-400">
            💡 My Story Board
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-emerald-400 text-2xl sm:text-3xl font-light rounded-full p-1 leading-none hover:bg-slate-700/50 transition-colors disabled:opacity-50"
            aria-label="Close story board"
          >
            ×
          </button>
        </div>
        <p className="text-slate-300 mb-3 sm:mb-4 text-xs sm:text-sm md:text-base leading-relaxed">
          Tell your story here to help your friend! Say why they are good and not naughty. You can use Clue names (like Picture A).
        </p>
        <textarea
          value={proofText}
          onChange={(e) => setProofText(e.target.value)}
          placeholder={`For example:\n1. The Rule Book (Clue C) says lines should be straight.\n2. Picture B has some mixed-up numbers. If we fix them, the line is straight!\n3. Picture A is a tricky drawing.\n4. So, my friend Straighty the Line is good and straight!`}
          className="w-full h-48 sm:h-56 md:h-60 p-2.5 sm:p-3 bg-slate-800/60 text-slate-100 border border-slate-600/70 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none shadow-inner text-xs sm:text-sm md:text-base leading-relaxed flex-grow backdrop-blur-sm"
          disabled={isLoading}
          aria-label="Tell your story here"
        />
        <div className="mt-4 sm:mt-6 flex flex-col xs:flex-row justify-end space-y-2 xs:space-y-0 xs:space-x-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 sm:px-5 sm:py-2.5 bg-slate-600/70 hover:bg-slate-500/70 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg border border-slate-500/60 text-xs sm:text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!proofText.trim() || isLoading}
            className="px-5 py-2 sm:px-6 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center border border-emerald-500/80 text-xs sm:text-sm"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 sm:mr-3 sm:h-5 sm:w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Telling The Judge...
              </>
            ) : (
              'Tell The Judge!'
            )}
          </button>
        </div>
        {showTutorial && onDismissTutorial && (
          <InteractiveTutorialHint
            tutorialId={TutorialStep.PROOF_BOARD_MODAL_INTRO}
            isActive={showTutorial}
            targetSelector="#proof-board-modal-content"
            title="Tell Your Story"
            text="This is your Story Board. Type why your friend is good. Use easy words and talk about the clues you found!"
            position="center"
            onDismiss={onDismissTutorial}
            highlightTarget={true} // Changed to true
            overlayClassName="bg-slate-950/80 backdrop-blur-xl" 
            onVisibilityChange={onTutorialVisibilityChange}
            showSkipAllButton={true}
            onSkipAll={onSkipAllTutorials}
          />
        )}
      </div>
    </div>
  );
};

export default ProofBoardModal;

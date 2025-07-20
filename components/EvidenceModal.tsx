import React, { useState, useEffect } from 'react';
import { Evidence, TutorialStep } from '../types';
import InteractiveTutorialHint from './InteractiveTutorialHint';
import LoadingSpinner from './LoadingSpinner'; 

interface EvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidenceList: Evidence[];
  selectedEvidenceId: string | null;
  onSelectEvidence: (id: string) => void;
  showTutorial?: boolean;
  onDismissTutorial?: () => void;
  apiKeyAvailable: boolean; 
  onTutorialVisibilityChange?: (tutorialId: TutorialStep, isVisible: boolean) => void;
  onSkipAllTutorials?: () => void;
}

const EvidenceModal: React.FC<EvidenceModalProps> = ({ 
    isOpen, 
    onClose, 
    evidenceList, 
    selectedEvidenceId, 
    onSelectEvidence,
    showTutorial,
    onDismissTutorial,
    apiKeyAvailable,
    onTutorialVisibilityChange,
    onSkipAllTutorials
}) => {

  if (!isOpen) return null;

  const currentEvidence = evidenceList.find(e => e.id === selectedEvidenceId);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false); // Reset image error state when currentEvidence changes
  }, [currentEvidence]);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-50 transition-opacity duration-300 ease-in-out animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby="evidence-modal-title">
      <div id="evidence-modal-content" className="glassmorphic-surface p-3 sm:p-4 md:p-6 rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col border border-violet-500/50">
        <div className="flex justify-between items-center mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-slate-700/80">
          <h2 id="evidence-modal-title" className="text-xl sm:text-2xl md:text-3xl font-bold text-violet-400">🔍 Clue Checker</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-violet-400 text-2xl sm:text-3xl font-light rounded-full p-1 leading-none hover:bg-slate-700/50 transition-colors"
            aria-label="Close clue checker"
          >
            &times;
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 sm:gap-4 flex-grow overflow-hidden min-h-0">
          {/* Evidence List */}
          <div className="md:w-1/3 bg-slate-800/50 backdrop-blur-sm p-2 sm:p-3 rounded-lg border border-slate-700/60 overflow-y-auto h-48 md:h-auto">
            <h3 className="text-base sm:text-lg font-semibold text-violet-300 mb-2 sm:mb-3 sticky top-0 bg-slate-800/80 backdrop-blur-sm pb-1.5 sm:pb-2 z-10">Clues We Have:</h3>
            {evidenceList.length === 0 ? (
              <p className="text-slate-400 text-sm sm:text-base">No clues yet!</p>
            ) : (
              <ul className="space-y-1.5 sm:space-y-2">
                {evidenceList.map(e => (
                  <li key={e.id}>
                    <button
                      className={`w-full text-left p-2 sm:p-3 rounded-md transition-all duration-200 text-xs sm:text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${selectedEvidenceId === e.id ? 'bg-violet-600/80 text-white shadow-lg scale-102 sm:scale-105 border-violet-500' : 'bg-slate-700/60 hover:bg-violet-500/50 hover:text-white border-slate-600' } border`}
                      onClick={() => onSelectEvidence(e.id)}
                      aria-pressed={selectedEvidenceId === e.id}
                    >
                      {e.title} <span className="text-[10px] xs:text-xs opacity-70 block capitalize">({e.type.replace('_', ' ')})</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Evidence Details */}
          <div className="md:w-2/3 bg-slate-800/50 backdrop-blur-sm p-3 sm:p-4 rounded-lg border border-slate-700/60 overflow-y-auto h-64 md:h-auto">
            {currentEvidence ? (
              <>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-violet-300 mb-1.5 sm:mb-2">{currentEvidence.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 mb-1 capitalize">Type of clue: {currentEvidence.type.replace('_', ' ')}</p>
                <p className="text-slate-200 mb-3 sm:mb-4 whitespace-pre-wrap leading-relaxed text-xs sm:text-sm md:text-base">{currentEvidence.description}</p>
                
                {(currentEvidence.type === 'graph' || currentEvidence.type === 'image') && (
                  currentEvidence.content.startsWith('https://') ? (
                    imageError ? (
                       <div className="w-full max-w-full sm:max-w-md mx-auto h-auto rounded-lg border border-red-600/70 my-2 sm:my-3 shadow-md bg-red-200/10 p-4 text-center">
                            <p className="text-red-700 font-semibold">Image Preview Unavailable</p>
                            <p className="text-xs text-red-600">Could not load image from: <br/><span className="break-all">{currentEvidence.content}</span></p>
                       </div>
                    ) : (
                        <img 
                            src={currentEvidence.content} 
                            alt={currentEvidence.title} 
                            className="w-full max-w-full sm:max-w-md mx-auto h-auto rounded-lg border border-slate-600/70 my-2 sm:my-3 shadow-md bg-slate-200/10 p-1"
                            onError={handleImageError}
                        />
                    )
                  ) : currentEvidence.content.trim().toLowerCase().startsWith('<svg') ? (
                    <div 
                      className="w-full max-w-full sm:max-w-md mx-auto h-auto rounded-lg border border-slate-600/70 my-2 sm:my-3 shadow-md p-1 sm:p-2 bg-slate-800/30 flex justify-center items-center overflow-hidden"
                      style={{ minHeight: '100px', maxHeight: '400px' }} 
                    >
                      <div dangerouslySetInnerHTML={{ __html: currentEvidence.content }} className="w-full h-full object-contain max-h-[380px]" />
                    </div>
                  ) : (
                     <div className="bg-slate-900/70 p-2 sm:p-3 rounded-md my-2 sm:my-3 border border-slate-700">
                       <p className="text-slate-300 whitespace-pre-wrap leading-relaxed font-mono text-[10px] xs:text-xs sm:text-sm">Raw content: "{currentEvidence.content}"</p>
                     </div>
                  )
                )}

                {currentEvidence.type === 'data_table' && (
                  <div className="bg-slate-900/70 p-2 sm:p-3 rounded-md my-2 sm:my-3 border border-slate-700 max-h-60 sm:max-h-72 overflow-y-auto">
                    <pre className="text-[10px] xs:text-xs sm:text-sm text-slate-300 whitespace-pre-wrap">{JSON.stringify(JSON.parse(currentEvidence.content), null, 2)}</pre>
                  </div>
                )}
                {(currentEvidence.type === 'document' || currentEvidence.type === 'statement' || currentEvidence.type === 'video_snippet') &&
                (
                   <div className="bg-slate-900/70 p-2 sm:p-3 rounded-md my-2 sm:my-3 border border-slate-700">
                     <p className="text-slate-300 whitespace-pre-wrap leading-relaxed text-xs sm:text-sm md:text-base">{currentEvidence.content}</p>
                   </div>
                )}

                {currentEvidence.isFlawed && (
                  <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-red-900/40 backdrop-blur-sm border border-red-700/60 rounded-lg shadow-inner">
                    <h4 className="font-semibold text-red-300 text-sm sm:text-base">Hmm, something's fishy...</h4>
                    <p className="text-red-200 text-xs sm:text-sm leading-relaxed">{currentEvidence.flawDescription}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-slate-400 text-center flex items-center justify-center h-full text-base sm:text-lg">Pick a clue from the list to see it!</p>
            )}
          </div>
        </div>
        <button
            onClick={onClose}
            className="mt-4 sm:mt-6 w-full sm:w-auto self-center bg-violet-600 hover:bg-violet-700/80 text-white font-semibold py-2 sm:py-2.5 px-5 sm:px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-slate-800 text-sm sm:text-base border border-violet-500/70"
        >
            Done Looking at Clues
        </button>
        {showTutorial && onDismissTutorial && (
            <InteractiveTutorialHint
                tutorialId={TutorialStep.EVIDENCE_MODAL_INTRO}
                isActive={showTutorial}
                targetSelector="#evidence-modal-content" 
                title="Clue Checker"
                text="Here you can look at all the clues. Pick a clue from the list on the left to see more about it on the right. See if any clues are tricky!"
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

export default EvidenceModal;

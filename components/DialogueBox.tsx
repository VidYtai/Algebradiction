import React, { useEffect, useRef } from 'react';
import { Dialogue, CharacterRole } from '../types';

interface DialogueBoxProps {
  dialogues: Dialogue[];
  currentSpeaker: CharacterRole | null;
}

const DialogueBox: React.FC<DialogueBoxProps> = ({ dialogues, currentSpeaker }) => {
  const dialogueEndRef = useRef<null | HTMLDivElement>(null);
  const scrollContainerRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer && dialogueEndRef.current) {
        // Calculate how much content is scrolled out of view at the bottom.
        // scrollHeight: total height of content.
        // scrollTop: current vertical scroll position from the top.
        // clientHeight: visible height of the container.
        const scrollBottomOffset = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight;
        
        // Threshold: If the user is scrolled up by more than this, don't auto-scroll.
        // This allows users to read past messages without being interrupted by new ones.
        // A smaller value makes the condition for "at the bottom" stricter.
        const SCROLL_THRESHOLD = 20; // Changed from 120

        if (scrollBottomOffset <= SCROLL_THRESHOLD) {
            dialogueEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
    }
  }, [dialogues]);


  const getSpeakerStyle = (speaker: CharacterRole) => {
    let nameClass = 'text-slate-300';
    // Base glassmorphic bubble style
    let bubbleClass = 'bg-slate-700/40 backdrop-blur-md border-slate-600/60';

    switch (speaker) {
      case CharacterRole.JUDGE: 
        nameClass = 'text-violet-300'; bubbleClass = 'bg-violet-800/30 backdrop-blur-md border-violet-600/50';
        break;
      case CharacterRole.PROSECUTOR: 
        nameClass = 'text-red-300'; bubbleClass = 'bg-red-800/30 backdrop-blur-md border-red-600/50';
        break;
      case CharacterRole.DEFENSE_PLAYER: 
        nameClass = 'text-emerald-300'; bubbleClass = 'bg-emerald-800/30 backdrop-blur-md border-emerald-600/50 ml-auto'; 
        break;
      case CharacterRole.CO_COUNSEL: 
        nameClass = 'text-amber-300'; bubbleClass = 'bg-amber-700/30 backdrop-blur-md border-amber-600/50';
        break;
      case CharacterRole.CLIENT: 
        nameClass = 'text-sky-300'; bubbleClass = 'bg-sky-800/30 backdrop-blur-md border-sky-600/50';
        break;
      case CharacterRole.NARRATOR: 
        nameClass = 'text-slate-400 italic'; bubbleClass = 'bg-slate-800/50 backdrop-blur-sm border-slate-700/50 text-center';
        break;
      default: 
        nameClass = 'text-slate-200';
        break;
    }
    return { nameClass, bubbleClass };
  };

  return (
    <div 
      ref={scrollContainerRef}
      className="glassmorphic-surface p-2.5 sm:p-3 md:p-4 rounded-xl shadow-xl h-full overflow-y-auto border border-slate-700/50 flex flex-col space-y-2.5 sm:space-y-3"
    >
      {dialogues.length === 0 && (
        <p className="text-slate-400 text-center flex-grow flex items-center justify-center text-sm sm:text-base">
          The courtroom is quiet... waiting for the trial to unfold.
        </p>
      )}
      {dialogues.map((dialogue, index) => {
        const { nameClass, bubbleClass } = getSpeakerStyle(dialogue.speaker);
        const isLatest = index === dialogues.length - 1;
        
        let speakerDisplayNameString: string;
        if (dialogue.speaker === CharacterRole.DEFENSE_PLAYER) {
            speakerDisplayNameString = "You";
        } else if (dialogue.speaker === CharacterRole.CLIENT) {
           speakerDisplayNameString = "Your Friend"; 
        } else if (dialogue.speaker === CharacterRole.NARRATOR) {
            speakerDisplayNameString = ""; 
        } else { 
            speakerDisplayNameString = dialogue.speaker;
        }


        return (
          <div 
            key={dialogue.timestamp} 
            className={`p-2 sm:p-3 rounded-lg shadow-md border text-xs sm:text-sm md:text-base max-w-[90%] sm:max-w-[85%] md:max-w-[80%] ${bubbleClass} ${dialogue.speaker === CharacterRole.DEFENSE_PLAYER ? 'self-end' : (dialogue.speaker === CharacterRole.NARRATOR ? 'self-center w-full sm:w-[95%] md:w-[90%]' : 'self-start')}`}
            tabIndex={isLatest ? 0 : -1} 
          >
            {speakerDisplayNameString && (
              <p className={`font-semibold ${nameClass} mb-0.5 sm:mb-1 text-xs sm:text-sm`}>
                {speakerDisplayNameString}
                {currentSpeaker === dialogue.speaker && isLatest && dialogue.speaker !== CharacterRole.NARRATOR && <span className="ml-1 animate-pulse">...</span>}
              </p>
            )}
            <p className={`whitespace-pre-wrap leading-relaxed ${dialogue.speaker === CharacterRole.NARRATOR ? 'text-slate-300 italic' : 'text-slate-100'}`}>
                {dialogue.text}
            </p>
            <p className="text-xs text-slate-500 text-right mt-1 sm:mt-1.5">{new Date(dialogue.timestamp).toLocaleDateString([], { month:'short', day:'numeric'})} {new Date(dialogue.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        );
      })}
      <div ref={dialogueEndRef} /> 
    </div>
  );
};

export default DialogueBox;
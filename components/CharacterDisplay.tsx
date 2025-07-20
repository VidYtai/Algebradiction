import React from 'react';
import { CharacterRole } from '../types';

interface CharacterDisplayProps {
  role: CharacterRole;
  isSpeaking?: boolean;
}

const CharacterDisplay: React.FC<CharacterDisplayProps> = ({ role, isSpeaking }) => {
  const getCharacterStyle = () => {
    let baseStyle = 'p-1 sm:p-2 rounded-xl shadow-lg border transition-all duration-300 ease-in-out glassmorphic-surface';
    let specificClasses = '';
    let speakingEffect = 'ring-sky-400 ring-offset-slate-900'; // Default speaking ring

    // Base glassmorphic style
    specificClasses = 'border-slate-700/70 text-slate-100';

    switch (role) {
      case CharacterRole.JUDGE:
        specificClasses = 'border-violet-500/60 text-violet-200';
        speakingEffect = 'ring-violet-400 ring-offset-slate-900';
        break;
      case CharacterRole.PROSECUTOR:
        specificClasses = 'border-red-500/60 text-red-200';
        speakingEffect = 'ring-red-400 ring-offset-slate-900';
        break;
      case CharacterRole.DEFENSE_PLAYER:
        specificClasses = 'border-emerald-500/60 text-emerald-200';
        speakingEffect = 'ring-emerald-400 ring-offset-slate-900';
        break;
      case CharacterRole.CO_COUNSEL:
        specificClasses = 'border-amber-500/60 text-amber-200';
        speakingEffect = 'ring-amber-400 ring-offset-slate-900';
        break;
      case CharacterRole.CLIENT: 
        specificClasses = 'border-sky-500/60 text-sky-200';
        speakingEffect = 'ring-sky-400 ring-offset-slate-900';
        break;
      default: 
        specificClasses = 'border-slate-600/60 text-slate-200';
        break;
    }
    return `${baseStyle} ${specificClasses} ${isSpeaking ? `ring-2 sm:ring-4 ${speakingEffect} shadow-xl sm:shadow-2xl scale-105` : 'shadow-md hover:shadow-lg'}`;
  };
  
  const getCharacterEmoji = () => {
    switch (role) {
      case CharacterRole.JUDGE: return '⚖️';
      case CharacterRole.PROSECUTOR: return '😠'; 
      case CharacterRole.DEFENSE_PLAYER: return '🦸'; 
      case CharacterRole.CO_COUNSEL: return '💡'; 
      case CharacterRole.CLIENT: return '😟'; 
      case CharacterRole.NARRATOR: return '🎤';
      default: return '👤';
    }
  }

  let roleDisplayNameString: string;
  if (role === CharacterRole.DEFENSE_PLAYER) {
    roleDisplayNameString = "You"; 
  } else if (role === CharacterRole.CLIENT) {
    roleDisplayNameString = "Your Friend"; 
  } else {
    roleDisplayNameString = role; 
  }


  return (
    <div className={`text-center transform transition-transform duration-300 ${isSpeaking ? 'scale-100' : 'scale-100'}`}> {/* Adjusted scale for speaking off */}
      <div className={getCharacterStyle()}>
        <span className="text-lg sm:text-2xl block mb-0 sm:mb-1 drop-shadow-sm">{getCharacterEmoji()}</span>
        <p className="font-semibold text-[10px] sm:text-xs capitalize truncate">{roleDisplayNameString}</p>
      </div>
       {isSpeaking && <div className={`mt-1.5 h-1 sm:h-1.5 rounded-full animate-pulse w-3/4 mx-auto ${
           role === CharacterRole.JUDGE ? 'bg-violet-400' :
           role === CharacterRole.PROSECUTOR ? 'bg-red-400' :
           role === CharacterRole.DEFENSE_PLAYER ? 'bg-emerald-400' :
           role === CharacterRole.CO_COUNSEL ? 'bg-amber-400' :
           role === CharacterRole.CLIENT ? 'bg-sky-400' : 'bg-slate-400'
       }`}></div>}
    </div>
  );
};

export default CharacterDisplay;
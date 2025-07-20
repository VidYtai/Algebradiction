

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CaseData, Dialogue, CharacterRole, GameScreen, PlayerTool, TutorialStep } from '../types';
import { PLAYER_TOOLS, API_KEY_ERROR_MESSAGE } from '../constants';
import * as GeminiService from '../services/geminiService';
import CharacterDisplay from './CharacterDisplay';
import DialogueBox from './DialogueBox';
import EvidenceModal from './EvidenceModal';
import ProofBoardModal from './ProofBoardModal';
import LoadingSpinner from './LoadingSpinner';
import InteractiveTutorialHint from './InteractiveTutorialHint';

interface CourtroomProps {
  caseData: CaseData;
  onConcludeCase: (verdict: string, reason?: 'timeup' | 'normal') => void;
  apiKeyAvailable: boolean;
  isTutorialStepComplete: (step: TutorialStep) => boolean;
  markTutorialStepAsComplete: (step: TutorialStep) => void;
  allTutorialsSkipped: boolean;
  currentLevel: number; 
  onSkipAll: () => void; // Added for global skip all
}

const irrelevantKeywords = [
    "irrelevant", "not relevant", "unrelated", "doesn't apply", 
    "off-topic", "doesn't address the point", "fails to address", "not pertinent"
];

const Courtroom: React.FC<CourtroomProps> = ({ 
    caseData, 
    onConcludeCase, 
    apiKeyAvailable,
    isTutorialStepComplete,
    markTutorialStepAsComplete,
    allTutorialsSkipped,
    currentLevel,
    onSkipAll // Destructure onSkipAll from props
}) => {
  const [currentScreen, setCurrentScreen] = useState<GameScreen>(GameScreen.TRIAL_INTRO);
  const [dialogueHistory, setDialogueHistory] = useState<Dialogue[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<CharacterRole | null>(null);
  
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState<boolean>(false);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [isProofBoardModalOpen, setIsProofBoardModalOpen] = useState<boolean>(false);
  const [playerObjectionText, setPlayerObjectionText] = useState<string>('');
  
  const [showEvidenceModalTutorial, setShowEvidenceModalTutorial] = useState(false);
  const [showProofBoardModalTutorial, setShowProofBoardModalTutorial] = useState(false);
  const [proofBoardVisibilityCount, setProofBoardVisibilityCount] = useState(0); 

  const [timeLeft, setTimeLeft] = useState<number>(caseData.caseDurationMinutes * 60); 
  const timerRef = useRef<number | null>(null); 
  const [activeTutorials, setActiveTutorials] = useState<Set<TutorialStep>>(new Set());

  const onConcludeCaseRef = useRef(onConcludeCase);
  const addDialogueRef = useRef<((speaker: CharacterRole, text: string) => void) | null>(null);
  const currentScreenRef = useRef(currentScreen); // Keep this for async/callbacks not directly in timer effect
  const isTutorialStepCompleteRef = useRef(isTutorialStepComplete);
  const shouldShowTutorialRef = useRef<((step: TutorialStep) => boolean) | null>(null);
  const setCurrentScreenRef = useRef(setCurrentScreen);
  
  const addDialogue = useCallback((speaker: CharacterRole, text: string) => {
    setDialogueHistory(prev => [...prev, { speaker, text, timestamp: Date.now() }]);
    setCurrentSpeaker(speaker);
  }, []);
  
  useEffect(() => { addDialogueRef.current = addDialogue; }, [addDialogue]);
  useEffect(() => { onConcludeCaseRef.current = onConcludeCase; }, [onConcludeCase]);
  useEffect(() => { currentScreenRef.current = currentScreen; }, [currentScreen]);
  useEffect(() => { isTutorialStepCompleteRef.current = isTutorialStepComplete; }, [isTutorialStepComplete]);
  useEffect(() => { setCurrentScreenRef.current = setCurrentScreen; }, [setCurrentScreen]);

  const handleTutorialVisibilityChange = useCallback((tutorialId: TutorialStep, isVisible: boolean) => {
    setActiveTutorials(prev => {
      const newSet = new Set(prev);
      if (isVisible) {
        newSet.add(tutorialId);
      } else {
        newSet.delete(tutorialId);
      }
      return newSet;
    });
  }, []);

  const shouldShowTutorial = useCallback((step: TutorialStep) => {
    return currentLevel === 1 && !allTutorialsSkipped && !isTutorialStepComplete(step);
  }, [currentLevel, allTutorialsSkipped, isTutorialStepComplete]);

  useEffect(() => { shouldShowTutorialRef.current = shouldShowTutorial; }, [shouldShowTutorial]);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  useEffect(() => {
    setTimeLeft(caseData.caseDurationMinutes * 60);
  }, [caseData.caseDurationMinutes, caseData.id]);

  useEffect(() => {
    const isPlayerTurnCurrentlyActive = (
      (currentScreen === GameScreen.PLAYER_ACTION || currentScreen === GameScreen.PLAYER_OBJECTION_INPUT) &&
      !isLoading
    );
  
    // If a tutorial is active, timer should definitely not run
    if (activeTutorials.size > 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return; // Exit early
    }
  
    // Original timer logic if no tutorial is active
    if (isPlayerTurnCurrentlyActive && timeLeft > 0) {
      if (!timerRef.current) { 
        timerRef.current = window.setInterval(() => {
          setTimeLeft(prevTime => {
            if (prevTime <= 1) {
              if(timerRef.current) clearInterval(timerRef.current);
              timerRef.current = null;
              // Use currentScreenRef.current here as this is inside an interval callback
              if (currentScreenRef.current !== GameScreen.VERDICT) { 
                addDialogueRef.current?.(CharacterRole.NARRATOR, "Oh no! Time's up!");
                onConcludeCaseRef.current("The Judge says time ran out! Better luck next time!", 'timeup');
              }
              return 0;
            }
            return prevTime - 1;
          });
        }, 1000);
      }
    } else { // Not player's turn, or time ran out, or loading
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => { // Cleanup for this effect
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentScreen, isLoading, timeLeft, activeTutorials]); 
  

  useEffect(() => {
    const isProofBoardVisible = currentScreen === GameScreen.PLAYER_ACTION && apiKeyAvailable && !isLoading;
    setProofBoardVisibilityCount(prev => {
      if (isProofBoardVisible && prev % 2 === 0) {
        return prev + 1;
      }
      if (!isProofBoardVisible && prev % 2 === 1) {
        return prev + 1;
      }
      return prev;
    });
  }, [currentScreen, apiKeyAvailable, isLoading]);

  const trialIntroSequenceRunMarkerRef = useRef(false); 

  useEffect(() => {
    const runFullTrialIntroSequence = async () => {
        if (currentScreen !== GameScreen.TRIAL_INTRO || !apiKeyAvailable || trialIntroSequenceRunMarkerRef.current) {
            return;
        }
        trialIntroSequenceRunMarkerRef.current = true;

        if (!apiKeyAvailable && dialogueHistory.length === 0) { 
            addDialogueRef.current?.(CharacterRole.NARRATOR, API_KEY_ERROR_MESSAGE + " The game can't fully work like this. Some characters can't talk!");
            trialIntroSequenceRunMarkerRef.current = false; 
            return; 
        }
        
        if (shouldShowTutorialRef.current?.(TutorialStep.COURTROOM_WELCOME)) { trialIntroSequenceRunMarkerRef.current = false; return; }
        if (dialogueHistory.filter(d=>d.speaker === CharacterRole.NARRATOR && d.text.startsWith("Let's start the game")).length === 0) {
           addDialogueRef.current?.(CharacterRole.NARRATOR, `Let's start the game for: ${caseData.title}! The ${CharacterRole.JUDGE} is here to listen.`);
           await delay(1200);
        }

        if (shouldShowTutorialRef.current?.(TutorialStep.COURTROOM_CHARACTERS)) { trialIntroSequenceRunMarkerRef.current = false; return; }
        if (dialogueHistory.filter(d=>d.speaker === CharacterRole.JUDGE && d.text.includes("you can start.")).length === 0) {
            addDialogueRef.current?.(CharacterRole.JUDGE, `Okay everyone, quiet please! We're going to talk about ${caseData.clientName}. ${CharacterRole.PROSECUTOR}, you can start.`);
            await delay(1800);
        }
        
        if (shouldShowTutorialRef.current?.(TutorialStep.COURTROOM_DIALOGUE_BOX)) { trialIntroSequenceRunMarkerRef.current = false; return; }
        if (isTutorialStepCompleteRef.current(TutorialStep.COURTROOM_DIALOGUE_BOX) && shouldShowTutorialRef.current?.(TutorialStep.COURTROOM_TIMER_INTRO)) {
             trialIntroSequenceRunMarkerRef.current = false; return; 
        }
        
        setCurrentScreenRef.current(GameScreen.PROSECUTOR_ARGUMENT);
    };

    runFullTrialIntroSequence();

  }, [currentScreen, caseData.title, caseData.clientName, apiKeyAvailable, isTutorialStepComplete, shouldShowTutorial, dialogueHistory.length]); 

  useEffect(() => {
    if (currentScreen !== GameScreen.TRIAL_INTRO) {
        trialIntroSequenceRunMarkerRef.current = false;
    }
  }, [currentScreen]);

  useEffect(() => {
    const activeBlockingCourtroomTutorial = 
        (shouldShowTutorialRef.current?.(TutorialStep.COURTROOM_WELCOME)) ||
        (shouldShowTutorialRef.current?.(TutorialStep.COURTROOM_CHARACTERS) && isTutorialStepCompleteRef.current(TutorialStep.COURTROOM_WELCOME)) ||
        (shouldShowTutorialRef.current?.(TutorialStep.COURTROOM_DIALOGUE_BOX) && isTutorialStepCompleteRef.current(TutorialStep.COURTROOM_CHARACTERS)) ||
        (shouldShowTutorialRef.current?.(TutorialStep.COURTROOM_TIMER_INTRO) && isTutorialStepCompleteRef.current(TutorialStep.COURTROOM_DIALOGUE_BOX));

    if (activeBlockingCourtroomTutorial) return;

    const handleProsecutorArgument = async () => {
      if (currentScreen === GameScreen.PROSECUTOR_ARGUMENT && apiKeyAvailable) {
        setIsLoading(true);
        setCurrentSpeaker(CharacterRole.PROSECUTOR);
        
        const isFirstProsecutorTurn = dialogueHistory.filter(d => d.speaker === CharacterRole.PROSECUTOR).length === 0;
        let statementContext = "The player is waiting for your next argument or reaction."; 

        const recentDialogues = dialogueHistory.slice(-4); 
        const playerProofAttemptDialogue = recentDialogues.find(d => d.speaker === CharacterRole.DEFENSE_PLAYER && (d.text.toLowerCase().startsWith("judge, here's why my friend is good:") || d.text.toLowerCase().startsWith("wait, judge!")));
        const judgeCritiqueDialogue = recentDialogues.find(d => d.speaker === CharacterRole.JUDGE);
        const narratorFollowUpDialogue = recentDialogues.find(d => d.speaker === CharacterRole.NARRATOR && (d.text.includes("Judge found your argument irrelevant") || d.text.includes("Judge found issues with your mathematical reasoning") || d.text.includes("Judge didn't find your objection strong enough")));


        if (playerProofAttemptDialogue && judgeCritiqueDialogue && narratorFollowUpDialogue) {
            const playerArgText = playerProofAttemptDialogue.text.substring(playerProofAttemptDialogue.text.indexOf(':') + 1).trim();
            if (narratorFollowUpDialogue.text.includes("irrelevant")) {
                 statementContext = `The Defense Counsel just made an argument that the Judge found completely irrelevant! They said: "${playerArgText.substring(0, Math.min(70, playerArgText.length))}...". What's your take on their irrelevant distraction, Prosecutor? Press your advantage and reiterate the mathematical facts of the case!`;
            } else if (narratorFollowUpDialogue.text.includes("issues with your mathematical reasoning")) {
                 statementContext = `The Defense Counsel just made a mathematically flawed argument! The Judge pointed out issues. They said: "${playerArgText.substring(0, Math.min(70, playerArgText.length))}...". Prosecutor, emphasize their error and strengthen your case based on correct mathematics!`;
            } else if (narratorFollowUpDialogue.text.includes("Judge didn't find your objection strong enough")) {
                 statementContext = `The Defense Counsel just made an objection which the Judge did not find strong enough to alter the course of the trial. They said: "${playerArgText.substring(0, Math.min(70, playerArgText.length))}...". Prosecutor, continue with your argument, re-emphasizing the mathematical facts.`;
            }
        }
        
        const statement = isFirstProsecutorTurn
          ? caseData.initialProsecutionArgument
          : await GeminiService.getProsecutorStatement(caseData, statementContext, dialogueHistory.map(d=>`${d.speaker}: ${d.text}`).join('\n'));
        
        addDialogueRef.current?.(CharacterRole.PROSECUTOR, statement);
        setIsLoading(false);
        await delay(1000); 
        setCurrentScreenRef.current(GameScreen.CO_COUNSEL_ADVICE);
      }
    };
    handleProsecutorArgument();
  }, [currentScreen, caseData, apiKeyAvailable, dialogueHistory]); 

  useEffect(() => {
    const activeBlockingCourtroomTutorial = 
        (shouldShowTutorialRef.current?.(TutorialStep.COURTROOM_WELCOME)) ||
        (shouldShowTutorialRef.current?.(TutorialStep.COURTROOM_CHARACTERS) && isTutorialStepCompleteRef.current(TutorialStep.COURTROOM_WELCOME)) ||
        (shouldShowTutorialRef.current?.(TutorialStep.COURTROOM_DIALOGUE_BOX) && isTutorialStepCompleteRef.current(TutorialStep.COURTROOM_CHARACTERS)) ||
        (shouldShowTutorialRef.current?.(TutorialStep.COURTROOM_TIMER_INTRO) && isTutorialStepCompleteRef.current(TutorialStep.COURTROOM_DIALOGUE_BOX));

    if (activeBlockingCourtroomTutorial) return;
    
    const handleCoCounselAdvice = async () => {
      if (currentScreen === GameScreen.CO_COUNSEL_ADVICE && apiKeyAvailable) {
        setIsLoading(true);
        setCurrentSpeaker(CharacterRole.CO_COUNSEL);
        
        const prosecutorDialogues = dialogueHistory.filter(d => d.speaker === CharacterRole.PROSECUTOR);
        const lastProsecutorStatement = prosecutorDialogues.length > 0 
            ? prosecutorDialogues[prosecutorDialogues.length - 1].text 
            : "The Silly Prosecutor just said something.";
        
        const isFirstCoCounselTurn = dialogueHistory.filter(d => d.speaker === CharacterRole.CO_COUNSEL).length === 0;
        let coCounselContext = `The ${CharacterRole.PROSECUTOR} said: "${lastProsecutorStatement}". What should we do, Super Helper?`;

        const recentDialoguesCoCounsel = dialogueHistory.slice(-5);
        const playerProofAttemptDialogueCo = recentDialoguesCoCounsel.find(d => d.speaker === CharacterRole.DEFENSE_PLAYER && (d.text.toLowerCase().startsWith("judge, here's why my friend is good:") || d.text.toLowerCase().startsWith("wait, judge!")));
        const judgeCritiqueDialogueCo = recentDialoguesCoCounsel.find(d => d.speaker === CharacterRole.JUDGE);
        const prosecutorReactedToPlayerError = prosecutorDialogues.length > 0 && 
            (prosecutorDialogues[prosecutorDialogues.length-1].text.toLowerCase().includes("irrelevant") || 
             prosecutorDialogues[prosecutorDialogues.length-1].text.toLowerCase().includes("distraction") ||
             prosecutorDialogues[prosecutorDialogues.length-1].text.toLowerCase().includes("flawed") ||
             prosecutorDialogues[prosecutorDialogues.length-1].text.toLowerCase().includes("incorrect") ||
             prosecutorDialogues[prosecutorDialogues.length-1].text.toLowerCase().includes("failed attempt"));

        if (playerProofAttemptDialogueCo && judgeCritiqueDialogueCo && prosecutorReactedToPlayerError) {
            if (judgeCritiqueDialogueCo.text.toLowerCase().includes("irrelevant")) {
                coCounselContext = `Captain, your last argument was found irrelevant by the Judge, and the Prosecutor is capitalizing on it. The Prosecutor just said: "${lastProsecutorStatement}". We *must* get back on track! What's a focused, *relevant* mathematical point we can make about "${caseData.accusation}" using concepts like ${caseData.keyConcepts.join(', ')}?`;
            } else { 
                 coCounselContext = `Captain, the Judge found issues with our last mathematical argument (or it wasn't strong enough), and the Prosecutor is pouncing on it: "${lastProsecutorStatement}". Let's carefully review the math for "${caseData.accusation}" related to ${caseData.keyConcepts.join(', ')}. Where could the error be, or how can we make a stronger point?`;
            }
        }
        
        const advice = isFirstCoCounselTurn
          ? caseData.initialCoCounselHint
          : await GeminiService.getCoCounselAdvice(caseData, coCounselContext, dialogueHistory.map(d=>`${d.speaker}: ${d.text}`).join('\n'));
        
        addDialogueRef.current?.(CharacterRole.CO_COUNSEL, advice);
        setIsLoading(false);
        await delay(1000); 
        setCurrentScreenRef.current(GameScreen.PLAYER_ACTION);
        setCurrentSpeaker(null); 
      }
    };
    handleCoCounselAdvice();
  }, [currentScreen, caseData, apiKeyAvailable, dialogueHistory]);

  useEffect(() => {
    GeminiService.resetChats(); 
  }, [caseData.id]); 

  const handlePlayerAction = (actionId: PlayerTool['id']) => {
    switch (actionId) {
      case 'evidence_terminal':
        setIsEvidenceModalOpen(true);
        if (caseData.evidence.length > 0 && !selectedEvidenceId) {
            setSelectedEvidenceId(caseData.evidence[0].id);
        }
        if (shouldShowTutorialRef.current?.(TutorialStep.EVIDENCE_MODAL_INTRO)) {
            setShowEvidenceModalTutorial(true); 
        }
        break;
      case 'proof_board':
        setIsProofBoardModalOpen(true);
        if (shouldShowTutorialRef.current?.(TutorialStep.PROOF_BOARD_MODAL_INTRO)) {
            setShowProofBoardModalTutorial(true); 
        }
        break;
      case 'objection_system':
        setCurrentScreen(GameScreen.PLAYER_OBJECTION_INPUT);
        break;
    }
  };

  const submitObjection = async () => {
    if (!playerObjectionText.trim() || !apiKeyAvailable) return;
    if (shouldShowTutorialRef.current?.(TutorialStep.COURTROOM_OBJECTION_INPUT)) markTutorialStepAsComplete(TutorialStep.COURTROOM_OBJECTION_INPUT);
    
    addDialogueRef.current?.(CharacterRole.DEFENSE_PLAYER, `Wait, Judge! ${playerObjectionText}`);
    setIsLoading(true);
    setCurrentSpeaker(CharacterRole.JUDGE);
    const previousObjectionTextForRuling = playerObjectionText; 
    setPlayerObjectionText('');
    
    const prosecutorDialogues = dialogueHistory.filter(d => d.speaker === CharacterRole.PROSECUTOR);
    const lastProsecutorStatement = prosecutorDialogues.length > 0
        ? prosecutorDialogues[prosecutorDialogues.length - 1].text
        : "what the Silly Prosecutor just said";

    const ruling = await GeminiService.analyzePlayerArgumentOrObjection(
        caseData, 
        previousObjectionTextForRuling, 
        `The Defense Counsel objects to "${lastProsecutorStatement}" with the reason: "${previousObjectionTextForRuling}"`, 
        currentLevel
    );
    addDialogueRef.current?.(CharacterRole.JUDGE, ruling);
    await delay(1500); 

    const lowerCaseRuling = ruling.toLowerCase();

    const winningKeywords = [
        "sound mathematical argument", "application is correct", "that explains it", 
        "that is correct", "proves the point", "valid reasoning", "accurately identifies",
        "well argued", "convincing", "successfully demonstrates", "i agree", "persuasive",
        "clearly shows", "evidence supports this", "mathematically sound and relevant", "decisive point"
    ];
    const generalLosingKeywords = [ 
        "not sure", "doesn't help", "not quite", "confusing", 
        "doesn't make sense", "still not clear", "incorrect", "flaw", 
        "fails to demonstrate", "misses the point", "mathematically unsound",
        "not convinced", "insufficient", "error in reasoning", "overruled", "i don't see the issue",
        "prosecutor may continue", "not relevant here" 
    ];

    let argumentIsWinning = false;
    for (const keyword of winningKeywords) {
        if (lowerCaseRuling.includes(keyword) && 
            !irrelevantKeywords.some(irk => lowerCaseRuling.includes(irk)) &&
            !generalLosingKeywords.some(lk => lowerCaseRuling.includes(lk))) {
            argumentIsWinning = true;
            break;
        }
    }
    if (winningKeywords.some(kw => lowerCaseRuling.includes(kw))) {
        if (!irrelevantKeywords.some(irk => lowerCaseRuling.includes(irk)) && 
            !generalLosingKeywords.some(glk => lowerCaseRuling.includes(glk))) {
            argumentIsWinning = true;
        }
        if (lowerCaseRuling.includes("overruled") || lowerCaseRuling.includes("not relevant here") || irrelevantKeywords.some(irk => lowerCaseRuling.includes(irk))) {
             argumentIsWinning = false;
        }
    }


    if (argumentIsWinning) {
        addDialogueRef.current?.(CharacterRole.JUDGE, `This objection is so compelling, it clarifies the entire matter! ${caseData.innocentVerdictIfPlayerSucceeds}`);
        await delay(1200);
        addDialogueRef.current?.(CharacterRole.NARRATOR, "Incredible! Your sharp objection has won the case!");
        setIsLoading(false);
        setCurrentSpeaker(null);
        setCurrentScreenRef.current(GameScreen.VERDICT);
        await delay(1000); 
        onConcludeCaseRef.current(caseData.innocentVerdictIfPlayerSucceeds, 'normal');
        return;
    }

    const objectionSustainedKeywords = ["sustained", "you have a point", "that's a fair objection", "i agree with the defense", "point taken"];
    const objectionOverruledKeywords = ["overruled", "i don't see the issue", "prosecutor may continue", "not relevant here", "disagree"];

    let isSustainedNotWinning = false;
    if (objectionSustainedKeywords.some(kw => lowerCaseRuling.includes(kw)) && 
        !objectionOverruledKeywords.some(kw => lowerCaseRuling.includes(kw)) &&
        !irrelevantKeywords.some(irk => lowerCaseRuling.includes(irk))) {
        isSustainedNotWinning = true;
    }
    
    setIsLoading(false);
    setCurrentSpeaker(null);
    await delay(1000);

    if (isSustainedNotWinning) {
        addDialogueRef.current?.(CharacterRole.NARRATOR, "Your objection was noted and makes a good point! It's your turn to act again.");
        setCurrentScreenRef.current(GameScreen.PLAYER_ACTION); 
    } else { 
        addDialogueRef.current?.(CharacterRole.NARRATOR, "The Judge didn't find your objection strong enough to change the course. The Prosecutor continues.");
        setCurrentScreenRef.current(GameScreen.PROSECUTOR_ARGUMENT); 
    }
  };
  
  const submitProof = async (proofText: string) => {
    if (shouldShowTutorialRef.current?.(TutorialStep.PROOF_BOARD_MODAL_INTRO)) markTutorialStepAsComplete(TutorialStep.PROOF_BOARD_MODAL_INTRO);

    addDialogueRef.current?.(CharacterRole.DEFENSE_PLAYER, `Judge, here's why my friend is good: ${proofText}`);
    setIsProofBoardModalOpen(false);
    setIsLoading(true);
    setCurrentSpeaker(CharacterRole.JUDGE);

    if (!apiKeyAvailable) {
        addDialogueRef.current?.(CharacterRole.JUDGE, `About your story: Because of a sleepy computer, I can't decide for sure. But you tried your best!`);
        setIsLoading(false);
        setCurrentSpeaker(null);
        addDialogueRef.current?.(CharacterRole.NARRATOR, "The Judge is having trouble hearing due to a technical issue. Please try presenting your argument again when the connection is restored.");
        setCurrentScreenRef.current(GameScreen.PLAYER_ACTION);
        return;
    }
    
    const judgeAnalysis = await GeminiService.analyzePlayerArgumentOrObjection(caseData, proofText, "You (The Hero) are telling the final story to help your friend.", currentLevel);
    addDialogueRef.current?.(CharacterRole.JUDGE, `About your story: ${judgeAnalysis}`);
    await delay(2200); 

    const lowerCaseAnalysis = judgeAnalysis.toLowerCase();
    let argumentIsWinning = false;
    let argumentIsIrrelevant = false; 
    let argumentIsFlawedOrIncorrect = false;

    const generalLosingKeywords = [
        "not sure", "doesn't help", "not quite", "confusing", 
        "doesn't make sense", "still not clear", "incorrect", "flaw", 
        "fails to demonstrate", "misses the point", "mathematically unsound",
        "not convinced", "insufficient", "error in reasoning"
    ];
    const winningKeywords = [
        "sound mathematical argument", "application is correct", "that explains it", 
        "that is correct", "proves the point", "valid reasoning", "accurately identifies",
        "well argued", "convincing", "successfully demonstrates", "i agree", "persuasive",
        "clearly shows", "evidence supports this", "mathematically sound and relevant"
    ];

    for (const keyword of winningKeywords) {
        if (lowerCaseAnalysis.includes(keyword) && !irrelevantKeywords.some(irk => lowerCaseAnalysis.includes(irk)) && !generalLosingKeywords.some(lk => lowerCaseAnalysis.includes(lk))) {
            argumentIsWinning = true;
            break;
        }
    }
    if (winningKeywords.some(kw => lowerCaseAnalysis.includes(kw))) {
        if (!irrelevantKeywords.some(irk => lowerCaseAnalysis.includes(irk)) && 
            !generalLosingKeywords.some(glk => lowerCaseAnalysis.includes(glk))) {
            argumentIsWinning = true;
        }
        if (irrelevantKeywords.some(irk => lowerCaseAnalysis.includes(irk))) {
             argumentIsWinning = false; 
        }
    }

    if (argumentIsWinning) {
        const verdictText = caseData.innocentVerdictIfPlayerSucceeds;
        addDialogueRef.current?.(CharacterRole.JUDGE, `Okay, I've thought about it... ${verdictText}`);
        setIsLoading(false);
        setCurrentScreenRef.current(GameScreen.VERDICT);
        setCurrentSpeaker(null);
        await delay(2000); 
        onConcludeCaseRef.current(verdictText, 'normal');
        return;
    }

    for (const keyword of irrelevantKeywords) { 
        if (lowerCaseAnalysis.includes(keyword)) {
            argumentIsIrrelevant = true;
            break;
        }
    }

    if (argumentIsIrrelevant) {
        addDialogueRef.current?.(CharacterRole.NARRATOR, "The Judge found your argument irrelevant to the case! The Silly Prosecutor gets another chance to speak. Try to make your next argument directly answer the accusation about the math!");
        setIsLoading(false);
        setCurrentSpeaker(null);
        await delay(2500);
        setCurrentScreenRef.current(GameScreen.PROSECUTOR_ARGUMENT);
        return; 
    }

    for (const keyword of generalLosingKeywords) {
        if (lowerCaseAnalysis.includes(keyword)) {
            argumentIsFlawedOrIncorrect = true;
            break;
        }
    }

    if (argumentIsFlawedOrIncorrect) {
        addDialogueRef.current?.(CharacterRole.NARRATOR, "The Judge found issues with your mathematical reasoning. The Silly Prosecutor will respond. Try to address the mathematical error or explain your point more clearly!");
        setIsLoading(false);
        setCurrentSpeaker(null);
        await delay(2500);
        setCurrentScreenRef.current(GameScreen.PROSECUTOR_ARGUMENT);
        return;
    }
    
    addDialogueRef.current?.(CharacterRole.NARRATOR, "The Judge seems unconvinced by your argument or needs more clarity. The Silly Prosecutor gets to speak. Try to refine your mathematical explanation or present a stronger point!");
    setIsLoading(false);
    setCurrentSpeaker(null);
    await delay(2500);
    setCurrentScreenRef.current(GameScreen.PROSECUTOR_ARGUMENT);
  };

  const currentToolTutorials = PLAYER_TOOLS.map(tool => ({
    id: tool.tutorialId!,
    target: `[data-tool-id="${tool.id}"]`,
    text: `Use the ${tool.name} ${tool.icon} to ${tool.description.toLowerCase().replace('.', '')}.`
  }));
  
  const firstPendingToolTutorial = currentToolTutorials.find(tt => shouldShowTutorial(tt.id));

  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="courtroom-gradient-bg flex-grow flex flex-col p-2 sm:p-3 relative w-full overflow-hidden">
      <div id="timer-display-area" data-tutorial-target-id="courtroom-timer" className="absolute top-2 right-2 sm:top-3 sm:right-4 glassmorphic-surface p-1.5 sm:p-2.5 rounded-lg shadow-xl border border-amber-500/50 z-10">
        <p className="text-amber-300 text-base sm:text-xl md:text-2xl font-bold tracking-wider tabular-nums">{formatTime(timeLeft)}</p>
      </div>

      <div id="character-display-area" className="grid grid-cols-4 gap-1 sm:gap-2 md:gap-3 mb-1 sm:mb-2 mt-1 sm:mt-0">
        <CharacterDisplay role={CharacterRole.JUDGE} isSpeaking={currentSpeaker === CharacterRole.JUDGE} />
        <CharacterDisplay role={CharacterRole.PROSECUTOR} isSpeaking={currentSpeaker === CharacterRole.PROSECUTOR} />
        <CharacterDisplay role={CharacterRole.CO_COUNSEL} isSpeaking={currentSpeaker === CharacterRole.CO_COUNSEL} />
        <CharacterDisplay role={CharacterRole.CLIENT} isSpeaking={currentSpeaker === CharacterRole.CLIENT} />
      </div>

      <div id="dialogue-box-area" className="mb-2 sm:mb-3 flex-grow min-h-0">
        <DialogueBox dialogues={dialogueHistory} currentSpeaker={currentSpeaker} />
      </div>
      
      {isLoading && (
        <div className="py-2">
          <LoadingSpinner 
              heading="Deliberating..."
              subheading="The court is processing the information."
              compact={true}
          />
        </div>
      )}

      {!isLoading && apiKeyAvailable && (currentScreen === GameScreen.PLAYER_ACTION || currentScreen === GameScreen.PLAYER_OBJECTION_INPUT) && (
        <div id="player-actions-area" data-tutorial-target-id="player-actions-area" className="glassmorphic-surface p-2 sm:p-3 md:p-4 rounded-xl shadow-lg border border-slate-700/60">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-emerald-400 mb-2 sm:mb-3 text-center">Your Turn!</h3>
          {currentScreen === GameScreen.PLAYER_ACTION && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {PLAYER_TOOLS.map(tool => (
                <button
                  key={tool.id}
                  data-tool-id={tool.id} 
                  onClick={() => handlePlayerAction(tool.id)}
                  className="w-full bg-sky-600/50 hover:bg-sky-500/60 backdrop-blur-sm text-white font-semibold py-2 sm:py-2.5 px-3 rounded-lg shadow-md transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-75 flex items-center justify-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm md:text-base border border-sky-500/70"
                  title={tool.description}
                  disabled={isLoading}
                >
                  <span className="text-base sm:text-lg">{tool.icon}</span>
                  <span>{tool.name}</span>
                </button>
              ))}
            </div>
          )}
          {currentScreen === GameScreen.PLAYER_OBJECTION_INPUT && (
            <div className="flex flex-col items-center space-y-2.5 sm:space-y-3">
              <textarea
                id="objection-textarea" 
                data-tutorial-target-id="objection-textarea"
                value={playerObjectionText}
                onChange={(e) => setPlayerObjectionText(e.target.value)}
                placeholder="State your objection clearly... (focus on the math!)"
                className="w-full max-w-xl p-2 sm:p-2.5 bg-slate-800/70 text-slate-100 border border-slate-600/80 rounded-lg focus:ring-2 focus:ring-amber-500 shadow-inner backdrop-blur-sm text-xs sm:text-sm"
                rows={3}
                aria-label="State your objection"
                disabled={isLoading}
              />
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full max-w-xl justify-center sm:justify-end">
                <button
                  onClick={() => {
                    setCurrentScreen(GameScreen.PLAYER_ACTION);
                  }}
                  disabled={isLoading}
                  className="bg-slate-600/70 hover:bg-slate-500/70 text-white font-semibold py-2 px-4 sm:py-2.5 sm:px-5 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg disabled:opacity-50 border border-slate-500/60 text-xs sm:text-sm"
                  aria-label="Cancel objection"
                >
                  Never Mind
                </button>
                <button
                  onClick={submitObjection}
                  disabled={!playerObjectionText.trim() || isLoading}
                  className="bg-red-600/70 hover:bg-red-500/70 text-white font-bold py-2 px-4 sm:py-2.5 sm:px-5 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg border border-red-500/60 text-xs sm:text-sm"
                >
                  Object!
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {!apiKeyAvailable && !isLoading && (
         <div className="glassmorphic-surface bg-red-800/30 p-3 sm:p-4 rounded-lg shadow-xl border border-red-600/50 text-center">
            <p className="text-lg sm:text-xl font-semibold text-red-300 mb-2">{API_KEY_ERROR_MESSAGE}</p>
            <p className="text-slate-200 text-sm sm:text-base mb-3">The AI characters can't participate without the API Key. Please notify an administrator.</p>
            <button 
              onClick={() => onConcludeCaseRef.current("Game Over - API Key missing.", 'normal')} 
              className="mt-2 bg-amber-500/70 hover:bg-amber-600/70 text-slate-900 font-bold py-2 sm:py-2.5 px-4 sm:px-5 rounded-lg shadow-md hover:shadow-lg transition-colors border border-amber-400/60 text-sm sm:text-base"
            >
                End Game
            </button>
        </div>
      )}

      {currentLevel === 1 && !allTutorialsSkipped && (
        <>
          {shouldShowTutorial(TutorialStep.COURTROOM_WELCOME) && currentScreen === GameScreen.TRIAL_INTRO && dialogueHistory.length === 0 && (
            <InteractiveTutorialHint tutorialId={TutorialStep.COURTROOM_WELCOME} isActive={true} targetSelector={() => document.querySelector('.courtroom-gradient-bg')} title="Welcome to the Courtroom!" text="The game is starting! Listen to what everyone says and look at the clues." position="center" onDismiss={() => markTutorialStepAsComplete(TutorialStep.COURTROOM_WELCOME)} onSkipAll={onSkipAll} showSkipAllButton={true} highlightTarget={false} overlayClassName="bg-slate-950/80 backdrop-blur-xl" onVisibilityChange={handleTutorialVisibilityChange}/>
          )}
          {shouldShowTutorial(TutorialStep.COURTROOM_CHARACTERS) && currentScreen === GameScreen.TRIAL_INTRO && dialogueHistory.some(d => d.speaker === CharacterRole.NARRATOR && d.text.startsWith("Let's start the game")) && (
            <InteractiveTutorialHint tutorialId={TutorialStep.COURTROOM_CHARACTERS} isActive={true} targetSelector="#character-display-area" title="Who's Who?" text="These are the characters. The one talking will light up!" position="bottom" onDismiss={() => markTutorialStepAsComplete(TutorialStep.COURTROOM_CHARACTERS)} onSkipAll={onSkipAll} showSkipAllButton={true} overlayClassName="bg-slate-950/80 backdrop-blur-xl" onVisibilityChange={handleTutorialVisibilityChange} highlightTarget={true} />
          )}
          {shouldShowTutorial(TutorialStep.COURTROOM_DIALOGUE_BOX) && currentScreen === GameScreen.TRIAL_INTRO && dialogueHistory.some(d => d.speaker === CharacterRole.JUDGE && d.text.includes("you can start.")) && (
            <InteractiveTutorialHint tutorialId={TutorialStep.COURTROOM_DIALOGUE_BOX} isActive={true} targetSelector="#dialogue-box-area" title="Talking Box!" text="Everyone's words show up here. Read what they say!" position="top" onDismiss={() => markTutorialStepAsComplete(TutorialStep.COURTROOM_DIALOGUE_BOX)} onSkipAll={onSkipAll} showSkipAllButton={true} overlayClassName="bg-slate-950/80 backdrop-blur-xl" onVisibilityChange={handleTutorialVisibilityChange} highlightTarget={true} />
          )}
          {shouldShowTutorial(TutorialStep.COURTROOM_TIMER_INTRO) && currentScreen === GameScreen.TRIAL_INTRO && isTutorialStepComplete(TutorialStep.COURTROOM_DIALOGUE_BOX) && ( 
            <InteractiveTutorialHint tutorialId={TutorialStep.COURTROOM_TIMER_INTRO} isActive={true} targetSelector="#timer-display-area" title="Time is Ticking!" text="Watch the timer! You need to solve the case before it runs out. It starts when it's your turn!" position="center" onDismiss={() => markTutorialStepAsComplete(TutorialStep.COURTROOM_TIMER_INTRO)} onSkipAll={onSkipAll} showSkipAllButton={true} overlayClassName="bg-slate-950/80 backdrop-blur-xl" onVisibilityChange={handleTutorialVisibilityChange} highlightTarget={true} />
          )}
          {proofBoardVisibilityCount >= 3 && shouldShowTutorial(TutorialStep.COURTROOM_PLAYER_ACTIONS_INTRO) && currentScreen === GameScreen.PLAYER_ACTION && isTutorialStepComplete(TutorialStep.COURTROOM_TIMER_INTRO) && (
             <InteractiveTutorialHint tutorialId={TutorialStep.COURTROOM_PLAYER_ACTIONS_INTRO} isActive={true} targetSelector="[data-tutorial-target-id='player-actions-area']" title="Your Turn!" text="Now it's your turn! Use the buttons below." position="top" onDismiss={() => markTutorialStepAsComplete(TutorialStep.COURTROOM_PLAYER_ACTIONS_INTRO)} onSkipAll={onSkipAll} showSkipAllButton={true} overlayClassName="bg-slate-950/80 backdrop-blur-xl" onVisibilityChange={handleTutorialVisibilityChange} highlightTarget={true} />
          )}
          {shouldShowTutorial(TutorialStep.COURTROOM_OBJECTION_INPUT) && currentScreen === GameScreen.PLAYER_OBJECTION_INPUT && (
             <InteractiveTutorialHint tutorialId={TutorialStep.COURTROOM_OBJECTION_INPUT} isActive={true} targetSelector="[data-tutorial-target-id='objection-textarea']" title="Say 'Wait a Minute!'" text="Type why you think the Silly Prosecutor is wrong. Use easy words!" position="top" onDismiss={() => markTutorialStepAsComplete(TutorialStep.COURTROOM_OBJECTION_INPUT)} onSkipAll={onSkipAll} showSkipAllButton={true} overlayClassName="bg-slate-950/80 backdrop-blur-xl" onVisibilityChange={handleTutorialVisibilityChange} highlightTarget={true} />
          )}
        </>
      )}

      <EvidenceModal
        isOpen={isEvidenceModalOpen}
        onClose={() => {setIsEvidenceModalOpen(false); setShowEvidenceModalTutorial(false);}}
        evidenceList={caseData.evidence}
        selectedEvidenceId={selectedEvidenceId}
        onSelectEvidence={setSelectedEvidenceId}
        apiKeyAvailable={apiKeyAvailable}
        showTutorial={showEvidenceModalTutorial && shouldShowTutorial(TutorialStep.EVIDENCE_MODAL_INTRO)}
        onDismissTutorial={() => {
            markTutorialStepAsComplete(TutorialStep.EVIDENCE_MODAL_INTRO);
            setShowEvidenceModalTutorial(false);
        }}
        onTutorialVisibilityChange={handleTutorialVisibilityChange}
        onSkipAllTutorials={onSkipAll} // Pass global skip
      />
      <ProofBoardModal
        isOpen={isProofBoardModalOpen}
        onClose={() => {setIsProofBoardModalOpen(false); setShowProofBoardModalTutorial(false);}}
        onSubmitProof={submitProof}
        isLoading={isLoading}
        showTutorial={showProofBoardModalTutorial && shouldShowTutorial(TutorialStep.PROOF_BOARD_MODAL_INTRO)}
        onDismissTutorial={() => {
            markTutorialStepAsComplete(TutorialStep.PROOF_BOARD_MODAL_INTRO);
            setShowProofBoardModalTutorial(false);
        }}
        onTutorialVisibilityChange={handleTutorialVisibilityChange}
        onSkipAllTutorials={onSkipAll} // Pass global skip
      />
    </div>
  );
};

export default Courtroom;
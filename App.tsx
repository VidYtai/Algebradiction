import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { GameScreen, CaseData, TutorialStep, LearningEntry, User } from './types';
import { 
  API_KEY_ERROR_MESSAGE, 
  TUTORIAL_LOCAL_STORAGE_KEY_BASE, 
  ALL_TUTORIAL_STEPS_COMPLETED_KEY_BASE,
  LEARNINGS_LOCAL_STORAGE_KEY_BASE,
  CLASS_8_MAX_PLAYER_LEVEL,
  CLASS_9_MAX_PLAYER_LEVEL,
  CURRENT_LEVEL_LOCAL_STORAGE_KEY_BASE,
  USERS_ACCOUNTS_LOCAL_STORAGE_KEY,
  LAST_LOGGED_IN_USER_KEY,
  getUserSpecificKey,
  CLASS_8_TOPIC_INDEX_KEY_BASE,
  CLASS_9_TOPIC_INDEX_KEY_BASE,
  CLASS_10_TOPIC_INDEX_KEY_BASE,
} from './constants';
import * as GeminiService from './services/geminiService';
import AuthScreen from './components/AuthScreen';
import Courtroom from './components/Courtroom';
import Header from './components/Header';
// import Footer from './components/Footer'; // Removed Footer import
import InteractiveTutorialHint from './components/InteractiveTutorialHint';
import LoadingSpinner from './components/LoadingSpinner';
import LearningsModal from './components/LearningsModal';

const APP_API_KEY = "AIzaSyCoHj3OwEbxQqcLvWeHORAzWBPvjX3_61k";

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentScreen, setCurrentScreen] = useState<GameScreen>(GameScreen.AUTH); 
  const [authScreenMode, setAuthScreenMode] = useState<'login' | 'signup'>('login');
  const [currentCase, setCurrentCase] = useState<CaseData | null>(null);
  const [finalVerdict, setFinalVerdict] = useState<string | null>(null);
  const [apiKeyAvailable, setApiKeyAvailable] = useState<boolean>(true);
  const [isLoadingCase, setIsLoadingCase] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(false);
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [caseError, setCaseError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [completedTutorialSteps, setCompletedTutorialSteps] = useState<Set<TutorialStep>>(new Set());
  const [allTutorialsSkipped, setAllTutorialsSkipped] = useState<boolean>(false);

  const [learnings, setLearnings] = useState<LearningEntry[]>([]);
  const [isLearningsModalOpen, setIsLearningsModalOpen] = useState<boolean>(false);
  
  useEffect(() => {
    if (!APP_API_KEY) {
      setApiKeyAvailable(false);
    } else {
      setApiKeyAvailable(true);
    }

    const lastUser = localStorage.getItem(LAST_LOGGED_IN_USER_KEY);
    if (lastUser) {
      const users = JSON.parse(localStorage.getItem(USERS_ACCOUNTS_LOCAL_STORAGE_KEY) || '{}') as Record<string, User>;
      if (users[lastUser]) {
        setCurrentUser(lastUser); 
      } else {
        localStorage.removeItem(LAST_LOGGED_IN_USER_KEY); 
        setCurrentUser(null); 
        setCurrentScreen(GameScreen.AUTH);
        setAuthScreenMode('login');
      }
    } else {
      setCurrentUser(null); 
      setCurrentScreen(GameScreen.AUTH);
      setAuthScreenMode('login');
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      setAuthError(null); 

      const levelKey = getUserSpecificKey(CURRENT_LEVEL_LOCAL_STORAGE_KEY_BASE, currentUser);
      const savedLevel = localStorage.getItem(levelKey);
      setCurrentLevel(savedLevel ? parseInt(savedLevel, 10) : 1);

      const learningsKey = getUserSpecificKey(LEARNINGS_LOCAL_STORAGE_KEY_BASE, currentUser);
      const storedLearnings = localStorage.getItem(learningsKey);
      if (storedLearnings) {
        try {
          const parsedLearnings = JSON.parse(storedLearnings) as LearningEntry[];
          if (Array.isArray(parsedLearnings) && (parsedLearnings.length === 0 || (typeof parsedLearnings[0] === 'object' && 'level' in parsedLearnings[0]))) {
            setLearnings(parsedLearnings);
          } else { localStorage.removeItem(learningsKey); setLearnings([]); }
        } catch { localStorage.removeItem(learningsKey); setLearnings([]); }
      } else {
        setLearnings([]);
      }

      const tutorialKey = getUserSpecificKey(TUTORIAL_LOCAL_STORAGE_KEY_BASE, currentUser);
      const storedCompletedSteps = localStorage.getItem(tutorialKey);
      if (storedCompletedSteps) {
        try { 
          setCompletedTutorialSteps(new Set(JSON.parse(storedCompletedSteps)) as Set<TutorialStep>);
        } catch { localStorage.removeItem(tutorialKey); setCompletedTutorialSteps(new Set());}
      } else {
        setCompletedTutorialSteps(new Set());
      }
      
      const skippedAllKey = getUserSpecificKey(ALL_TUTORIAL_STEPS_COMPLETED_KEY_BASE, currentUser);
      setAllTutorialsSkipped(localStorage.getItem(skippedAllKey) === 'true');
      
      if (currentScreen === GameScreen.AUTH) {
         setCurrentScreen(GameScreen.GENERATING_CASE);
      }
    } else {
      setCurrentLevel(1);
      setLearnings([]);
      setCompletedTutorialSteps(new Set());
      setAllTutorialsSkipped(false);
      setCurrentCase(null);
      setFinalVerdict(null);
      setAuthScreenMode('login');
      
      if (currentScreen !== GameScreen.AUTH) {
          setCurrentScreen(GameScreen.AUTH);
      }
    }
  }, [currentUser, currentScreen]);


  const markTutorialStepAsComplete = useCallback((step: TutorialStep) => {
    if (!currentUser) return;
    setCompletedTutorialSteps(prev => {
      const newSet = new Set(prev);
      newSet.add(step);
      localStorage.setItem(getUserSpecificKey(TUTORIAL_LOCAL_STORAGE_KEY_BASE, currentUser), JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  }, [currentUser]);
  
  const skipAllTutorials = useCallback(() => {
    if (!currentUser) return;
    const allSteps = Object.values(TutorialStep);
    setCompletedTutorialSteps(new Set(allSteps));
    localStorage.setItem(getUserSpecificKey(TUTORIAL_LOCAL_STORAGE_KEY_BASE, currentUser), JSON.stringify(allSteps));
    localStorage.setItem(getUserSpecificKey(ALL_TUTORIAL_STEPS_COMPLETED_KEY_BASE, currentUser), 'true');
    setAllTutorialsSkipped(true);
  }, [currentUser]);

  const isTutorialStepComplete = useCallback((step: TutorialStep): boolean => {
    if (!currentUser) return true; 
    if (allTutorialsSkipped || currentLevel > 1 && step !== TutorialStep.HEADER_MY_LEARNINGS) return true;
    if (step === TutorialStep.HEADER_MY_LEARNINGS && (allTutorialsSkipped || (currentLevel > 2 && completedTutorialSteps.has(step)))) return true;
    return completedTutorialSteps.has(step);
  }, [completedTutorialSteps, allTutorialsSkipped, currentLevel, currentUser]);

  useLayoutEffect(() => {
    const headerEl = document.querySelector('header');
    if (headerEl) document.documentElement.style.setProperty('--header-height', `${headerEl.offsetHeight}px`);
    // Removed footer height logic
  }, [currentScreen, currentUser]); 


  const determineTargetClass = (level: number): number => {
    if (level <= CLASS_8_MAX_PLAYER_LEVEL) return 8;
    if (level <= CLASS_9_MAX_PLAYER_LEVEL) return 9;
    return 10;
  };

  const generateNewCase = useCallback(async (level: number) => {
    if (!currentUser) {
      return;
    }
    if (!apiKeyAvailable) {
      setCaseError(API_KEY_ERROR_MESSAGE + " Cannot generate new cases.");
      setIsLoadingCase(false);
      return;
    }
    setIsLoadingCase(true);
    setCaseError(null);
    try {
      const targetClass = determineTargetClass(level);
      const newCase = await GeminiService.generateCaseData(level, targetClass, currentUser);
      setCurrentCase(newCase);
      setFinalVerdict(null); 
      setCurrentScreen(GameScreen.CASE_BRIEFING);
    } catch (error) {
      console.error("Failed to generate case:", error);
      setCaseError(`Oops! The case files got stuck. (${error instanceof Error ? error.message : 'Unknown error'}). Try refreshing?`);
      setCurrentScreen(GameScreen.GENERATING_CASE); 
    } finally {
      setIsLoadingCase(false);
    }
  }, [apiKeyAvailable, currentUser]);

  useEffect(() => {
    if (currentUser && currentScreen === GameScreen.GENERATING_CASE && !isLoadingCase && !currentCase && !caseError) {
      generateNewCase(currentLevel);
    }
  }, [currentScreen, isLoadingCase, currentCase, currentLevel, generateNewCase, caseError, currentUser]);
  
  const handleStartTrial = useCallback(() => {
    if (currentCase && currentUser) {
      if(currentLevel === 1 && !allTutorialsSkipped && !completedTutorialSteps.has(TutorialStep.CASE_BRIEFING_PROCEED_BUTTON)) {
         markTutorialStepAsComplete(TutorialStep.CASE_BRIEFING_PROCEED_BUTTON); 
      }
      setCurrentScreen(GameScreen.TRIAL_INTRO);
    }
  }, [currentCase, markTutorialStepAsComplete, allTutorialsSkipped, currentLevel, completedTutorialSteps, currentUser]);

  const handleConcludeCase = useCallback((verdict: string, reason?: 'timeup' | 'normal') => {
    if (!currentUser) return;

    setFinalVerdict(verdict);
    setCurrentScreen(GameScreen.VERDICT);
    
    const playerWon = currentCase && verdict === currentCase.innocentVerdictIfPlayerSucceeds;
    const levelCaseWasPlayedAt = currentLevel;

    if (reason !== 'timeup' && playerWon && currentCase) {
      const newLearningTextsForThisLevel = new Set<string>();
      currentCase.keyConcepts.forEach(concept => {
        newLearningTextsForThisLevel.add(`Key Concept from "${currentCase.title}": ${concept}.`);
      });
  
      const flawedEvidence = currentCase.evidence.find(e => e.isFlawed);
      if (flawedEvidence && flawedEvidence.flawDescription) {
        newLearningTextsForThisLevel.add(`Understood from "${currentCase.title}": ${flawedEvidence.flawDescription}`);
      }
      
      setLearnings(prevLearnings => {
        const updatedLearnings = [...prevLearnings];
        newLearningTextsForThisLevel.forEach(learningText => {
          if (!updatedLearnings.some(l => l.level === levelCaseWasPlayedAt && l.text === learningText)) {
            updatedLearnings.push({ level: levelCaseWasPlayedAt, text: learningText, timestamp: Date.now() });
          }
        });
        localStorage.setItem(getUserSpecificKey(LEARNINGS_LOCAL_STORAGE_KEY_BASE, currentUser), JSON.stringify(updatedLearnings));
        return updatedLearnings;
      });
    }

    if (playerWon) {
      setCurrentLevel(prevLevel => {
        const newLevel = prevLevel + 1;
        localStorage.setItem(getUserSpecificKey(CURRENT_LEVEL_LOCAL_STORAGE_KEY_BASE, currentUser), newLevel.toString());
        return newLevel;
      });
    }
  }, [currentCase, currentLevel, currentUser ]); 

  const startNextCase = () => {
    if (!currentUser) {
      return;
    }
    setCurrentCase(null); 
    setFinalVerdict(null);
    setCurrentScreen(GameScreen.GENERATING_CASE); 
  };

  const shouldShowTutorialStep = useCallback((step: TutorialStep) => {
    if (!currentUser) return false;
    return currentLevel === 1 && !allTutorialsSkipped && !completedTutorialSteps.has(step);
  }, [currentLevel, allTutorialsSkipped, completedTutorialSteps, currentUser]);


  const showHeaderLearningsTutorial = useCallback(() => {
    if (!currentUser) return false;
    return currentLevel === 2 && 
        learnings.some(l => l.level === 1) && 
        !allTutorialsSkipped && 
        !completedTutorialSteps.has(TutorialStep.HEADER_MY_LEARNINGS);
  }, [currentLevel, learnings, allTutorialsSkipped, completedTutorialSteps, currentUser]);

  const handleLogin = async (usernameInput: string, passwordInput: string) => {
    setIsLoadingAuth(true);
    setAuthError(null);
    await new Promise(resolve => setTimeout(resolve, 300)); 

    const users = JSON.parse(localStorage.getItem(USERS_ACCOUNTS_LOCAL_STORAGE_KEY) || '{}') as Record<string, User>;
    const user = users[usernameInput];

    if (user && user.passwordHash === passwordInput) { 
      setCurrentUser(usernameInput); 
      localStorage.setItem(LAST_LOGGED_IN_USER_KEY, usernameInput);
    } else {
      setAuthError("Invalid username or password.");
    }
    setIsLoadingAuth(false);
  };

  const handleSignUp = async (usernameInput: string, passwordInput: string) => {
    setIsLoadingAuth(true);
    setAuthError(null);
    await new Promise(resolve => setTimeout(resolve, 300)); 

    let users = JSON.parse(localStorage.getItem(USERS_ACCOUNTS_LOCAL_STORAGE_KEY) || '{}') as Record<string, User>;

    if (users[usernameInput]) {
      setAuthError("Username already exists. Please choose another or login.");
      setIsLoadingAuth(false);
      return;
    }

    users[usernameInput] = { username: usernameInput, passwordHash: passwordInput }; 
    localStorage.setItem(USERS_ACCOUNTS_LOCAL_STORAGE_KEY, JSON.stringify(users));

    localStorage.setItem(getUserSpecificKey(CURRENT_LEVEL_LOCAL_STORAGE_KEY_BASE, usernameInput), "1");
    localStorage.setItem(getUserSpecificKey(LEARNINGS_LOCAL_STORAGE_KEY_BASE, usernameInput), JSON.stringify([]));
    localStorage.setItem(getUserSpecificKey(TUTORIAL_LOCAL_STORAGE_KEY_BASE, usernameInput), JSON.stringify([]));
    localStorage.setItem(getUserSpecificKey(ALL_TUTORIAL_STEPS_COMPLETED_KEY_BASE, usernameInput), "false");
    localStorage.setItem(getUserSpecificKey(CLASS_8_TOPIC_INDEX_KEY_BASE, usernameInput), "0");
    localStorage.setItem(getUserSpecificKey(CLASS_9_TOPIC_INDEX_KEY_BASE, usernameInput), "0");
    localStorage.setItem(getUserSpecificKey(CLASS_10_TOPIC_INDEX_KEY_BASE, usernameInput), "0");

    setCurrentUser(usernameInput); 
    localStorage.setItem(LAST_LOGGED_IN_USER_KEY, usernameInput);
    setIsLoadingAuth(false);
  };

  const handleLogout = () => {
    setCurrentUser(null); 
    localStorage.removeItem(LAST_LOGGED_IN_USER_KEY);
    setCurrentScreen(GameScreen.AUTH); 
    setAuthScreenMode('login');
  };
  
  const toggleAuthMode = () => {
    setAuthScreenMode(prevMode => (prevMode === 'login' ? 'signup' : 'login'));
    setAuthError(null); 
  };

  const handleHeaderAuthAction = () => {
    if (currentScreen !== GameScreen.AUTH) {
      setCurrentScreen(GameScreen.AUTH);
      setAuthScreenMode('login'); 
      setAuthError(null);
    } else {
      toggleAuthMode();
    }
  };
  
  if (currentScreen === GameScreen.AUTH && currentUser) {
     return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 text-center">
             <LoadingSpinner heading="Loading Your Profile..." subheading="Please wait." />
        </div>
     );
  }

  if (currentScreen === GameScreen.AUTH && !currentUser) {
    return (
      <div className="flex flex-col flex-grow min-h-0 bg-slate-950 text-slate-200"> {/* Changed min-h-screen to flex-grow min-h-0 */}
         <Header 
            currentLevel={currentLevel} 
            onToggleLearningsModal={() => setIsLearningsModalOpen(prev => !prev)}
            showLearningsTutorial={false}
            onDismissLearningsTutorial={() => {}}
            learningsCount={0}
            currentUser={null}
            onLogout={handleLogout}
            onHeaderAuthAction={handleHeaderAuthAction}
          />
        <main className="flex-grow flex flex-col items-center justify-center w-full p-4 overflow-y-auto min-h-0"> {/* Added overflow-y-auto min-h-0 */}
          <AuthScreen 
            mode={authScreenMode}
            onToggleMode={toggleAuthMode}
            onLogin={handleLogin} 
            onSignUp={handleSignUp} 
            authError={authError} 
            isLoading={isLoadingAuth} 
          />
        </main>
        {/* <Footer /> Removed Footer */}
      </div>
    );
  }
  
  if (!currentUser && currentScreen !== GameScreen.AUTH) {
    // This case should ideally be handled by useEffect redirecting to AUTH.
    // However, as a fallback render:
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 text-center">
             <LoadingSpinner heading="Redirecting to Login..." subheading="Please wait." />
        </div>
    );
  }


  if (!apiKeyAvailable && currentScreen === GameScreen.GENERATING_CASE && caseError && currentUser) {
     return (
        <div className="flex flex-col flex-grow min-h-0 bg-slate-950 text-slate-200"> {/* Changed min-h-screen to flex-grow min-h-0 */}
             <Header 
                currentLevel={currentLevel} 
                onToggleLearningsModal={() => setIsLearningsModalOpen(prev => !prev)}
                showLearningsTutorial={showHeaderLearningsTutorial()}
                onDismissLearningsTutorial={() => markTutorialStepAsComplete(TutorialStep.HEADER_MY_LEARNINGS)}
                learningsCount={learnings.length}
                currentUser={currentUser}
                onLogout={handleLogout}
                onHeaderAuthAction={handleHeaderAuthAction}
             />
            <main className="flex-grow flex flex-col items-center justify-center w-full p-4 overflow-y-auto min-h-0"> {/* Added overflow-y-auto min-h-0 */}
                <div className="flex flex-col items-center justify-center p-6 text-center max-w-lg glassmorphic-surface rounded-xl border-red-500/50">
                    <h1 className="text-2xl sm:text-3xl font-bold text-red-400 mb-4">Critical Error</h1>
                    <p className="text-lg sm:text-xl text-slate-200 mb-6">{caseError}</p>
                    <p className="text-sm sm:text-md text-slate-400">Please ensure the API key is correctly configured and refresh the application.</p>
                 </div>
            </main>
            {/* <Footer /> Removed Footer */}
        </div>
     );
  }


  return (
    <div className="flex flex-col flex-grow min-h-0 bg-slate-950 text-slate-200"> {/* Changed min-h-screen to flex-grow min-h-0 */}
      <Header 
        currentLevel={currentLevel} 
        onToggleLearningsModal={() => setIsLearningsModalOpen(prev => !prev)}
        showLearningsTutorial={showHeaderLearningsTutorial()}
        onDismissLearningsTutorial={() => markTutorialStepAsComplete(TutorialStep.HEADER_MY_LEARNINGS)}
        learningsCount={learnings.length}
        currentUser={currentUser} 
        onLogout={handleLogout}
        onHeaderAuthAction={handleHeaderAuthAction}
      />
      <main className="flex-grow flex flex-col w-full overflow-y-auto min-h-0"> {/* Added overflow-y-auto min-h-0 */}
        {isLoadingCase && currentScreen === GameScreen.GENERATING_CASE && currentUser && (
          <div className="flex flex-col flex-grow items-center justify-center text-center p-4 sm:p-8">
            <LoadingSpinner 
                heading={`Summoning Case Files for Level ${currentLevel}...`}
                subheading="The court clerk is searching diligently."
            />
            {caseError && <p className="text-red-400 mt-4 text-sm">{caseError}</p>}
          </div>
        )}

        {!isLoadingCase && currentScreen === GameScreen.GENERATING_CASE && caseError && currentUser && (
            <div className="flex flex-col flex-grow items-center justify-center text-center p-4 sm:p-8">
              <div className="glassmorphic-surface p-6 md:p-8 rounded-xl border-red-500/50">
                <h2 className="text-xl sm:text-2xl font-semibold text-red-400 mb-3">Case Generation Error</h2>
                <p className="text-slate-300 mb-4 max-w-md">{caseError}</p>
                <button
                onClick={() => generateNewCase(currentLevel)}
                className="bg-sky-600 hover:bg-sky-700/90 text-white font-semibold py-2.5 px-6 rounded-lg shadow-md hover:shadow-lg transition-colors text-base border border-sky-500/70"
                >
                Try Again
                </button>
              </div>
            </div>
        )}

        {currentScreen === GameScreen.CASE_BRIEFING && currentCase && !finalVerdict && currentUser && (
          <div id="case-briefing-panel" className="w-full max-w-3xl mx-auto p-4 sm:p-6 md:p-8 glassmorphic-surface rounded-xl shadow-xl my-4 sm:my-6 animate-fadeIn border-violet-500/50">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-violet-400 mb-2 text-center">Case Briefing: "{currentCase.title}"</h2>
            <p className="text-xs sm:text-sm text-center text-slate-400 mb-4 sm:mb-6">(Level {currentLevel} - {currentCase.classLevel})</p>
            
            <div className="space-y-3 sm:space-y-4 text-slate-200 text-sm sm:text-base">
              <p><strong className="text-sky-400 font-semibold">Your Friend:</strong> {currentCase.clientName} - {currentCase.clientDescription}</p>
              <p><strong className="text-red-400 font-semibold">The Problem:</strong> {currentCase.accusation}</p>
              <p><strong className="text-amber-400 font-semibold">The Silly Prosecutor Says:</strong> "{currentCase.initialProsecutionArgument}"</p>
              <p><strong className="text-emerald-400 font-semibold">Your Super Helper Suggests:</strong> "{currentCase.initialCoCounselHint}"</p>
              <p><strong className="text-violet-300 font-semibold">Key Ideas to Think About:</strong> {currentCase.keyConcepts.join(', ')}.</p>
               <p className="text-xs sm:text-sm text-slate-500 italic mt-3 text-center">You'll have {currentCase.caseDurationMinutes} minute{currentCase.caseDurationMinutes !== 1 ? 's' : ''} to solve this once the trial starts!</p>
            </div>
            
            <div className="mt-6 sm:mt-8 text-center">
              <button
                id="proceed-to-trial-button"
                onClick={handleStartTrial}
                className="bg-violet-600 hover:bg-violet-700/90 text-white font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 text-base sm:text-lg border border-violet-500/70"
              >
                Let's Go to Court!
              </button>
            </div>
            {shouldShowTutorialStep(TutorialStep.CASE_BRIEFING_INTRO) && (
                <InteractiveTutorialHint
                    tutorialId={TutorialStep.CASE_BRIEFING_INTRO}
                    isActive={true}
                    targetSelector="#case-briefing-panel" 
                    title="Time for a New Case!"
                    text="Read all about your new case here. See who your friend is, what the Silly Prosecutor says, and get a hint from your Super Helper!"
                    position="center"
                    onDismiss={() => markTutorialStepAsComplete(TutorialStep.CASE_BRIEFING_INTRO)}
                    highlightTarget={true} // Changed to true
                    showSkipAllButton={true}
                    onSkipAll={skipAllTutorials}
                    overlayClassName="bg-slate-950/70 backdrop-blur-lg"
                />
            )}
            {shouldShowTutorialStep(TutorialStep.CASE_BRIEFING_PROCEED_BUTTON) && completedTutorialSteps.has(TutorialStep.CASE_BRIEFING_INTRO) && (
                 <InteractiveTutorialHint
                    tutorialId={TutorialStep.CASE_BRIEFING_PROCEED_BUTTON}
                    isActive={true}
                    targetSelector="#proceed-to-trial-button"
                    title="Ready to Start?"
                    text="When you've read everything, click this button to go to the courtroom and help your friend!"
                    position="bottom"
                    onDismiss={() => markTutorialStepAsComplete(TutorialStep.CASE_BRIEFING_PROCEED_BUTTON)}
                    highlightTarget={true}
                    showSkipAllButton={true}
                    onSkipAll={skipAllTutorials}
                    overlayClassName="bg-slate-950/70 backdrop-blur-lg"
                />
            )}
          </div>
        )}

        {currentScreen !== GameScreen.AUTH && currentScreen !== GameScreen.GENERATING_CASE && currentScreen !== GameScreen.CASE_BRIEFING && currentScreen !== GameScreen.VERDICT && currentCase && currentUser && (
          <Courtroom 
            caseData={currentCase} 
            onConcludeCase={handleConcludeCase} 
            apiKeyAvailable={apiKeyAvailable}
            isTutorialStepComplete={isTutorialStepComplete}
            markTutorialStepAsComplete={markTutorialStepAsComplete}
            allTutorialsSkipped={allTutorialsSkipped}
            currentLevel={currentLevel}
            onSkipAll={skipAllTutorials} // Pass skipAllTutorials
          />
        )}
        
        {currentScreen === GameScreen.VERDICT && finalVerdict && currentUser && (
          <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 md:p-8 glassmorphic-surface rounded-xl shadow-2xl my-4 sm:my-8 text-center animate-fadeIn border-2 border-amber-500/60">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-3 sm:mb-4">
                <span className="text-amber-400">Case </span>
                <span className="text-slate-100">Closed!</span>
            </h2>
            <div className="my-4 sm:my-6 p-3 sm:p-4 bg-slate-800/60 backdrop-blur-sm rounded-lg shadow-inner border border-slate-700/50">
                <p className="text-lg sm:text-xl md:text-2xl text-amber-300 font-semibold">{finalVerdict}</p>
            </div>
            {currentCase && finalVerdict === currentCase.innocentVerdictIfPlayerSucceeds && (
                <p className="text-emerald-400 text-md sm:text-lg mb-5 sm:mb-6 animate-pulse">🎉 You did it! Your friend is safe! You leveled up! 🎉</p>
            )}
            {currentCase && finalVerdict !== currentCase.innocentVerdictIfPlayerSucceeds && (
                 <p className="text-red-400 text-md sm:text-lg mb-5 sm:mb-6">😢 Oh no! Better luck next time. You'll stay at Level {currentLevel}.</p>
            )}
            <button
              onClick={startNextCase}
              className="bg-emerald-600 hover:bg-emerald-700/90 text-white font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 text-base sm:text-lg border border-emerald-500/70"
            >
              Start Next Case (Level {currentCase && finalVerdict === currentCase.innocentVerdictIfPlayerSucceeds ? currentLevel : currentLevel})
            </button>
          </div>
        )}
      </main>
      {/* <Footer /> Removed Footer */}
      {currentUser && 
        <LearningsModal 
            isOpen={isLearningsModalOpen}
            onClose={() => setIsLearningsModalOpen(false)}
            learnings={learnings} 
        />
      }
    </div>
  );
};

export default App;
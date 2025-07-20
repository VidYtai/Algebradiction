
import { CaseData, Evidence, PlayerTool, TutorialStep } from './types';

export const API_KEY_ERROR_MESSAGE = "Oh no! The magic AI key is missing. The AI characters can't talk without it!";

export const PLAYER_TOOLS: PlayerTool[] = [
  { id: 'evidence_terminal', name: 'Clue Checker', description: 'Look at all the pictures and clues.', icon: '🔍', tutorialId: TutorialStep.COURTROOM_TOOL_EVIDENCE },
  { id: 'proof_board', name: 'My Story Board', description: 'Tell your story to help your friend.', icon: '💡', tutorialId: TutorialStep.COURTROOM_TOOL_PROOF_BOARD },
  { id: 'objection_system', name: 'Wait a Minute!', description: 'Say "Wait!" if the Silly Prosecutor says something not right.', icon: '🗣️', tutorialId: TutorialStep.COURTROOM_TOOL_OBJECTION },
];

export const GEMINI_MODEL_TEXT = 'gemini-2.5-flash';
export const GEMINI_MODEL_IMAGE = 'imagen-3.0-generate-002';

// Base localStorage Keys (will be combined with username)
export const TUTORIAL_LOCAL_STORAGE_KEY_BASE = 'algebradictionTutorialCompletedSteps_v1';
export const ALL_TUTORIAL_STEPS_COMPLETED_KEY_BASE = 'algebradictionAllTutorialsDone_v1';
export const LEARNINGS_LOCAL_STORAGE_KEY_BASE = 'algebradictionLearnings_v1';
export const CURRENT_LEVEL_LOCAL_STORAGE_KEY_BASE = 'algebradictionCurrentLevel_v1';
export const CLASS_8_TOPIC_INDEX_KEY_BASE = 'algebradictionClass8TopicIndex_v1';
export const CLASS_9_TOPIC_INDEX_KEY_BASE = 'algebradictionClass9TopicIndex_v1';
export const CLASS_10_TOPIC_INDEX_KEY_BASE = 'algebradictionClass10TopicIndex_v1';

// Keys for user account system
export const USERS_ACCOUNTS_LOCAL_STORAGE_KEY = 'algebradictionUsers_v1';
export const LAST_LOGGED_IN_USER_KEY = 'algebradictionLastLoggedInUser_v1';

// Helper function to generate user-specific localStorage keys
export const getUserSpecificKey = (baseKey: string, username: string | null): string => {
  if (!username) {
    // This case should ideally not happen if a user context is expected.
    // Fallback to a generic key or handle error, but for now, append "guest" or similar
    // to avoid clashes if some data is saved without a user.
    // However, the design is that all user data IS tied to a user.
    // console.warn(`Generating key for ${baseKey} without a username.`);
    return `${baseKey}_guest`; // Or throw an error if username must always be present
  }
  return `${baseKey}_${username}`;
};

export const INITIAL_CASE_DURATION_MINUTES = 5; 
export const DURATION_DECREMENT_PER_LEVEL_MINUTES = 0.25; 
export const MIN_CASE_DURATION_MINUTES = 1.5; 

export const CLASS_8_MAX_PLAYER_LEVEL = 10; 
export const CLASS_9_MAX_PLAYER_LEVEL = 20;
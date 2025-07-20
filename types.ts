
export enum GameScreen {
  AUTH = 'AUTH', // Screen for login/signup
  GENERATING_CASE = 'GENERATING_CASE',
  CASE_BRIEFING = 'CASE_BRIEFING',
  TRIAL_INTRO = 'TRIAL_INTRO',
  PROSECUTOR_ARGUMENT = 'PROSECUTOR_ARGUMENT',
  CO_COUNSEL_ADVICE = 'CO_COUNSEL_ADVICE',
  PLAYER_ACTION = 'PLAYER_ACTION',
  PLAYER_OBJECTION_INPUT = 'PLAYER_OBJECTION_INPUT',
  PLAYER_DEFENSE_INPUT = 'PLAYER_DEFENSE_INPUT',
  VERDICT = 'VERDICT',
}

export enum CharacterRole {
  JUDGE = 'The Judge',
  PROSECUTOR = 'Silly Prosecutor',
  DEFENSE_PLAYER = 'You (The Hero)',
  CO_COUNSEL = 'Your Super Helper',
  CLIENT = 'Your Friend in Trouble',
  NARRATOR = 'The Storyteller'
}

export interface Dialogue {
  speaker: CharacterRole;
  text: string;
  timestamp: number;
}

export interface Evidence {
  id: string;
  title: string;
  description: string;
  type: 'document' | 'graph' | 'data_table' | 'statement' | 'image' | 'video_snippet';
  content: string; 
  isFlawed?: boolean;
  flawDescription?: string;
}

export interface CaseData {
  id: string;
  title: string;
  classLevel: string; 
  clientName: string;
  clientDescription: string;
  accusation: string;
  initialProsecutionArgument: string; 
  initialCoCounselHint: string; 
  evidence: Evidence[];
  keyConcepts: string[];
  guiltyVerdictIfPlayerFails: string;
  innocentVerdictIfPlayerSucceeds: string;
  isClientActuallyGuilty: boolean; 
  caseDurationMinutes: number; 
}

export interface PlayerTool {
  id: 'evidence_terminal' | 'logic_rebuilder' | 'proof_board' | 'objection_system';
  name: string;
  description: string;
  icon?: string;
  tutorialId?: TutorialStep;
}

export interface LearningEntry {
  level: number;
  text: string;
  timestamp: number; // To maintain order of acquisition within a level
}

export enum TutorialStep {
  // Case Briefing
  CASE_BRIEFING_INTRO = 'CASE_BRIEFING_INTRO',
  CASE_BRIEFING_PROCEED_BUTTON = 'CASE_BRIEFING_PROCEED_BUTTON',

  // Courtroom
  COURTROOM_WELCOME = 'COURTROOM_WELCOME',
  COURTROOM_CHARACTERS = 'COURTROOM_CHARACTERS',
  COURTROOM_DIALOGUE_BOX = 'COURTROOM_DIALOGUE_BOX',
  COURTROOM_TIMER_INTRO = 'COURTROOM_TIMER_INTRO', 
  COURTROOM_PLAYER_ACTIONS_INTRO = 'COURTROOM_PLAYER_ACTIONS_INTRO',
  COURTROOM_TOOL_EVIDENCE = 'COURTROOM_TOOL_EVIDENCE',
  COURTROOM_TOOL_PROOF_BOARD = 'COURTROOM_TOOL_PROOF_BOARD',
  COURTROOM_TOOL_OBJECTION = 'COURTROOM_TOOL_OBJECTION',
  COURTROOM_OBJECTION_INPUT = 'COURTROOM_OBJECTION_INPUT',

  // Modals
  EVIDENCE_MODAL_INTRO = 'EVIDENCE_MODAL_INTRO',
  PROOF_BOARD_MODAL_INTRO = 'PROOF_BOARD_MODAL_INTRO',

  // Header
  HEADER_MY_LEARNINGS = 'HEADER_MY_LEARNINGS',
}

// User type for the account system
export interface User {
  username: string;
  passwordHash: string; // Will store plain password for simplicity in this context
}

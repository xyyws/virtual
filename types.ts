export enum QuestionType {
  MultipleChoice = 'multiple-choice',
  TrueFalse = 'true-false',
  OpenEnded = 'open-ended',
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[]; // For MC and True/False
  correctAnswer: string;
  explanation?: string; // Optional explanation for the answer
  tags?: string[];
  mastered?: boolean;
  inMistakeBook?: boolean; // New field for Mistake Notebook
}

export interface QuizState {
  questions: Question[];
  currentIndex: number;
  score: number;
  showAnswer: boolean;
  isFinished: boolean;
  history: { questionId: string; isCorrect: boolean }[];
}

export enum AppMode {
  Dashboard = 'dashboard',
  Quiz = 'quiz',
  Import = 'import',
  MistakeNotebook = 'mistake-notebook',
  MasteredNotebook = 'mastered-notebook',
  MockExam = 'mock-exam',
}

export interface ImportResult {
  success: boolean;
  questions: Question[];
  error?: string;
}
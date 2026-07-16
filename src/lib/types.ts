export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface QuestQuestion {
  id: string;
  concept: string;
  difficulty: Difficulty;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export interface GeneratedQuest {
  title: string;
  bossName: string;
  concepts: string[];
  questions: QuestQuestion[];
}

export interface SocraticTurn {
  role: "sage" | "student";
  content: string;
}

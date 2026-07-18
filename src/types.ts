export interface Scores {
  userProblem: number;      // max 20
  pipelineDesign: number;   // max 25
  dataStrategy: number;     // max 25
  riskGovernance: number;   // max 20
  feasibility: number;      // max 10
}

export interface Deficiency {
  title: string;
  description: string;
}

export interface RubricCheckItem {
  category: "userProblem" | "pipelineDesign" | "dataStrategy" | "riskGovernance" | "feasibility";
  name: string;
  maxScore: number;
  score: number;
  isMet: "Met" | "Partial" | "Unmet";
  comment: string;
}

export interface EvaluationResult {
  score: number;
  scores: Scores;
  deficiencies: Deficiency[];
  overallComment: string;
  strengths: string[];
  rubricChecklist?: RubricCheckItem[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
}

export interface SampleProposal {
  id: string;
  title: string;
  tag: string;
  expectedScoreRange: string;
  author: string;
  description: string;
  content: string;
}

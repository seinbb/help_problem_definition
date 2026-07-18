export interface Scores {
  compliance: number;      // max 30
  userProblem: number;     // max 15
  pipelineDesign: number;  // max 15
  dataStrategy: number;    // max 15
  riskGovernance: number;  // max 15
  feasibility: number;     // max 10
}

export interface Deficiency {
  title: string;
  description: string;
}

export interface RubricCheckItem {
  category: "compliance" | "userProblem" | "pipelineDesign" | "dataStrategy" | "riskGovernance" | "feasibility";
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

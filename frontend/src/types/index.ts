export type LiftLevel = 'Low Lift' | 'Mid Lift' | 'Huge Lift';
export type ContentType = 'Other' | 'Makeover/Transform' | 'Challenge/Competition' | 'Reaction/Commentary' | 'Game/Quiz' | 'Tier List/Debate' | 'Repeatable Segment' | 'Nostalgia/Culture/Trend' | 'Build/Tutorial' | 'Review/Comparison';

export interface Idea {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  script: string;
  tags: string[];
  liftLevel?: LiftLevel;
  contentType?: ContentType;
  status: 'idea' | 'in-progress' | 'ready';
  createdAt: Date;
  aiScore?: number;
}


import { z } from 'zod';

export interface OperationResult {
  success: boolean;
  data?: unknown;
  error?: string;
  summary?: string; // Concise factual summary for context
}

export interface Operation {
  id: string;
  name: string;
  description: string;
  category: 'read' | 'write';
  parameters: z.ZodType<unknown>;
  execute: (userId: string, params: Record<string, unknown>) => Promise<OperationResult>;
}

export type OperationRegistry = Map<string, Operation>;


export const PROMPT_IDS = {
  REQUIREMENTS_TO_OUTLINES: 'requirements-to-outlines',
  OUTLINE_TO_SLIDE: 'outline-to-slide',
  OUTLINE_TO_QUIZ: 'outline-to-quiz',
  OUTLINE_TO_INTERACTIVE: 'outline-to-interactive',
  OUTLINE_TO_PBL: 'outline-to-pbl',
  SLIDE_TO_ACTIONS: 'slide-to-actions',
  SLIDE_CONTENT: 'slide-content',
  SLIDE_ACTIONS: 'slide-actions',
  QUIZ_CONTENT: 'quiz-content',
  QUIZ_ACTIONS: 'quiz-actions',
  INTERACTIVE_SCIENTIFIC_MODEL: 'interactive-scientific-model',
  INTERACTIVE_HTML: 'interactive-html',
  INTERACTIVE_ACTIONS: 'interactive-actions',
  PBL_ACTIONS: 'pbl-actions',
} as const;

export type PromptId = (typeof PROMPT_IDS)[keyof typeof PROMPT_IDS];

export function buildPrompt(
  _promptId: PromptId,
  _variables: Record<string, unknown>,
): { system: string; user: string } | null {
  return { system: '', user: '' };
}

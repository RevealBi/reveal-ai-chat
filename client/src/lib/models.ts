// Phase 1 registers OpenAI server-side, so these populate the model picker.
// Phase 2 adds Anthropic / Google / Azure entries alongside their registration.
export const MODELS = [
  { id: 'gpt-4.1', label: 'GPT-4.1 (OpenAI)' },
  { id: 'gpt-4o', label: 'GPT-4o (OpenAI)' },
  { id: 'gpt-4o-mini', label: 'GPT-4o mini (OpenAI)' },
];

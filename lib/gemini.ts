// Gemini AI integration for GymSync.
//
// Two features, one endpoint:
//   1. generateRoutineFromText() - describe what you want in plain words,
//      get back a full routine (name + exercises with sets/reps).
//   2. editRoutineWithAi() - pass an existing routine plus an instruction
//      ("make it harder", "dumbbells only") and get the updated routine.
//
// Calls the Gemini REST API directly (no SDK dependency) with structured
// JSON output, so the model always returns a routine shape the app can
// save. The API key is the user's own, stored only on this device via
// AsyncStorage; it is never committed anywhere. Get a free key at
// Google AI Studio (aistudio.google.com).

import { Storage } from './storage';
import type { CustomRoutine } from './workout';

/** Swap this if Google retires the model; everything else stays the same. */
const GEMINI_MODEL = 'gemini-2.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const STORAGE_KEY = 'geminiApiKey';

export async function getGeminiKey(): Promise<string> {
  return Storage.get<string>(STORAGE_KEY, '');
}

export async function saveGeminiKey(key: string): Promise<void> {
  await Storage.set(STORAGE_KEY, key.trim());
}

export async function clearGeminiKey(): Promise<void> {
  await Storage.remove(STORAGE_KEY);
}

export interface GeneratedExercise {
  name: string;
  targetSets: number;
  targetReps: string;
}

export interface GeneratedRoutine {
  name: string;
  exercises: GeneratedExercise[];
}

/** JSON schema handed to Gemini so the response is always parseable. */
const ROUTINE_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Short routine name, e.g. "Upper Body Pump"' },
    exercises: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Exercise name, e.g. "Bench Press"' },
          targetSets: { type: 'integer', description: 'Number of sets, 1-10' },
          targetReps: {
            type: 'string',
            description: 'Rep range like "6-8" or "10-12", or a duration like "30s"',
          },
        },
        required: ['name', 'targetSets', 'targetReps'],
      },
    },
  },
  required: ['name', 'exercises'],
};

const SYSTEM_PROMPT = [
  'You are an expert strength and conditioning coach inside the GymSync workout app.',
  'You create and edit workout routines and always return ONLY the JSON object matching the schema.',
  'Rules:',
  '- Use real, well-known exercises with clear names.',
  '- targetSets is an integer from 1 to 10.',
  '- targetReps is a short range like "6-8" or "10-12", or a duration like "30s" for holds.',
  '- Keep routines focused: 4 to 8 exercises.',
  '- Respect every constraint the user mentions: equipment, injuries, experience level, session length, goals.',
  '- For edits, keep everything the user did not ask to change.',
  '- Routine names are short and plain, no emojis.',
].join('\n');

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string; status?: string };
}

/** Throws an Error with a human-readable message on any failure. */
async function callGemini(apiKey: string, userPrompt: string): Promise<GeneratedRoutine> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: ROUTINE_SCHEMA,
        },
      }),
    });
  } catch {
    throw new Error('Could not reach Gemini. Check your internet connection.');
  }

  if (!res.ok) {
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      throw new Error('Gemini rejected the request. Your API key looks invalid; check it in the Profile tab.');
    }
    if (res.status === 429) {
      throw new Error('Gemini rate limit reached. Wait a minute and try again.');
    }
    throw new Error(`Gemini request failed (status ${res.status}). Try again.`);
  }

  const json = (await res.json()) as GeminiResponse;
  if (json.error) {
    throw new Error(json.error.message ?? 'Gemini returned an error. Try again.');
  }
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini did not return a routine. Try rephrasing your request.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Gemini returned an unreadable response. Try again.');
  }
  return sanitizeRoutine(parsed);
}

/** Validates and clamps the model's JSON into a safe GeneratedRoutine. */
function sanitizeRoutine(raw: unknown): GeneratedRoutine {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Gemini returned an unreadable response. Try again.');
  }
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === 'string' && obj.name.trim() ? obj.name.trim().slice(0, 40) : 'AI Routine';
  const list = Array.isArray(obj.exercises) ? obj.exercises : [];
  const exercises: GeneratedExercise[] = list.slice(0, 12).map((item) => {
    const ex = (typeof item === 'object' && item !== null ? item : {}) as Record<string, unknown>;
    const exName =
      typeof ex.name === 'string' && ex.name.trim() ? ex.name.trim().slice(0, 60) : 'Exercise';
    const sets =
      typeof ex.targetSets === 'number' && Number.isFinite(ex.targetSets)
        ? Math.min(10, Math.max(1, Math.round(ex.targetSets)))
        : 3;
    const reps =
      typeof ex.targetReps === 'string' && ex.targetReps.trim()
        ? ex.targetReps.trim().slice(0, 10)
        : '8-12';
    return { name: exName, targetSets: sets, targetReps: reps };
  });
  if (exercises.length === 0) {
    throw new Error('Gemini returned a routine with no exercises. Try rephrasing your request.');
  }
  return { name, exercises };
}

/** Build a brand-new routine from a plain-words description. */
export function generateRoutineFromText(description: string, apiKey: string): Promise<GeneratedRoutine> {
  const prompt = `Create a workout routine from this request:\n${description.trim()}`;
  return callGemini(apiKey, prompt);
}

/** Apply an instruction to an existing routine and return the full updated routine. */
export function editRoutineWithAi(
  routine: CustomRoutine,
  instruction: string,
  apiKey: string
): Promise<GeneratedRoutine> {
  const current = JSON.stringify({
    name: routine.name,
    exercises: routine.exercises.map((ex) => ({
      name: ex.name,
      targetSets: ex.targetSets,
      targetReps: ex.targetReps,
    })),
  });
  const prompt = [
    'Here is the user\'s current routine:',
    current,
    '',
    'Apply this change and return the FULL updated routine:',
    instruction.trim(),
  ].join('\n');
  return callGemini(apiKey, prompt);
}

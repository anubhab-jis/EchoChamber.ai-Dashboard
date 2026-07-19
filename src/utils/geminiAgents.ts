import { GoogleGenAI } from '@google/genai';

import {
  getStoredApiKey,
  sanitizeIdea,
  sanitizeAudience,
  sanitizeAgentOutput,
  SECURITY_LIMITS,
} from './security';

const MODEL = 'gemini-2.5-flash';

export type AgentRole = 'vc' | 'evangelist' | 'consumer' | 'cfo';

export interface AgentConfig {
  role: AgentRole;
  systemInstruction: string;
}

export const AGENT_CONFIGS: AgentConfig[] = [
  {
    role: 'vc',
    systemInstruction:
      "You are an elite, highly critical venture capitalist. Evaluate the user's concept purely on market size, financial risk, and failure conditions. Address previous chat points if any. Be sharp and concise (max 3 sentences).",
  },
  {
    role: 'evangelist',
    systemInstruction:
      "You are an optimistic Tech Evangelist. Look at the product idea and defend its technical viability against the Cynic's critiques. Be enthusiastic and concise (max 3 sentences).",
  },
  {
    role: 'consumer',
    systemInstruction:
      "You are a Target Consumer from the stated audience. Focus on daily usability friction, onboarding pain, and whether you'd actually keep using this. Be candid and concise (max 3 sentences).",
  },
  {
    role: 'cfo',
    systemInstruction:
      "You are a Rigid CFO. Focus on gross margins, hidden maintenance costs, and unit economics. Challenge any hand-waving about profitability. Be blunt and concise (max 3 sentences).",
  },
];

export interface AgentResult {
  role: AgentRole;
  text: string;
  sentiment: number;
}

export interface OrchestratorCallbacks {
  onTyping: (role: AgentRole) => void;
  onMessage: (result: AgentResult) => void;
  shouldAbort: () => boolean;
  onError?: (role: AgentRole, userMessage: string) => void;
}

function getClient(): GoogleGenAI {
  const key = getStoredApiKey();
  if (!key) throw new Error('AUTH_MISSING');
  // Key is passed only to the SDK constructor; never logged or exposed.
  return new GoogleGenAI({ apiKey: key });
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Wrap user content in a delimited block so the model can distinguish it from
// system instructions, mitigating prompt-injection overrides.
function wrapUserContent(label: string, content: string): string {
  return `<user_content label="${label}">\n${content}\n</user_content>`;
}

function buildPrompt(idea: string, audience: string, transcript: string[]): string {
  const transcriptBlock =
    transcript.length > 0
      ? `\n\nPrior agent responses so far:\n${transcript
          .map((t, i) => `${i + 1}. ${t}`)
          .join('\n')}`
      : '';

  return (
    wrapUserContent('product_idea', idea) +
    '\n' +
    wrapUserContent('target_audience', audience) +
    transcriptBlock +
    '\n\nGive your take now.'
  );
}

function parseSentiment(text: string): number {
  const negative = /\b(risk|fail|concern|problem|hidden|margin|burn|churn|bounce|friction|pain|skeptical|won't|can't|unlikely|overestimate|rounding|niche|dead|kill|red flag|warning|cost|expensive|loss|unsustainable)\b/i;
  const positive = /\b(defend|viable|wedge|platform|magic|love|growth|scale|opportunity|promising|compelling|moat|compound|leverage|delightful|seamless|retention|profitable|efficient)\b/i;

  let score = 50;
  const negCount = (text.match(new RegExp(negative, 'gi')) || []).length;
  const posCount = (text.match(new RegExp(positive, 'gi')) || []).length;
  score += posCount * 6;
  score -= negCount * 6;
  return Math.max(5, Math.min(95, score));
}

// Map raw SDK errors to clean, user-friendly messages. Never surface stack
// traces, headers, or key fragments to the client.
function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes('api key') || lower.includes('auth') || lower.includes('permission') || lower.includes('401') || lower.includes('403')) {
    return 'Authentication failed. Open Settings to verify your Google AI Studio API key.';
  }
  if (lower.includes('quota') || lower.includes('rate') || lower.includes('429')) {
    return 'The AI service is busy. Please wait a moment and try again.';
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('timeout')) {
    return 'Network issue reaching the AI service. Check your connection and retry.';
  }
  return 'The agent could not respond right now. Please try again.';
}

async function callAgent(
  client: GoogleGenAI,
  config: AgentConfig,
  idea: string,
  audience: string,
  transcript: string[]
): Promise<string> {
  const prompt = buildPrompt(idea, audience, transcript);
  const response = await client.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { systemInstruction: config.systemInstruction },
  });
  return sanitizeAgentOutput((response.text ?? '').trim());
}

export async function runAgentDebate(
  rawIdea: string,
  rawAudience: string,
  callbacks: OrchestratorCallbacks
): Promise<AgentResult[]> {
  // Sanitize at the boundary — never trust raw user input downstream.
  const idea = sanitizeIdea(rawIdea);
  const audience = sanitizeAudience(rawAudience);
  if (!idea || !audience) return [];

  let client: GoogleGenAI;
  try {
    client = getClient();
  } catch {
    const msg = 'Authentication failed. Open Settings to verify your Google AI Studio API key.';
    for (const config of AGENT_CONFIGS) {
      if (callbacks.shouldAbort()) break;
      callbacks.onError?.(config.role, msg);
    }
    return [];
  }

  const transcript: string[] = [];
  const results: AgentResult[] = [];

  for (const config of AGENT_CONFIGS) {
    if (callbacks.shouldAbort()) break;

    callbacks.onTyping(config.role);
    try {
      await sleep(3000);
    } catch {
      // sleep never rejects; ignore.
    }
    if (callbacks.shouldAbort()) break;

    let text = '';
    try {
      text = await callAgent(client, config, idea, audience, transcript);
    } catch (err) {
      const userMsg = friendlyError(err);
      callbacks.onError?.(config.role, userMsg);
      text = userMsg;
    }

    if (!text) text = 'No response.';
    text = sanitizeAgentOutput(text);
    const sentiment = parseSentiment(text);
    transcript.push(text);
    const result: AgentResult = { role: config.role, text, sentiment };
    results.push(result);
    callbacks.onMessage(result);
  }

  return results;
}

export { SECURITY_LIMITS };

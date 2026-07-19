import { useState, useRef, useEffect } from 'react';
import {
  Brain,
  Sparkles,
  Target,
  Users,
  TrendingUp,
  Wallet,
  Send,
  Gauge,
  Activity,
  BarChart3,
  MessageSquare,
  ChevronRight,
  CircleDot,
  Settings,
  X,
  Check,
  Key,
  Eye,
  EyeOff,
} from 'lucide-react';

import { runAgentDebate, type AgentRole, type AgentResult } from './utils/geminiAgents';
import {
  getStoredApiKey,
  storeApiKey,
  clearApiKey,
  isValidApiKey,
  sanitizeIdea,
  sanitizeAudience,
  SECURITY_LIMITS,
} from './utils/security';

type AgentId = AgentRole;

interface Agent {
  id: AgentId;
  name: string;
  role: string;
  icon: typeof Brain;
  accent: string;
  ring: string;
  glow: string;
  badge: string;
  tagline: string;
}

const AGENTS: Agent[] = [
  {
    id: 'vc',
    name: 'Cynical Venture Capitalist',
    role: 'Skeptical Capital',
    icon: TrendingUp,
    accent: 'text-red-400',
    ring: 'ring-red-500/30',
    glow: 'rgba(239,68,68,0.15)',
    badge: 'bg-red-500',
    tagline: 'Questions your unit economics.',
  },
  {
    id: 'evangelist',
    name: 'Tech Evangelist',
    role: 'Hype Architect',
    icon: Sparkles,
    accent: 'text-cyan-400',
    ring: 'ring-cyan-500/30',
    glow: 'rgba(6,182,212,0.15)',
    badge: 'bg-cyan-500',
    tagline: 'Sees the next paradigm shift.',
  },
  {
    id: 'consumer',
    name: 'Target Consumer',
    role: 'Everyday User',
    icon: Users,
    accent: 'text-emerald-400',
    ring: 'ring-emerald-500/30',
    glow: 'rgba(16,185,129,0.15)',
    badge: 'bg-emerald-500',
    tagline: 'Speaks for the buyer.',
  },
  {
    id: 'cfo',
    name: 'Rigid CFO',
    role: 'Fiscal Discipline',
    icon: Wallet,
    accent: 'text-amber-400',
    ring: 'ring-amber-500/30',
    glow: 'rgba(245,158,11,0.15)',
    badge: 'bg-amber-500',
    tagline: 'Counts every dollar.',
  },
];

const PANEL_CLASS =
  'relative rounded-3xl border border-white/[0.08] border-b-white/[0.03] border-r-white/[0.03] bg-neutral-900/30 backdrop-blur-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-500';

function App() {
  const [idea, setIdea] = useState('');
  const [audience, setAudience] = useState('');
  const [assembling, setAssembling] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);

  const [messages, setMessages] = useState<Record<AgentId, string[]>>({
    vc: [],
    evangelist: [],
    consumer: [],
    cfo: [],
  });
  const [typing, setTyping] = useState<Record<AgentId, boolean>>({
    vc: false,
    evangelist: false,
    consumer: false,
    cfo: false,
  });

  const [feasibility, setFeasibility] = useState(0);
  const [breakdown, setBreakdown] = useState({
    market: 0,
    technical: 0,
    financial: 0,
    risk: 0,
  });
  const [sentiment, setSentiment] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  const [hasApiKey, setHasApiKey] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const abortRef = useRef(false);

  const refreshKeyStatus = () => {
    // Validates format — an invalid/partial key in storage is treated as absent.
    setHasApiKey(getStoredApiKey() !== null);
  };

  useEffect(() => {
    refreshKeyStatus();
  }, []);

  useEffect(() => () => {
    abortRef.current = true;
  }, []);

  const applyResultToMetrics = (result: AgentResult) => {
    const s = result.sentiment;
    setFeasibility((prev) => Math.round(prev * 0.4 + s * 0.6));
    setBreakdown((prev) => {
      const weights: Record<AgentRole, Partial<typeof prev>> = {
        vc: { market: s, financial: Math.max(20, s - 10), risk: 100 - s },
        evangelist: { technical: s, market: Math.min(90, prev.market + 5) },
        consumer: { market: Math.min(95, prev.market + 8), risk: 100 - s },
        cfo: { financial: s, risk: 100 - s },
      };
      const w = weights[result.role];
      return { ...prev, ...w } as typeof prev;
    });
    setSentiment((prev) => {
      const next = [...prev.slice(1), s];
      return next;
    });
  };

  const handleAssemble = async () => {
    if (!idea.trim() || !audience.trim() || assembling || !hasApiKey) return;

    abortRef.current = false;
    setAssembling(true);
    setErrorBanner(null);
    setSessionActive(false);
    setMessages({ vc: [], evangelist: [], consumer: [], cfo: [] });
    setTyping({ vc: false, evangelist: false, consumer: false, cfo: false });
    setFeasibility(0);
    setBreakdown({ market: 0, technical: 0, financial: 0, risk: 0 });
    setSentiment([0, 0, 0, 0, 0, 0, 0]);

    await new Promise<void>((r) => setTimeout(r, 1200));
    setAssembling(false);
    setSessionActive(true);

    await runAgentDebate(idea.trim(), audience.trim(), {
      onTyping: (role) => {
        if (abortRef.current) return;
        setTyping((prev) => ({ ...prev, [role]: true }));
      },
      onMessage: (result) => {
        if (abortRef.current) return;
        setTyping((prev) => ({ ...prev, [result.role]: false }));
        setMessages((prev) => ({
          ...prev,
          [result.role]: [...prev[result.role], result.text],
        }));
        applyResultToMetrics(result);
      },
      onError: (_role, userMessage) => {
        if (abortRef.current) return;
        setErrorBanner(userMessage);
      },
      shouldAbort: () => abortRef.current,
    });
  };

  return (
    <div className="relative min-h-screen bg-radial from-zinc-900 via-neutral-950 to-black text-neutral-200 antialiased">
      {/* Ambient depth-mapped air + soft central glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[60vh] w-[60vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/5 blur-[120px]" />
        <div className="absolute -top-40 -left-32 h-96 w-96 rounded-full bg-cyan-500/[0.04] blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-500/[0.04] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <Header />

        <main className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-12">
          <section className="lg:col-span-3">
            <ControlPanel
              idea={idea}
              setIdea={setIdea}
              audience={audience}
              setAudience={setAudience}
              assembling={assembling}
              sessionActive={sessionActive}
              onAssemble={handleAssemble}
              hasApiKey={hasApiKey}
              onOpenSettings={() => setShowSettings(true)}
              errorBanner={errorBanner}
            />
          </section>

          <section className="lg:col-span-6">
            <AgentGrid
              agents={AGENTS}
              messages={messages}
              typing={typing}
              assembling={assembling}
              sessionActive={sessionActive}
            />
          </section>

          <section className="lg:col-span-3">
            <LiveAnalysis
              sessionActive={sessionActive}
              feasibility={feasibility}
              breakdown={breakdown}
              sentiment={sentiment}
            />
          </section>
        </main>

        <footer className="mt-10 pb-6 text-center text-xs text-neutral-600">
          EchoChamber.ai · Synthetic focus groups for early-stage validation
        </footer>
      </div>

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onSave={() => {
            refreshKeyStatus();
            setShowSettings(false);
          }}
          onReset={() => {
            clearApiKey();
            refreshKeyStatus();
            setErrorBanner(null);
            setSessionActive(false);
            setShowSettings(false);
          }}
        />
      )}
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] border-b-white/[0.03] border-r-white/[0.03] bg-neutral-900/40 backdrop-blur-2xl shadow-[0_8px_20px_-6px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)]">
          <Brain className="h-6 w-6 text-indigo-300" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 echo-pulse" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-white shadow-sm">
            EchoChamber<span className="text-indigo-400">.ai</span>
          </h1>
          <p className="text-xs text-neutral-500">AI Focus Group Simulator</p>
        </div>
      </div>
      <div className="hidden items-center gap-2 rounded-full border border-white/[0.08] border-b-white/[0.03] bg-neutral-900/40 px-3 py-1.5 text-xs text-neutral-400 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:flex">
        <CircleDot className="h-3.5 w-3.5 text-emerald-400 echo-pulse" />
        <span>4 agents on standby</span>
      </div>
    </header>
  );
}

interface ControlPanelProps {
  idea: string;
  setIdea: (v: string) => void;
  audience: string;
  setAudience: (v: string) => void;
  assembling: boolean;
  sessionActive: boolean;
  onAssemble: () => void;
  hasApiKey: boolean;
  onOpenSettings: () => void;
  errorBanner: string | null;
}

function ControlPanel({
  idea,
  setIdea,
  audience,
  setAudience,
  assembling,
  sessionActive,
  onAssemble,
  hasApiKey,
  onOpenSettings,
  errorBanner,
}: ControlPanelProps) {
  const ready = idea.trim().length > 0 && audience.trim().length > 0 && hasApiKey;
  return (
    <div className={`${PANEL_CLASS} flex h-full flex-col gap-4 overflow-hidden p-5 hover:border-white/[0.14]`}>
      <SettingsButton hasApiKey={hasApiKey} onClick={onOpenSettings} />
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-indigo-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-200 shadow-sm">
          Briefing
        </h2>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-400">
          Enter your Startup/Product Idea
        </label>
        <textarea
          value={idea}
          onChange={(e) => setIdea(sanitizeIdea(e.target.value))}
          placeholder="e.g. A subscription service that delivers locally-roasted coffee beans curated by AI based on your taste profile..."
          rows={6}
          maxLength={SECURITY_LIMITS.MAX_IDEA_LEN}
          className="echo-scroll w-full resize-none rounded-2xl border border-white/[0.06] border-b-white/[0.03] bg-black/30 p-3 text-sm font-medium text-neutral-200 placeholder:text-neutral-600 shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)] transition-colors focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        <div className="flex justify-end text-[10px] text-neutral-600">
          {idea.length}/{SECURITY_LIMITS.MAX_IDEA_LEN}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-400">
          Target Audience
        </label>
        <input
          type="text"
          value={audience}
          onChange={(e) => setAudience(sanitizeAudience(e.target.value))}
          placeholder="e.g. Urban millennials, 25-35, who love specialty coffee"
          maxLength={SECURITY_LIMITS.MAX_AUDIENCE_LEN}
          className="w-full rounded-2xl border border-white/[0.06] border-b-white/[0.03] bg-black/30 p-3 text-sm font-medium text-neutral-200 placeholder:text-neutral-600 shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)] transition-colors focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {!hasApiKey && (
        <p className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-[11px] font-medium text-rose-300/80">
          Add your Google AI Studio API key in Settings to enable the focus group.
        </p>
      )}

      {errorBanner && (
        <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] font-medium text-amber-300/90">
          {errorBanner}
        </p>
      )}

      <button
        onClick={onAssemble}
        disabled={!ready || assembling}
        className={`group relative mt-1 flex items-center justify-center gap-2 overflow-hidden rounded-xl font-medium tracking-wide transition-all duration-300 ${
          !ready || assembling
            ? 'cursor-not-allowed border border-white/[0.04] bg-neutral-900/40 text-neutral-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]'
            : 'border border-neutral-700/60 bg-neutral-800 text-white shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] hover:bg-neutral-700 active:scale-[0.97] active:shadow-[inset_0_4px_8px_rgba(0,0,0,0.6)]'
        }`}
      >
        {assembling ? (
          <span className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Assembling...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold">
            <Users className="h-4 w-4" />
            Assemble Focus Group
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        )}
      </button>

      <div className="mt-auto rounded-2xl border border-white/[0.06] border-b-white/[0.03] bg-black/30 p-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-neutral-500">Session</span>
          <span
            className={`flex items-center gap-1.5 ${
              sessionActive ? 'text-emerald-400' : 'text-neutral-600'
            }`}
          >
            <CircleDot className={`h-3 w-3 ${sessionActive ? 'echo-pulse' : ''}`} />
            {sessionActive ? 'Active' : 'Idle'}
          </span>
        </div>
      </div>
    </div>
  );
}

interface AgentGridProps {
  agents: Agent[];
  messages: Record<AgentId, string[]>;
  typing: Record<AgentId, boolean>;
  assembling: boolean;
  sessionActive: boolean;
}

function AgentGrid({ agents, messages, typing, assembling, sessionActive }: AgentGridProps) {
  return (
    <div className={`${PANEL_CLASS} flex h-full flex-col overflow-hidden p-5 hover:border-white/[0.14]`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-indigo-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-200 shadow-sm">
            Focus Group Chamber
          </h2>
        </div>
        <span className="text-xs font-medium text-neutral-500">4 agents</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            messages={messages[agent.id]}
            typing={typing[agent.id]}
            assembling={assembling}
            sessionActive={sessionActive}
          />
        ))}
      </div>
    </div>
  );
}

interface AgentCardProps {
  agent: Agent;
  messages: string[];
  typing: boolean;
  assembling: boolean;
  sessionActive: boolean;
}

function AgentCard({ agent, messages, typing, assembling, sessionActive }: AgentCardProps) {
  const Icon = agent.icon;
  return (
    <div
      style={{ ['--glow-color' as string]: agent.glow }}
      className={`group echo-fade-up relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] border-b-white/[0.03] border-r-white/[0.03] bg-neutral-900/40 backdrop-blur-2xl shadow-[0_12px_24px_-10px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-500 hover:-translate-y-1.5 hover:scale-[1.01] hover:border-white/[0.14] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.8),0_0_50px_-10px_var(--glow-color)]`}
    >
      {/* Inner ambient illumination sphere */}
      <div
        className="pointer-events-none absolute -top-16 right-0 h-40 w-40 rounded-full blur-3xl opacity-40 transition-opacity duration-500 group-hover:opacity-100"
        style={{ backgroundColor: agent.glow }}
      />

      {/* Header */}
      <div className="relative flex items-center gap-3 border-b border-white/[0.06] p-3">
        <div
          className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/50 ring-1 ${agent.ring} shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]`}
        >
          <Icon className={`h-5 w-5 ${agent.accent}`} />
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-neutral-950 ${agent.badge} ${
              typing ? 'echo-pulse' : ''
            }`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white shadow-sm">{agent.name}</p>
          <p className={`truncate text-[11px] font-medium ${agent.accent}`}>{agent.role}</p>
        </div>
      </div>

      {/* Chat container */}
      <div className="echo-scroll relative h-44 overflow-y-auto p-3">
        {assembling ? (
          <div className="space-y-2">
            <div className="echo-shimmer h-3 w-3/4 rounded" />
            <div className="echo-shimmer h-3 w-1/2 rounded" />
            <div className="echo-shimmer h-3 w-2/3 rounded" />
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg, i) => (
              <div
                key={i}
                className="echo-fade-up rounded-xl rounded-tl-sm border border-white/[0.06] border-b-white/[0.03] bg-white/[0.04] px-3 py-2 text-xs font-medium leading-relaxed text-neutral-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              >
                {msg}
              </div>
            ))}
            {typing && <TypingIndicator accent={agent.accent} />}
            {!typing && messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Icon className="mb-2 h-6 w-6 text-neutral-700" />
                <p className="text-xs font-medium text-neutral-600">{agent.tagline}</p>
                <p className="mt-1 text-[10px] text-neutral-700">
                  {sessionActive ? 'Waiting to speak...' : 'Awaiting briefing'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="relative border-t border-white/[0.06] p-2.5">
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] border-b-white/[0.03] bg-black/40 px-2 py-1.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
          <input
            disabled
            placeholder="Agent will respond..."
            className="flex-1 bg-transparent text-xs font-medium text-neutral-500 placeholder:text-neutral-600 focus:outline-none"
          />
          <button
            disabled
            className="flex h-6 w-6 items-center justify-center rounded-md border border-white/[0.06] bg-neutral-800/60 text-neutral-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          >
            <Send className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TypingIndicator({ accent }: { accent: string }) {
  return (
    <div className="echo-fade-up flex items-center gap-1.5 rounded-xl rounded-tl-sm border border-white/[0.06] bg-white/[0.04] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${accent} echo-pulse`} />
      <span
        className={`h-1.5 w-1.5 rounded-full bg-current ${accent} echo-pulse`}
        style={{ animationDelay: '0.2s' }}
      />
      <span
        className={`h-1.5 w-1.5 rounded-full bg-current ${accent} echo-pulse`}
        style={{ animationDelay: '0.4s' }}
      />
    </div>
  );
}

interface LiveAnalysisProps {
  sessionActive: boolean;
  feasibility: number;
  breakdown: { market: number; technical: number; financial: number; risk: number };
  sentiment: number[];
}

function LiveAnalysis({
  sessionActive,
  feasibility,
  breakdown,
  sentiment,
}: LiveAnalysisProps) {
  const scoreColor =
    feasibility >= 65
      ? 'text-emerald-400'
      : feasibility >= 45
      ? 'text-amber-400'
      : feasibility > 0
      ? 'text-rose-400'
      : 'text-white';

  const rows = [
    { label: 'Market', value: breakdown.market },
    { label: 'Technical', value: breakdown.technical },
    { label: 'Financial', value: breakdown.financial },
    { label: 'Risk', value: breakdown.risk },
  ];

  return (
    <div className={`${PANEL_CLASS} flex h-full flex-col gap-4 overflow-hidden p-5 hover:border-white/[0.14]`}>
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-emerald-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-200 shadow-sm">
          Live Analysis
        </h2>
      </div>

      {/* Feasibility score */}
      <div className="rounded-2xl border border-white/[0.06] border-b-white/[0.03] bg-black/30 p-4 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-400">
            <Gauge className="h-3.5 w-3.5" /> Feasibility Score
          </span>
          <span className="text-xs font-medium text-neutral-600">/100</span>
        </div>
        <div className="flex items-end gap-2">
          <span className={`text-3xl font-bold tabular-nums shadow-sm transition-colors duration-500 ${scoreColor}`}>
            {feasibility > 0 ? feasibility : '—'}
          </span>
          {feasibility > 0 && (
            <span className="mb-1 text-xs font-medium text-neutral-500">
              {feasibility >= 65 ? 'promising' : feasibility >= 45 ? 'mixed' : 'risky'}
            </span>
          )}
        </div>
        <div className="echo-groove mt-3 h-2.5 w-full overflow-hidden rounded-full bg-black/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
          <div
            className="echo-fluid h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 shadow-[0_0_12px_rgba(99,102,241,0.5)] transition-all duration-700 ease-out"
            style={{ width: `${feasibility}%` }}
          />
        </div>
      </div>

      {/* Score breakdown */}
      <div className="rounded-2xl border border-white/[0.06] border-b-white/[0.03] bg-black/30 p-4 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
          <BarChart3 className="h-3.5 w-3.5" /> Score Breakdown
        </p>
        <div className="space-y-2.5">
          {rows.map((row) => (
            <div key={row.label}>
              <div className="mb-1 flex justify-between text-[11px] font-medium text-neutral-500">
                <span>{row.label}</span>
                <span className="tabular-nums">
                  {row.value > 0 ? row.value : '—'}
                </span>
              </div>
              <div className="echo-groove h-2 w-full overflow-hidden rounded-full bg-black/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
                <div
                  className="echo-fluid h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 shadow-[0_0_12px_rgba(99,102,241,0.5)] transition-all duration-700 ease-out"
                  style={{ width: `${row.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sentiment trend chart */}
      <div className="rounded-2xl border border-white/[0.06] border-b-white/[0.03] bg-black/30 p-4 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
          <TrendingUp className="h-3.5 w-3.5" /> Sentiment Trend
        </p>
        <div className="flex h-24 items-end justify-between gap-1">
          {sentiment.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-gradient-to-t from-indigo-500/20 to-cyan-400/60 shadow-[0_0_8px_rgba(99,102,241,0.3)] transition-all duration-700 ease-out"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[9px] font-medium text-neutral-600">
          <span>Wk 1</span>
          <span>Wk 4</span>
        </div>
      </div>

      {/* Radar placeholder */}
      <div className="rounded-2xl border border-white/[0.06] border-b-white/[0.03] bg-black/30 p-4 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
          <Sparkles className="h-3.5 w-3.5" /> Agent Alignment
        </p>
        <div className="flex h-24 items-center justify-center">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 rounded-full border border-white/10" />
            <div className="absolute inset-2 rounded-full border border-white/10" />
            <div className="absolute inset-4 rounded-full border border-white/10" />
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-neutral-600">
              radar
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto rounded-2xl border border-white/[0.06] border-b-white/[0.03] bg-black/20 p-3 text-[11px] font-medium text-neutral-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
        {sessionActive
          ? 'Analysis streaming in real time as agents respond.'
          : 'Run a session to populate live metrics.'}
      </div>
    </div>
  );
}

function SettingsButton({
  hasApiKey,
  onClick,
}: {
  hasApiKey: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label="Settings"
      className="absolute bottom-4 right-4 z-10 group flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-700/60 bg-neutral-800/80 text-neutral-400 backdrop-blur-xl shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-200 hover:bg-neutral-700 hover:text-neutral-200 active:scale-[0.97] active:shadow-[inset_0_4px_8px_rgba(0,0,0,0.6)]"
    >
      <Settings className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />
      {hasApiKey ? (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-neutral-950">
          <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
        </span>
      ) : (
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-neutral-950 echo-pulse" />
      )}
    </button>
  );
}

function SettingsModal({
  onClose,
  onSave,
  onReset,
}: {
  onClose: () => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const existing = typeof window !== 'undefined' ? getStoredApiKey() ?? '' : '';
  const [keyValue, setKeyValue] = useState(existing);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSave = () => {
    const trimmed = keyValue.trim();
    if (trimmed && !isValidApiKey(trimmed)) {
      setValidationError('Invalid format. Google AI Studio keys start with "AIza" followed by 35 characters.');
      return;
    }
    const ok = storeApiKey(trimmed);
    if (!ok) {
      setValidationError('Could not save the key to local storage.');
      return;
    }
    setValidationError(null);
    setSaved(true);
    // Clear the key from component memory after persisting.
    setKeyValue('');
    window.setTimeout(() => {
      onSave();
    }, 600);
  };

  const handleClear = () => {
    clearApiKey();
    setKeyValue('');
    setValidationError(null);
    onReset();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md echo-fade-up"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`${PANEL_CLASS} w-full max-w-md overflow-hidden bg-neutral-900/70`}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              <Key className="h-4 w-4 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white shadow-sm">API Key Settings</h3>
              <p className="text-[11px] font-medium text-neutral-500">Google AI Studio (Gemini)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.06] bg-black/30 text-neutral-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors hover:bg-black/50 hover:text-neutral-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <label className="mb-1.5 block text-xs font-medium text-neutral-400">
            Paste your API Key
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder="AIza..."
              className="w-full rounded-xl border border-white/[0.06] border-b-white/[0.03] bg-black/40 py-2.5 pl-3 pr-10 text-sm font-medium text-neutral-200 placeholder:text-neutral-600 shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)] transition-colors focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              onClick={() => setShowKey((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:text-neutral-300"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2 text-[11px] font-medium text-neutral-600">
            Stored locally in your browser only. Never sent to a server.
          </p>

          {validationError && (
            <p className="mt-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-[11px] font-medium text-rose-300/90">
              {validationError}
            </p>
          )}

          <div className="mt-5 flex gap-2">
            <button
              onClick={handleSave}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold tracking-wide transition-all duration-300 ${
                saved
                  ? 'border-emerald-500/40 bg-emerald-500 text-white shadow-[0_0_20px_-4px_rgba(16,185,129,0.5),inset_0_1px_0_rgba(255,255,255,0.2)]'
                  : 'border-neutral-700/60 bg-neutral-800 text-white shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] hover:bg-neutral-700 active:scale-[0.97] active:shadow-[inset_0_4px_8px_rgba(0,0,0,0.6)]'
              }`}
            >
              {saved ? (
                <>
                  <Check className="h-4 w-4" strokeWidth={3} /> Saved
                </>
              ) : (
                'Save Key'
              )}
            </button>
            {existing && (
              <button
                onClick={handleClear}
                className="rounded-xl border border-white/[0.08] border-b-white/[0.03] bg-black/30 px-4 py-2.5 text-sm font-medium text-neutral-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:border-rose-500/30 hover:text-rose-300"
              >
                Reset Key
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

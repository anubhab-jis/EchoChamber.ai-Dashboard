The AI Multi-Agent Market Research Simulator
​Stop asking one AI what it thinks. Spawn an entire room that argues about it.
​View Live Demo
​https://echo-chamber-ai-dashboard.vercel.app/
​The Problem
​Founders and product teams have exactly one cheap way to sanity-check an idea before building: ask a single chatbot. That approach has real flaws:
​Single-Voice Bias: One model, one persona baked in, usually agreeable by default.
​No Real Debate: A lone model can't argue with itself or surface conflicting priorities.
​Slow, Costly Alternatives: Real focus groups take 2-4 weeks and cost $3,000–$15,000.
​Shallow Signal: Generic AI feedback tends toward vague encouragement, not the objections that would actually kill a pitch.
​The Solution
​EchoChamber.ai spawns an entire synthetic focus group—5 to 10 distinct AI personas that debate your product idea live, in a real-time chat interface.
​5-10 live personas simulated per session.
​1 prompt needed to launch a full simulation.
​<60s from product idea to first reactions on screen.
​How It Works
​Input your concept: Describe your product in plain language.
​Spawn the panel: 5-10 personas are instantiated, each with its own system prompt, priorities, and tone.
​Watch them debate: Personas take turns via function calling, reacting to the idea and to each other.
​Read the verdict: A closing summary synthesizes the strongest objections and strongest praise.
​Tech Architecture
​Bolt.new/Lovable.dev: Rapid full-stack scaffolding for the frontend, API routes, and hosting.
​OpenAI API: Function calling drives each persona's independent turn and structured output.
​Backend Agent Loop: Maintains a shared conversation state array all personas read from and write to.
​Real-time UI Layer: Chat bubbles render incrementally as state updates stream in.
⚔️ Competitive Landscape
Feature
Single AI
Chatbot
Human
Focus
Group
EchoChamber.ai
Multiple
distinct
viewpoints
❌
❌
✅
Personas
argue with
each other
❌
❌
✅
Available in
minutes, not
weeks
✅
❌
✅
Costs under
$5,000
✅
❌
✅
Purpose-built
live UI
❌
✅
✅
EchoChamber.ai is the only option that combines the speed and
cost of AI with the multi-perspective friction of a real panel.
🏆 Why We Win
Instant "Wow" Factor — a live, dynamic conversation on
screen, not a static output
Deep AI Fluency — multi-agent orchestration and function.
Why We Win
Instant "Wow" Factor — a live, dynamic conversation on
screen, not a static output
Deep AI Fluency — multi-agent orchestration and function
calling go beyond a single-prompt wrapper
Real, Working Execution — fully working demo, built endto-end with Bolt.new inside the hackathon window
Genuine Usefulness — solves a problem every builder in
the room has personally felt
🎯 Who It's For
Early-Stage Founders — stress-test a pitch before it
reaches a real investor or customer
Product Managers — pressure-test a feature idea against
skeptical, varied mindsets in minutes
Agencies & Consultants — give clients a fast, low-cost gut
check before a full research engagement
Indie Hackers — validate a weekend project idea before
writing a single line of code
💰 Business Model
Free
Pro
Team
$0
$29/mo
$99/mo
3 simulations/month,
5 preset personas,
community support
Unlimited
simulations,
custom
personas,
exportable
reports, priority
processing
Shared
workspaces,
brand-voice
personas, API
access, usage
analytics.
🗺 Roadmap
[x] Now — 5–10 persona simulator, live chat UI, core
function-calling loop
[ ] Next (30 days) — custom, user-defined personas, tone,
and expertise
[ ] Later (90 days) — exportable, structured research
reports
12-month vision: become the default "pre-flight check" every
builder runs before shipping — as habitual as a spell-checker.
​Getting Started
# Clone the repo
git clone https://github.com/your-team/echochamber-ai.git
cd echochamber-ai

# Install dependencies
npm install

# Add your OpenAI API key
cp .env.example .env
# Then edit .env and add: OPENAI_API_KEY=your-key-here

# Run it
npm run dev
Team
​Built with way too much caffeine at a hackathon by:
​Aditya Kumar
​Ankur Goswami
​Anubhav Guha Roy
​License
​MIT - do whatever you want with it, just don't blame us if your CFO persona roasts your next pitch too.
​<div align="center">
​EchoChamber.ai - let your idea meet the room before the room meets it.
</div>

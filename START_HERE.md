# Start here — your first agent

Welcome. You just scaffolded **Skill Gap Agent** with the **Claude Agent SDK (TypeScript)**.
This file is your 60-second guide. Read top to bottom, then delete it.

---

## 1. Add your API key

This agent needs one env var:

```
ANTHROPIC_API_KEY=...
```

Put it in `.env.local` at the project root (already gitignored).
Get a key from https://console.anthropic.com — First $5 is free.

## 2. Run it

In the AgentFoundry terminal (bottom panel), run:

```
npm install && npm run agent:dev
```

The agent will list files in this folder and tell you what kind of project it is.
That's it — you have a working agent. ✓

## 3. Make it yours

Open `agent.ts` and change the `prompt: "..."` line. Save. Run again.

Or — easier — ask Claude to do it for you. In the AgentFoundry terminal, type:

> *"Add a tool to agent.ts that fetches the current weather for a city the user mentions."*

Claude will edit `agent.ts`, add the tool, and tell you what it changed.
That's the loop: **prompt → Claude edits → you run → repeat.**

---

## Where things live

- `agent.ts` — your agent's brain (the prompt + which tools it can call)
- `.env.local` — your secrets (never commit)
- `.codenow/agent-studio/prompts/` — versioned system prompts
- `.codenow/agent-studio/evals/` — smoke tests
- `.codenow/agent-studio/agents/skill-gap-agent.json` — manifest (what gets published to Agent21)

## Next steps

1. **Test** — open the *Test* tab in the Agents panel and chat with your agent.
2. **Add tools** — open the *Tools* tab → *+ New Tool* (visual builder, no code).
3. **Add knowledge** — open the *Skills* tab to drop in PDFs/docs.
4. **Publish** — open the *Publish* tab to push to the Agent21 marketplace.

Stuck? Ask Claude in the terminal. That's the whole point of this IDE.

---

*Description:* Analyze the career analysis produced for an Indian student and identify the student's most important skill gaps for their target technology role. Prioritize gaps based on importance to the target role, current evidence, and practical learning sequence. For each gap, explain what the student needs to learn, why it matters, and what concrete evidence or task would demonstrate proficiency. Do not invent student skills, qualifications, experience, or job requirements. Clearly distinguish verified st
*Kit docs:* https://docs.claude.com/en/api/agent-sdk/overview

---

**Powered by Anthropic** — https://www.anthropic.com/claude

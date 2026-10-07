// Portable agent handler — runs UNCHANGED locally and on Supabase Edge.
// Depends ONLY on the runtime adapters + the plain Anthropic API + HTTP-backed
// TOOLS. Tools are plain fetch() calls (no local MCP subprocess), so they
// survive the deploy: the agent has real capabilities local AND on the edge.
import type { AgentHandler } from "./runtime";

const MODEL = "claude-sonnet-4-6";
const TOOLS_HOST = "https://codenow.pro";

// HTTP tools the agent can call. `search_flights` is keyless (a server proxy
// holds the flights key), so it works locally and when deployed. Add your own
// the same way: declare it here + handle it in runTool().
const TOOLS = [
  {
    name: "search_flights",
    description: "Search real flights (Google Flights). Returns options with airline, times, stops and price.",
    input_schema: {
      type: "object",
      properties: {
        origin: { type: "string", description: "origin IATA code, e.g. SFO" },
        destination: { type: "string", description: "destination IATA code, e.g. JFK" },
        outbound_date: { type: "string", description: "YYYY-MM-DD" },
        return_date: { type: "string", description: "YYYY-MM-DD, optional (round trip)" },
      },
      required: ["origin", "destination", "outbound_date"],
    },
  },
  {
    name: "create_calendar_event",
    description: "Create a real event on the user's Google Calendar. Needs a GOOGLE_REFRESH_TOKEN secret (the user connects Google in AgentFoundry, using its verified OAuth app).",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "event title" },
        start: { type: "string", description: "ISO 8601 start, e.g. 2026-08-15T08:00:00-07:00 (or a 2026-08-15 all-day date)" },
        end: { type: "string", description: "ISO 8601 end (optional; defaults to start + 1h)" },
        timeZone: { type: "string", description: "IANA tz, e.g. America/Los_Angeles" },
        description: { type: "string" },
      },
      required: ["summary", "start"],
    },
  },
];

async function runTool(name: string, input: any, ctx: any): Promise<string> {
  if (name === "search_flights") {
    const q = new URLSearchParams({ origin: input.origin, destination: input.destination, outbound_date: input.outbound_date });
    if (input.return_date) q.set("return_date", input.return_date);
    const r = await fetch(TOOLS_HOST + "/api/flights/search?" + q.toString());
    const d: any = await r.json().catch(() => ({}));
    if (!d || !d.ok) return "flight search failed: " + ((d && d.error) || r.status);
    const lines = (d.options || []).map((o: any, i: number) => (i + 1) + ". " + o.summary).join("\n");
    return lines + (d.googleFlightsUrl ? "\nBook: " + d.googleFlightsUrl : "");
  }
  if (name === "create_calendar_event") {
    const refresh = await ctx.secrets.get("GOOGLE_REFRESH_TOKEN");
    if (!refresh) return "no GOOGLE_REFRESH_TOKEN — the user must connect Google in AgentFoundry and set that secret.";
    const r = await fetch(TOOLS_HOST + "/api/tools/calendar", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh, action: "create", summary: input.summary, start: input.start, end: input.end, timeZone: input.timeZone, description: input.description }),
    });
    const d: any = await r.json().catch(() => ({}));
    if (!d || !d.ok) return "calendar create failed: " + ((d && d.error) || r.status);
    return "Created calendar event \"" + d.summary + "\" for " + (d.when || input.start) + (d.htmlLink ? " — " + d.htmlLink : "");
  }
  return "unknown tool: " + name;
}

export const handle: AgentHandler = async (req, ctx) => {
  const apiKey = await ctx.secrets.require("ANTHROPIC_API_KEY");
  // Memory survives across requests via the bound provider (local JSONL /
  // supabase Postgres). Knowledge: local lexical / supabase FTS. Same calls.
  const history = await ctx.memory.load(ctx.session.sessionId, { limit: 20 });
  const hits = await ctx.knowledge.search(req.message, 5);
  const system = "You are a helpful assistant. Call tools (e.g. search_flights) to get REAL data before answering." +
    (hits.length ? "\n\nRelevant knowledge:\n" + hits.map((h) => "- " + (h.title ? h.title + ": " : "") + h.content).join("\n") : "");

  const messages: any[] = [
    ...history.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: typeof m.content === "string" ? m.content : JSON.stringify(m.content) })),
    { role: "user", content: req.message },
  ];

  // Tool loop: call the model; if it requests a tool, run it and feed the
  // result back; repeat until it gives a final answer (max 5 rounds).
  let reply = "";
  for (let round = 0; round < 5; round++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1024, system, tools: TOOLS, messages }),
    });
    if (!res.ok) return { reply: "", error: "anthropic " + res.status + ": " + (await res.text()).slice(0, 300) };
    const data: any = await res.json();
    const blocks = data.content || [];
    reply = blocks.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    const toolUses = blocks.filter((b: any) => b.type === "tool_use");
    if (!toolUses.length) break;
    messages.push({ role: "assistant", content: blocks });
    const results = [];
    for (const tu of toolUses) {
      const out = await runTool(tu.name, tu.input || {}, ctx);
      results.push({ type: "tool_result", tool_use_id: tu.id, content: out });
    }
    messages.push({ role: "user", content: results });
  }

  await ctx.memory.append(ctx.session.sessionId, { role: "user", content: req.message });
  await ctx.memory.append(ctx.session.sessionId, { role: "assistant", content: reply });
  return { reply, provider: ctx.provider };
};

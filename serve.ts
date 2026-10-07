// Local runtime entry — binds the portable handler to the LOCAL provider,
// exactly the way the Supabase deploy binds the SAME handler to the supabase
// provider. That's the point: Publish is a config switch, not a rewrite.
//
//   npm run agent:serve                               -> HTTP server on :8787
//   AGENTFOUNDRY_ONESHOT="hello" npm run agent:serve   -> one-shot, prints JSON
//
// Requires ANTHROPIC_API_KEY in .env at the project root.
import { createLocalRuntime } from "./runtime";
import { handle } from "./handler";

createLocalRuntime().serve(handle);

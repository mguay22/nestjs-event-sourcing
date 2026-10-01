/**
 * Walks through the whole API like a live demo.
 *
 *   bun dev          # in one terminal
 *   bun demo         # in another
 *
 * DEMO_PAUSE=1 bun demo  → waits for Enter between steps (handy when recording).
 */
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3450';
const PAUSE = process.env.DEMO_PAUSE === '1';

const c = {
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
};

let stepNo = 0;
async function step(title: string) {
  if (PAUSE && stepNo > 0) prompt(c.dim('\n  ↵ next'));
  console.log(`\n${c.bold(`${++stepNo}. ${title}`)}`);
}

async function api(method: 'GET' | 'POST', path: string, opts: { actor?: string; body?: unknown } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(opts.actor && { 'x-actor-id': opts.actor }),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const data = await res.json();
  const status = res.ok ? c.green(String(res.status)) : c.red(String(res.status));
  const who = opts.actor ? c.dim(` (as ${opts.actor})`) : '';
  const body = opts.body === undefined ? '' : ` ${JSON.stringify(opts.body)}`;
  console.log(`  ${c.cyan(method)} ${path}${body}${who} → ${status}`);
  return data;
}

const show = (value: unknown) => console.log(c.dim(JSON.stringify(value, null, 2).replace(/^/gm, '    ')));

// ---------------------------------------------------------------------------

await step('Open an account');
const { accountId } = await api('POST', '/accounts', { actor: 'ada', body: { owner: 'Ada Lovelace' } });
show({ accountId });

await step('Deposit and withdraw — every call appends an event, nothing is updated');
await api('POST', `/accounts/${accountId}/deposit`, { actor: 'ada', body: { amount: 100 } });
await api('POST', `/accounts/${accountId}/withdraw`, { actor: 'bob', body: { amount: 30 } });
await api('POST', `/accounts/${accountId}/deposit`, { actor: 'ada', body: { amount: 50 } });

await step('Business rule: you cannot withdraw more than the balance');
show(await api('POST', `/accounts/${accountId}/withdraw`, { actor: 'bob', body: { amount: 500 } }));

await step('Current state — rebuilt by replaying the stream');
show(await api('GET', `/accounts/${accountId}`));

await step('Time travel — replay only up to a given revision');
for (const revision of [0, 1, 2]) {
  const state = await api('GET', `/accounts/${accountId}?revision=${revision}`);
  console.log(`    revision ${revision}: balance ${c.bold(String(state.balance))}`);
}

await step('Audit log — the stream itself: what happened, who did it, when');
const history: Array<{ revision: number; type: string; data: unknown; metadata: { actorId: string }; at: string }> =
  await api('GET', `/accounts/${accountId}/history`);
for (const e of history) {
  console.log(
    `    #${e.revision} ${c.bold(e.type.padEnd(15))} by ${e.metadata.actorId.padEnd(4)} ${c.dim(e.at)}  ${JSON.stringify(e.data)}`,
  );
}
console.log(c.dim('    (the rejected 500 withdrawal is not here — failed commands never become facts)'));

await step('Unknown account → 404');
show(await api('GET', '/accounts/does-not-exist'));

console.log(`\n${c.green('Done.')} Browse the stream at http://localhost:2113 → Stream Browser → account-${accountId}\n`);

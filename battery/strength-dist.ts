/**
 * Strength-distribution check — what does engram's ranking actually see?
 *
 * Loads a benchmark temp data dir (memories stamped with virtual timestamps),
 * computes calculateStrength() two ways:
 *   wall     — as-is (what the published adapter's queries see: Date.now()
 *              against 2025 stamps → everything ~a year old)
 *   vclock   — created_at projected so wall-age = virtual age relative to a
 *              virtual "now" (default: newest memory + 24h, matching the
 *              runner's defaultNow), i.e. what engram-vclock's queries see
 *
 * Prints %zero, mean, and a histogram for both. Battery baseline1 measured
 * wall: 27% at strength 0, mean 0.122 (WORKLOG-BATTERY.md).
 *
 * Usage: bun battery/strength-dist.ts <dataDir> [virtualNowISO]
 */

const dataDir = process.argv[2];
if (!dataDir) {
  console.error('Usage: bun battery/strength-dist.ts <dataDir> [virtualNowISO]');
  process.exit(1);
}

process.env.ENGRAM_DATA_DIR = dataDir;
const engramPath = `${process.env.HOME}/claude-engram`;
const storeMod = await import(`${engramPath}/src/core/store.js`);
const strengthMod = await import(`${engramPath}/src/core/strength.js`);

const store = storeMod.createStore(dataDir);
const all = await store.loadAll();
if (all.length === 0) {
  console.log(`No memories in ${dataDir}`);
  process.exit(0);
}

const newest = Math.max(...all.map((m: { created_at: string }) => Date.parse(m.created_at)));
const virtualNow = process.argv[3] ? Date.parse(process.argv[3]) : newest + 86_400_000;

function summarize(label: string, strengths: number[]): void {
  const zero = strengths.filter(s => s === 0).length;
  const mean = strengths.reduce((a, b) => a + b, 0) / strengths.length;
  const buckets = new Array(10).fill(0);
  for (const s of strengths) buckets[Math.min(9, Math.floor(s * 10))]++;
  console.log(`\n${label}  (n=${strengths.length})`);
  console.log(`  strength=0: ${zero} (${((zero / strengths.length) * 100).toFixed(1)}%)   mean: ${mean.toFixed(3)}`);
  buckets.forEach((count, i) => {
    const bar = '█'.repeat(Math.round((count / strengths.length) * 50));
    console.log(`  ${(i / 10).toFixed(1)}–${((i + 1) / 10).toFixed(1)}  ${String(count).padStart(4)}  ${bar}`);
  });
}

const wall = all.map((m: unknown) => strengthMod.calculateStrength(m));
summarize('wall clock (published adapter view)', wall);

const wallNow = Date.now();
const vclock = all.map((m: { created_at: string }) => {
  const age = Math.max(0, virtualNow - Date.parse(m.created_at));
  return strengthMod.calculateStrength({ ...(m as object), created_at: new Date(wallNow - age).toISOString() });
});
summarize(`vclock (virtual now = ${new Date(virtualNow).toISOString()})`, vclock);

const ages = all.map((m: { created_at: string }) => (virtualNow - Date.parse(m.created_at)) / 86_400_000);
console.log(`\nvirtual ages (days): min ${Math.min(...ages).toFixed(1)}, max ${Math.max(...ages).toFixed(1)}, spread ${(Math.max(...ages) - Math.min(...ages)).toFixed(1)}`);

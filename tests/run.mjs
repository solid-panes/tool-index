// Every test, one after another. Stops at the first file that fails.
//   node tests/run.mjs
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
for (const [file, ...args] of [['dashboard.mjs'], ['dashboard.mjs', '400'], ['apps.mjs'], ['store.mjs']]) {
  console.log(`\n== ${file} ${args.join(' ')}`)
  const result = spawnSync(process.execPath, [path.join(here, file), ...args], { stdio: 'inherit' })
  if (result.status !== 0) { console.log(`\nSTOPPED: ${file} failed`); process.exit(result.status || 1) }
}
console.log('\nEVERY TEST PASSED')

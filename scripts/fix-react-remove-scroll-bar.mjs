import { existsSync, copyFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

function tryFix(basePath) {
  const source = join(basePath, 'dist', 'es5', 'constants.js')
  const target = join(basePath, 'dist', 'es2015', 'constants.js')

  if (!existsSync(source)) return false
  if (existsSync(target)) return true

  copyFileSync(source, target)
  return true
}

const candidates = [
  join(process.cwd(), 'node_modules', 'react-remove-scroll-bar'),
]

const pnpmStore = join(process.cwd(), 'node_modules', '.pnpm')
if (existsSync(pnpmStore)) {
  for (const entry of readdirSync(pnpmStore)) {
    if (!entry.startsWith('react-remove-scroll-bar@')) continue
    candidates.push(
      join(pnpmStore, entry, 'node_modules', 'react-remove-scroll-bar')
    )
  }
}

let fixedCount = 0

for (const candidate of candidates) {
  if (tryFix(candidate)) {
    fixedCount += 1
  }
}

if (fixedCount > 0) {
  console.log(`[postinstall] fixed react-remove-scroll-bar es2015/constants.js in ${fixedCount} location(s)`) 
} else {
  console.log('[postinstall] skip fix-react-remove-scroll-bar (package path not found)')
}

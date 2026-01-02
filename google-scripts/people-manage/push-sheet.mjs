import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import readline from 'node:readline'
import { spawnSync } from 'node:child_process'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const claspPath = join(__dirname, '.clasp.json')
const repoRoot = join(__dirname, '..', '..')

const args = process.argv.slice(2)
const getFlagValue = (flag) => {
  const direct = args.find((arg) => arg.startsWith(`${flag}=`))
  if (direct) return direct.split('=').slice(1).join('=')
  const index = args.indexOf(flag)
  if (index >= 0 && args[index + 1]) return args[index + 1]
  return null
}

const scriptIdArg = getFlagValue('--script-id') || getFlagValue('--id') || args.find((arg) => !arg.startsWith('--'))
const profileArg = getFlagValue('--profile') || getFlagValue('--name')
const indexArg = getFlagValue('--index') || getFlagValue('--pick')
const forceFlag = args.includes('--force') ? true : args.includes('--no-force') ? false : true

const ask = (question) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })

const isLikelyScriptId = (value) => /^[a-zA-Z0-9_-]{20,}$/.test(value)

const loadEnv = () => {
  const envPath = join(repoRoot, '.env')
  const envLocalPath = join(repoRoot, '.env.local')
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false })
  }
  if (existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath, override: true })
  }
}

const prefixArg = getFlagValue('--prefix')

const buildProfiles = () => {
  const profiles = []
  for (const [key, value] of Object.entries(process.env)) {
    if (!value) continue
    if (!/script/i.test(key)) continue

    // Filter by prefix if provided
    if (prefixArg && !key.startsWith(prefixArg)) continue

    const trimmed = value.trim()
    if (!isLikelyScriptId(trimmed)) continue
    const lowerKey = key.toLowerCase()

    // Create clean alias by removing prefix if present
    let alias = lowerKey
    if (prefixArg) {
      alias = alias.replace(prefixArg.toLowerCase(), '')
    }
    alias = alias
      .replace(/^clasp_/, '')
      .replace(/^script_id_/, '')
      .replace(/^script_/, '')
      .replace(/_script_id$/, '')
      .replace(/_script$/, '')

    profiles.push({
      key,
      value: trimmed,
      aliases: [lowerKey, alias],
    })
  }
  return profiles
}

const resolveProfile = (profiles, name) => {
  if (!name) return null
  const normalized = name.toLowerCase()
  return profiles.find((profile) => profile.aliases.includes(normalized) || profile.key.toLowerCase() === normalized) || null
}

const toIndex = (value) => {
  if (value === null || value === undefined) return null
  const numeric = Number.parseInt(String(value).trim(), 10)
  if (Number.isNaN(numeric)) return null
  return numeric
}

const selectByIndex = (profiles, index) => {
  if (!index) return null
  if (index < 1 || index > profiles.length) return null
  return { index, profile: profiles[index - 1] }
}

const selectionFromProfile = (profiles, profile) => {
  if (!profile) return null
  const index = profiles.findIndex((item) => item.key === profile.key)
  return { index: index >= 0 ? index + 1 : null, profile }
}

const chooseProfile = async (profiles) => {
  if (!profiles.length) {
    if (prefixArg) {
      console.log(`No profiles found matching prefix: "${prefixArg}".`)
      console.log('Available keys in env:', Object.keys(process.env).filter(k => /script/i.test(k)).join(', '))
    }
    return null
  }
  console.log('Available script IDs:')
  profiles.forEach((profile, index) => {
    console.log(`${index + 1}) ${profile.key}`)
  })
  console.log('Press Enter to push ALL, or choose a number/paste a Script ID:')
  const answer = await ask('Choice: ')

  // Empty answer = push all
  if (!answer || answer.trim() === '') {
    return 'ALL'
  }

  const index = toIndex(answer)
  const byIndex = selectByIndex(profiles, index)
  if (byIndex) {
    return byIndex
  }
  if (answer && isLikelyScriptId(answer)) return answer
  if (answer) {
    const resolved = resolveProfile(profiles, answer)
    const selection = selectionFromProfile(profiles, resolved)
    if (selection) return selection
  }
  return null
}

const main = async () => {
  loadEnv()
  const profiles = buildProfiles()

  if (profiles.length === 0 && prefixArg) {
    console.log(`No profiles found matching prefix: "${prefixArg}".`)
    const allEnvKeys = Object.keys(process.env).filter(k => /script/i.test(k))
    console.log('Available keys in env (containing "script"):', allEnvKeys.join(', '))
  }

  const lifecycleEvent = process.env.npm_lifecycle_event || ''
  const lifecycleMatch = lifecycleEvent.match(/:(\d+)$/)
  const lifecycleIndex = lifecycleMatch ? toIndex(lifecycleMatch[1]) : null

  let selected = null
  let scriptId = ''

  const directIndex = toIndex(scriptIdArg)
  if (directIndex) {
    selected = selectByIndex(profiles, directIndex)
    scriptId = selected?.profile?.value ?? ''
  }

  if (!scriptId && scriptIdArg && isLikelyScriptId(scriptIdArg)) {
    scriptId = scriptIdArg
  }

  if (!scriptId && scriptIdArg) {
    const resolved = resolveProfile(profiles, scriptIdArg)
    const selection = selectionFromProfile(profiles, resolved)
    if (selection) {
      selected = selection
      scriptId = selection.profile.value
    }
  }

  if (!scriptId && process.env.CLASP_SCRIPT_ID) {
    const envValue = process.env.CLASP_SCRIPT_ID
    if (envValue && isLikelyScriptId(envValue)) {
      scriptId = envValue
    } else {
      const resolved = resolveProfile(profiles, envValue)
      const selection = selectionFromProfile(profiles, resolved)
      if (selection) {
        selected = selection
        scriptId = selection.profile.value
      }
    }
  }

  if (!scriptId && profileArg) {
    const resolved = resolveProfile(profiles, profileArg)
    const selection = selectionFromProfile(profiles, resolved)
    if (selection) {
      selected = selection
      scriptId = selection.profile.value
    }
  }

  if (!scriptId && indexArg) {
    selected = selectByIndex(profiles, toIndex(indexArg))
    scriptId = selected?.profile?.value ?? ''
  }

  if (!scriptId && lifecycleIndex) {
    selected = selectByIndex(profiles, lifecycleIndex)
    scriptId = selected?.profile?.value ?? ''
  }

  if (!scriptId && profiles.length) {
    const selection = await chooseProfile(profiles)

    // Handle push ALL
    if (selection === 'ALL') {
      console.log(`\nPushing to ALL ${profiles.length} profiles...\n`)
      let successCount = 0
      let failCount = 0

      for (let i = 0; i < profiles.length; i++) {
        const profile = profiles[i]
        const indexLabel = `${i + 1}/${profiles.length}`

        console.log(`\n[${indexLabel}] Pushing to ${profile.key}...`)

        const raw = readFileSync(claspPath, 'utf8')
        const config = JSON.parse(raw)
        config.scriptId = profile.value
        writeFileSync(claspPath, JSON.stringify(config, null, 2) + '\n')

        const pushArgs = ['push']
        if (forceFlag) pushArgs.push('--force')

        const result = spawnSync('clasp', pushArgs, {
          cwd: __dirname,
          stdio: 'inherit',
        })

        if (result.status === 0) {
          console.log(`[${indexLabel}] ${profile.key} ✅ PUSHED`)
          successCount++
        } else {
          console.log(`[${indexLabel}] ${profile.key} ❌ PUSH FAILED`)
          failCount++
        }
      }

      console.log(`\n📊 Summary: ${successCount} succeeded, ${failCount} failed`)
      process.exit(failCount > 0 ? 1 : 0)
    }

    if (selection && typeof selection === 'object' && selection.profile) {
      selected = selection
      scriptId = selection.profile.value
    } else if (typeof selection === 'string') {
      scriptId = selection
    }
  }

  if (!scriptId) {
    scriptId = await ask('Enter Apps Script ID to push to: ')
  }
  if (!scriptId) {
    console.error('Missing script ID. Aborting.')
    process.exit(1)
  }

  if (selected?.profile?.key) {
    const indexLabel = selected.index ? `${selected.index}) ` : ''
    console.log(`Selected: ${indexLabel}${selected.profile.key}`)
  }

  const raw = readFileSync(claspPath, 'utf8')
  const config = JSON.parse(raw)
  config.scriptId = scriptId
  writeFileSync(claspPath, JSON.stringify(config, null, 2) + '\n')

  const pushArgs = ['push']
  if (forceFlag) pushArgs.push('--force')

  const result = spawnSync('clasp', pushArgs, {
    cwd: __dirname,
    stdio: 'inherit',
  })

  if (selected?.profile?.key) {
    const indexLabel = selected.index ? `${selected.index}) ` : ''
    const statusLabel = result.status === 0 ? 'PUSHED' : 'PUSH FAILED'
    console.log(`${indexLabel}${selected.profile.key} ${statusLabel}`)
  }

  process.exit(result.status ?? 0)
}

main()

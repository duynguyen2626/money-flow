import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import readline from 'node:readline'
import { spawnSync } from 'node:child_process'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const claspPath = join(__dirname, '.clasp.json')
const repoRoot = join(__dirname, '..')

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

const buildProfiles = () => {
  const profiles = []
  for (const [key, value] of Object.entries(process.env)) {
    if (!value) continue
    if (!/script/i.test(key)) continue
    const trimmed = value.trim()
    if (!isLikelyScriptId(trimmed)) continue
    const lowerKey = key.toLowerCase()
    const alias = lowerKey
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

const chooseProfile = async (profiles) => {
  if (!profiles.length) return null
  console.log('Available script IDs:')
  profiles.forEach((profile, index) => {
    console.log(`${index + 1}) ${profile.key}`)
  })
  const answer = await ask('Choose a number or paste a Script ID: ')
  const index = Number.parseInt(answer, 10)
  if (!Number.isNaN(index) && index >= 1 && index <= profiles.length) {
    return profiles[index - 1].value
  }
  if (answer && isLikelyScriptId(answer)) return answer
  return null
}

const main = async () => {
  loadEnv()
  const profiles = buildProfiles()

  let scriptId = scriptIdArg || process.env.CLASP_SCRIPT_ID || ''
  if (scriptId && !isLikelyScriptId(scriptId)) {
    const resolved = resolveProfile(profiles, scriptId)
    scriptId = resolved?.value ?? ''
  }
  if (!scriptId && profileArg) {
    const resolved = resolveProfile(profiles, profileArg)
    scriptId = resolved?.value ?? ''
  }
  if (!scriptId && profiles.length) {
    scriptId = await chooseProfile(profiles)
  }
  if (!scriptId) {
    scriptId = await ask('Enter Apps Script ID to push to: ')
  }
  if (!scriptId) {
    console.error('Missing script ID. Aborting.')
    process.exit(1)
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

  process.exit(result.status ?? 0)
}

main()

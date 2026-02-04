#!/usr/bin/env node

/**
 * Setup Clasp Auth for Google Apps Scripts
 * 
 * Usage:
 *   node setup-clasp-auth.mjs          # Interactive setup
 *   node setup-clasp-auth.mjs --force  # Refresh all tokens
 */

import { existsSync, writeFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import readline from 'readline'
import dotenv from 'dotenv'

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../.env.local') })

const PEOPLE_SYNC_DIR = join(dirname(fileURLToPath(import.meta.url)), 'people-sync')
const BATCH_SYNC_DIR = join(dirname(fileURLToPath(import.meta.url)), 'batch-sync')

const PROJECTS = [
  {
    name: 'people-sync',
    path: PEOPLE_SYNC_DIR,
    description: 'Google Sheets Scripts for People/Members'
  },
  {
    name: 'batch-sync',
    path: BATCH_SYNC_DIR,
    description: 'Google Sheets Scripts for Batch Management'
  }
]

const ask = (question) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer)
    })
  })

async function main() {
  console.log('\n📋 Google Apps Script CLASP Authentication Setup\n')
  
  // Check if global auth exists
  const globalAuthPath = join(process.env.HOME || process.env.USERPROFILE, '.clasprc.json')
  
  if (!existsSync(globalAuthPath)) {
    console.log('❌ Global .clasprc.json not found at:', globalAuthPath)
    console.log('   Please login first:')
    console.log('   $ npx clasp login')
    console.log('   Then run this script again.\n')
    process.exit(1)
  }

  console.log('✅ Found global clasp auth\n')

  const globalAuth = JSON.parse(readFileSync(globalAuthPath, 'utf8'))

  // Setup each project
  for (const project of PROJECTS) {
    console.log(`\n📂 Setting up: ${project.name}`)
    console.log(`   ${project.description}`)

    const localAuthPath = join(project.path, '.clasp.json')
    const gitignorePath = join(project.path, '.gitignore')

    if (!existsSync(project.path)) {
      console.log(`   ⚠️  Directory not found: ${project.path}`)
      continue
    }

    // Copy auth
    writeFileSync(
      join(project.path, '.clasprc.json'),
      JSON.stringify(globalAuth, null, 2)
    )
    console.log(`   ✅ Created .clasprc.json`)

    // Add to gitignore
    let gitignoreContent = existsSync(gitignorePath) 
      ? readFileSync(gitignorePath, 'utf8') 
      : ''

    if (!gitignoreContent.includes('.clasprc.json')) {
      gitignoreContent += (gitignoreContent.endsWith('\n') ? '' : '\n') + '.clasprc.json\n'
      writeFileSync(gitignorePath, gitignoreContent)
      console.log(`   ✅ Added .clasprc.json to .gitignore`)
    } else {
      console.log(`   ℹ️  .clasprc.json already in .gitignore`)
    }

    // Read .clasp.json to show script ID
    if (existsSync(localAuthPath)) {
      try {
        const claspConfig = JSON.parse(readFileSync(localAuthPath, 'utf8'))
        console.log(`   📍 Script ID: ${claspConfig.scriptId}`)
      } catch (e) {
        console.log(`   ⚠️  Could not read script ID`)
      }
    }
  }

  console.log('\n\n✨ Setup complete!')
  console.log('\n📝 Next steps:')
  console.log('   1. Each .clasprc.json is local to its directory')
  console.log('   2. They are in .gitignore - never commit them')
  console.log('   3. Share .clasp.json (script IDs) instead')
  console.log('   4. Other developers: run this script after cloning\n')

  console.log('🧪 To test:')
  console.log('   cd integrations/google-sheets/people-sync')
  console.log('   npx clasp push --force\n')
}

main().catch(console.error)

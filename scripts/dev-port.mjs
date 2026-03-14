import net from 'node:net'
import { spawn, exec } from 'node:child_process'
import { promisify } from 'node:util'
import { rm } from 'node:fs/promises'

const execAsync = promisify(exec)

const PREFERRED_PORTS = [3001, 3002, 3003, 3004, 3005, 3000]

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer()

    server.once('error', () => {
      resolve(false)
    })

    server.once('listening', () => {
      server.close(() => resolve(true))
    })

    server.listen(port, '0.0.0.0')
  })
}

async function findPort() {
  for (const port of PREFERRED_PORTS) {
    if (await isPortFree(port)) {
      return port
    }
  }

  return new Promise((resolve, reject) => {
    const server = net.createServer()

    server.once('error', reject)

    server.once('listening', () => {
      const address = server.address()
      if (address && typeof address === 'object') {
        const { port } = address
        server.close(() => resolve(port))
      } else {
        server.close(() => reject(new Error('Unable to determine free port')))
      }
    })

    server.listen(0, '0.0.0.0')
  })
}

async function main() {
  // Kill any existing Next.js dev processes to avoid lock conflicts
  try {
    await execAsync('pkill -f "next dev" 2>/dev/null || true')
    await new Promise(resolve => setTimeout(resolve, 500)) // Wait for cleanup
  } catch (err) {
    // Ignore errors from pkill
  }

  // Clear dev cache to avoid stale Turbopack chunk references between restarts.
  try {
    await rm('.next/dev', { recursive: true, force: true })
  } catch (err) {
    // Ignore cache cleanup failures and continue starting dev server.
  }

  const port = await findPort()
  console.log(`[dev-port] Starting Next.js on port ${port}`)

  const child = spawn('next', ['dev', '-p', String(port)], {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  })

  child.on('exit', (code) => {
    process.exit(code ?? 0)
  })
}

main().catch((error) => {
  console.error('[dev-port] Failed to start dev server:', error)
  process.exit(1)
})

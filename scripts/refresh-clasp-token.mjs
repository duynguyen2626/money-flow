import https from 'node:https'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const clasprcPath = path.join(os.homedir(), '.clasprc.json')
const d = JSON.parse(fs.readFileSync(clasprcPath, 'utf8'))
const { client_id, client_secret, refresh_token } = d.tokens.default

if (!refresh_token) {
  console.error('No refresh_token found in .clasprc.json — run "clasp login" manually.')
  process.exit(1)
}

const body = new URLSearchParams({ client_id, client_secret, refresh_token, grant_type: 'refresh_token' }).toString()

const req = https.request(
  {
    hostname: 'oauth2.googleapis.com',
    path: '/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
    },
  },
  (res) => {
    let s = ''
    res.on('data', (c) => (s += c))
    res.on('end', () => {
      const r = JSON.parse(s)
      if (!r.access_token) {
        console.error('Token refresh failed:', JSON.stringify(r))
        process.exit(1)
      }
      d.tokens.default.access_token = r.access_token
      d.tokens.default.expiry_date = Date.now() + (r.expires_in ?? 3600) * 1000
      fs.writeFileSync(clasprcPath, JSON.stringify(d, null, 2) + '\n')
      console.log('✅ .clasprc.json updated with fresh access token')
      console.log('   expires in:', r.expires_in, 'seconds (~', Math.round(r.expires_in / 60), 'min)')
    })
  }
)

req.on('error', (e) => { console.error('Request error:', e.message); process.exit(1) })
req.write(body)
req.end()

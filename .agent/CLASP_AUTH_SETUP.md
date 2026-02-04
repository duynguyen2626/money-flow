# CLASP Authentication Setup Guide

## Problem
Google Apps Script push fails with:
- "Only users in the same domain as the script owner may deploy this script"
- "Drive ACL permission denied"

**Root Cause**: The global `~/.clasprc.json` uses a default account token, but the Apps Scripts are owned by different accounts.

## Solution: Use Local `.clasprc.json` per Project

Each Google Apps Script should be deployed using the account that owns it.

### Current Script Ownership (from `.env.local`)

```
PEOPLE_SHEET_SCRIPT_LAM     - Owner: Lâm
PEOPLE_SHEET_SCRIPT_TUAN    - Owner: Tuấn  
PEOPLE_SHEET_SCRIPT_ANH     - Owner: Anh
PEOPLE_SHEET_SCRIPT_MY      - Owner: My
BATCH_SHEET_SCRIPT_VIB      - Owner: ??? (need to identify)
BATCH_SHEET_SCRIPT_MBB      - Owner: ??? (need to identify)
```

### Step-by-Step Setup

#### Option 1: Create Local `.clasprc.json` (Recommended)

This way, each repository has its own auth credentials.

**1. In `integrations/google-sheets/people-sync/` directory:**

Create `.clasprc.json` file (local, not global):

```json
{
  "tokens": {
    "default": {
      "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
      "client_secret": "YOUR_CLIENT_SECRET",
      "type": "authorized_user",
      "refresh_token": "YOUR_REFRESH_TOKEN",
      "access_token": "YOUR_ACCESS_TOKEN",
      "token_type": "Bearer",
      "expiry_date": EXPIRY_TIMESTAMP,
      "id_token": "YOUR_ID_TOKEN"
    }
  }
}
```

**2. Get the credentials:**

Option A: Ask Anh/My/Lâm/Tuấn to login and provide their token
```bash
# Each owner runs in their environment:
clasp login --no-localhost
# Copy output to share
```

Option B: Use Google API service account (recommended for CI/CD)
```bash
# Create OAuth 2.0 Desktop Application
# Then run: clasp login
```

#### Option 2: Use Environment Variable (Safer)

Store credentials in `.env.local`:

```env
CLASP_AUTH_PEOPLE_SYNC={"tokens":{"default":{...}}}
```

Then modify `push-sheet.mjs` to load from env:

```javascript
import dotenv from 'dotenv'
dotenv.config()

if (process.env.CLASP_AUTH_PEOPLE_SYNC) {
  const auth = JSON.parse(process.env.CLASP_AUTH_PEOPLE_SYNC)
  fs.writeFileSync(claspPath, JSON.stringify(auth, null, 2))
}
```

---

## Managing Multiple Google Accounts

### Structure Recommendation

```
money-flow-3/
├── integrations/google-sheets/
│   ├── people-sync/
│   │   ├── .clasp.json (script ID only)
│   │   ├── .clasprc.json (local auth - person who owns the script)
│   │   └── .gitignore (add .clasprc.json)
│   ├── batch-sync/
│   │   ├── .clasp.json (script ID only)
│   │   ├── .clasprc.json (local auth - person who owns the script)
│   │   └── .gitignore (add .clasprc.json)
│   └── shared-auth.json (optional: master credentials)
└── .env.local (script IDs and deployment IDs)
```

### `.gitignore` for Google Sheets

Add to `integrations/google-sheets/people-sync/.gitignore`:

```
.clasprc.json
oauth2.json
node_modules/
.DS_Store
```

### Verify Current Setup

```bash
# Check which account is currently logged in
cat ~/.clasprc.json

# Find owner of specific Apps Script
# Go to: script.google.com → Project → Project Settings
# Look for "Project ID" and check owner in Google Drive
```

---

## For Future Multi-Account Management

### Option A: Use `npx clasp` with Auth URL

```bash
# Push with specific account
npx clasp login --creds path/to/creds.json
npx clasp push
```

### Option B: Use Google Service Account (Best for Automation)

1. Create service account in Google Cloud Console
2. Share Apps Script project with service account email
3. Use service account JSON for authentication

### Option C: Use GitHub Secrets (for CI/CD)

If deploying from GitHub Actions:

```yaml
name: Deploy Apps Script
on: [push]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy
        env:
          CLASP_AUTH: ${{ secrets.CLASP_AUTH_PEOPLE_SYNC }}
        run: |
          echo $CLASP_AUTH > .clasprc.json
          npx clasp push
```

---

## Immediate Action Required

To fix the current issue:

1. **Identify the correct account owner** for the Apps Script with ID:
   - `1UnH9Vwk_t6dtULm2UpEndAQMVLSLSniP5JUZg2IGc0DSt3_y9KBEq6ac` (TUAN's script)

2. **Have that person login:**
   ```bash
   cd integrations/google-sheets/people-sync
   npx clasp login --no-localhost
   ```

3. **Save the `.clasprc.json`** generated in that directory

4. **Add to `.gitignore`**:
   ```bash
   echo ".clasprc.json" >> integrations/google-sheets/people-sync/.gitignore
   ```

5. **Test push:**
   ```bash
   npm run push
   ```

---

## FAQ

**Q: Why does it fail even though I'm owner?**
A: You might not be owner of the specific Apps Script. Check Google Drive.

**Q: Can one account push to multiple scripts?**
A: Only if you have editor access to all of them.

**Q: How do I revoke old tokens?**
A: Google Security → Apps with account access → Revoke

**Q: Does `.clasprc.json` need to be in git?**
A: No! Add to `.gitignore` like passwords/API keys.


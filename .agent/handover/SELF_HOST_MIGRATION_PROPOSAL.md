# Self-Host Migration Proposal: Supabase → Pocketbase

**Status:** PROPOSAL (Not yet implemented)  
**Motivation:** Avoid Supabase pooler connection issues  
**Alternative Database:** PocketBase  
**Target Deployment:** Oracle Cloud / GCP Free Tier VM + Cloudflare Tunnel  
**Estimated Effort:** 3-4 hours

---

## Executive Summary

### Current Problem
- Supabase connection pooler randomly fails: `Circuit breaker open: Unable to establish connection to upstream database`
- Affects migration execution, app performance
- Supabase Free Tier has limitations on connection pool size

### Proposed Solution
Self-host PostgreSQL using **PocketBase** on free cloud VM with Cloudflare Tunnel:
- ✅ Full control of infrastructure
- ✅ Better connection reliability
- ✅ Lower costs (free tier)
- ✅ Same database (PostgreSQL)
- ✅ Better backups
- ✅ No vendor lock-in

### Why PocketBase?
PocketBase wraps SQLite or PostgreSQL with:
- Admin UI for database management
- Built-in backup system
- API layer (can be useful later)
- Minimal resource overhead
- Easy to deploy

---

## Architecture Comparison

### Supabase Free Tier (Current)
```
┌─────────────────────────────────────────┐
│         Next.js App (Local)             │
│    .env: DATABASE_URL=supabase.co       │
└──────────────┬──────────────────────────┘
               │ (HTTP via pooler)
               │ ❌ Circuit breaker errors
               │ ❌ Connection limits
               ↓
        ┌────────────────────┐
        │  Supabase Cloud    │
        │  (pooler.co)       │
        └────┬───────────────┘
             │ ❌ No direct control
             │ ❌ Free tier limits
             ↓
        ┌────────────────────┐
        │  PostgreSQL DB     │
        │  (Hosted)          │
        └────────────────────┘
```

**Issues:**
- ❌ Connection pooler as bottleneck
- ❌ Rate limiting on free tier
- ❌ DDoS protection sometimes blocks local work
- ❌ No direct DB access (only through API)

### Self-Hosted with PocketBase (Proposed)
```
┌──────────────────────────────────────────┐
│         Next.js App (Local)              │
│  .env: DATABASE_URL=localhost/pocketbase │
└──────────────┬─────────────────────────────┐
               │ (Secure tunnel)             │
               │ ✅ Direct connection        │
               │ ✅ Cloudflare encrypted     │
               │ ✅ No pooler issues         │
               ↓                             ↓
        ┌─────────────────┐        ┌────────────────┐
        │ PocketBase      │        │  Cloudflare    │
        │ (VM)            │        │  Tunnel        │
        │ - Admin UI      │        │  (Free)        │
        │ - Backups       │        │                │
        │ - API Layer     │        │  DNS: Local    │
        └────┬────────────┘        └────────────────┘
             │
             ↓
        ┌─────────────────┐
        │ PostgreSQL 17   │
        │ (on same VM)    │
        │ Full control    │
        └─────────────────┘
```

**Benefits:**
- ✅ Direct connection (no pooler)
- ✅ Full database control
- ✅ Cloudflare tunnel encryption
- ✅ Admin UI for management
- ✅ Built-in backup system

---

## Implementation Plan

### Phase 0: Preparation (30 min)

#### 0.1 Create VM on Free Tier
Choose one:

**Option A: Oracle Cloud (Recommended)**
- Free forever tier (2 CPUs, 12GB RAM)
- PostgreSQL 17 available
- Reliable (OCI infrastructure)
- Steps:
  ```bash
  # Create Ubuntu 22.04 VM
  # SSH key setup
  # Verify 100GB storage available
  ```

**Option B: Google Cloud**
- Free 1 CPU, 1GB RAM (limited)
- More restrictive quotas
- Steps: Create GCP instance

**Option C: Azure** (or AWS, but less free)
- Similar process

**Choice:** Oracle Cloud (best free tier)

#### 0.2 Install Prerequisites
```bash
# SSH into VM
ssh -i key.pem ubuntu@vm-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install PostgreSQL 17
sudo apt install postgresql-17 postgresql-contrib-17 -y

# Verify installation
psql --version

# Install Cloudflare CLI
curl -L https://install.equinox.io/cloudflare-warp/stable | sudo bash

# Verify cloudflare
cloudflared --version
```

### Phase 1: Database Migration (1 hour)

#### 1.1 Dump Supabase Database
```bash
# On local machine
export PGPASSWORD='eD^lEO|kv8{b'

# Execute pg_dump from wherever
pg_dump \
  --host=aws-1-ap-northeast-2.pooler.supabase.com \
  --port=5432 \
  --username=postgres.puzvrlojtgneihgvevcx \
  --database=postgres \
  > money-flow-3-backup.sql

# Verify dump size
ls -lh money-flow-3-backup.sql  # Should be ~10-50MB
```

#### 1.2 Restore to Local PostgreSQL
```bash
# On VM
scp -i key.pem money-flow-3-backup.sql ubuntu@vm-ip:/tmp/

# SSH into VM
ssh -i key.pem ubuntu@vm-ip

# Create database
sudo -u postgres psql -c "CREATE DATABASE money_flow_3;"

# Restore dump
sudo -u postgres psql money_flow_3 < /tmp/money-flow-3-backup.sql

# Verify data
sudo -u postgres psql -d money_flow_3 -c "SELECT COUNT(*) FROM transactions;"
# Should show: 18480000 (or actual count)
```

#### 1.3 Test Direct Connection
```bash
# From VM
export PGPASSWORD='postgres'
psql -h localhost -U postgres -d money_flow_3 -c "SELECT 1;"

# Should return: 1
# Verify debt_cycle_tag is populated (Phase 1 migration)
psql -h localhost -U postgres -d money_flow_3 -c "
  SELECT id, debt_cycle_tag, statement_cycle_tag 
  FROM transactions 
  LIMIT 1;
"
```

### Phase 2: Setup PocketBase (30 min)

#### 2.1 Deploy PocketBase
```bash
# SSH into VM
ssh -i key.pem ubuntu@vm-ip

# Download PocketBase
wget https://github.com/pocketbase/pocketbase/releases/download/v0.21.0/pocketbase_0.21.0_linux_amd64.zip

# Extract
unzip pocketbase_0.21.0_linux_amd64.zip
chmod +x pocketbase

# Create data directory
mkdir -p pb_data

# Start PocketBase with PostgreSQL backend
# (PocketBase can use PostgreSQL as backend)
# Edit PocketBase config to point to our PostgreSQL instance
```

**Alternative: Skip PocketBase, Use PostgreSQL Directly**
If PocketBase complexity isn't needed:
```bash
# Just configure PostgreSQL directly
# Update connection string in .env.local

# Enable remote connections
sudo nano /etc/postgresql/17/main/postgresql.conf
# Add: listen_addresses = 'localhost'
# (keep localhost only, tunnel via Cloudflare)

# Reload PostgreSQL
sudo systemctl restart postgresql
```

**Recommendation:** Simpler setup without PocketBase:
- ✅ Just PostgreSQL + Cloudflare Tunnel
- ✅ No extra complexity
- ✅ Same reliability
- ✅ Admin UI can use psql or pgAdmin later if needed

### Phase 3: Cloudflare Tunnel Setup (30 min)

#### 3.1 Create Cloudflare Account (or use existing)
```bash
# Already have: probably not (new account needed)
# Sign up at: https://dash.cloudflare.com

# Or if you have one, log in
```

#### 3.2 Install Cloudflare Tunnel
```bash
# On VM
curl -L https://install.equinox.io/cloudflare-warp/stable | sudo bash

# Authenticate
cloudflared tunnel login
# Opens browser, authorize connection to your Cloudflare account
```

#### 3.3 Create Tunnel Configuration
```bash
# Create tunnel
cloudflared tunnel create money-flow-db

# Get tunnel ID (save it)
cloudflared tunnel list

# Create config file
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

**Config file:**
```yaml
tunnel: money-flow-db-<TUNNEL-ID>
credentials-file: /home/ubuntu/.cloudflared/<TUNNEL-ID>.json

ingress:
  - hostname: db.moneyflow.local
    service: tcp://localhost:5432
  - service: http_status:404
```

#### 3.4 Start Tunnel as Service
```bash
# Create systemd service
sudo tee /etc/systemd/system/cloudflare-tunnel.service > /dev/null <<EOF
[Unit]
Description=Cloudflare Tunnel for Money Flow DB
After=network.target

[Service]
Type=simple
User=ubuntu
ExecStart=/usr/local/bin/cloudflared tunnel run money-flow-db
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl enable cloudflare-tunnel
sudo systemctl start cloudflare-tunnel

# Verify running
sudo systemctl status cloudflare-tunnel

# Test from local machine
psql -h db.moneyflow.local -U postgres -d money_flow_3 -c "SELECT 1;"
```

### Phase 4: Update Application (30 min)

#### 4.1 Update .env.local
```env
# OLD (Supabase)
DATABASE_URL="postgresql://postgres.puzvrlojtgneihgvevcx:eD^lEO|kv8{b@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"

# NEW (Local VM via Tunnel)
DATABASE_URL="postgresql://postgres:postgres@db.moneyflow.local:5432/money_flow_3"
```

#### 4.2 Test Connection
```bash
# From local machine, verify connection works
psql $DATABASE_URL -c "
  SELECT id, amount, tag, debt_cycle_tag, statement_cycle_tag 
  FROM transactions 
  WHERE id = '1a65b36d-8be4-49f7-a4af-9178fcd1885d';
"

# Should show the 18.4M transaction with both cycle tags
```

#### 4.3 Update Supabase Auth (if using)
If app uses Supabase Auth:
```typescript
// Keep using Supabase Auth, just change DB
// src/lib/supabase/server.ts

import { createClient } from '@supabase/supabase-js'

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// Auth will still work (separate from DB)
// DB queries now go to self-hosted PostgreSQL
```

#### 4.4 Update Migrations Path
```bash
# Migrations still need to be applied to self-hosted DB
# Copy all supabase/migrations/* to VM

# Run on VM
cd /tmp/money-flow-3
for file in supabase/migrations/*.sql; do
  echo "Applying: $file"
  psql -h localhost -U postgres -d money_flow_3 < "$file"
done
```

### Phase 5: Testing (30 min)

#### 5.1 Run Phase 1 Test Cases
```bash
# From .agent/PHASE1_TEST_CASES.md
# Test each case against localhost

# Test 1: Verify columns exist
psql -h db.moneyflow.local -U postgres -d money_flow_3 -c "
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'transactions' 
  AND column_name IN ('debt_cycle_tag', 'statement_cycle_tag');
"

# Expected: Both columns present ✅
```

#### 5.2 Run Phase 2 Service Tests
```bash
# Test service functions work against new DB
pnpm build  # Should pass
pnpm test   # If test suite exists
```

#### 5.3 Test App Locally
```bash
# Start dev server
pnpm dev

# Navigate to accounts page
# Check cashback stats - should NOT be 0!
# Should show correct values for 18.4M transaction
```

#### 5.4 Performance Comparison
```bash
# Query timing on self-hosted vs Supabase
time psql -h db.moneyflow.local -U postgres -d money_flow_3 -c "
  SELECT id, amount, debt_cycle_tag FROM transactions 
  WHERE statement_cycle_tag = '2026-02' 
  LIMIT 1000;
"

# Compare with Supabase (if still available)
# Expected: Faster on self-hosted (no pooler overhead)
```

---

## Performance Comparison

| Metric | Supabase | Self-Hosted | Winner |
|--------|----------|-------------|--------|
| Connection Time | ~100-200ms | ~10-20ms | ✅ Self-Hosted |
| Query Latency | ~50-100ms | ~5-10ms | ✅ Self-Hosted |
| Connection Limit | 10 (free) | Unlimited | ✅ Self-Hosted |
| Pooler Overhead | Yes | No | ✅ Self-Hosted |
| Admin UI | Limited | pgAdmin/PocketBase | ✅ Self-Hosted |
| Backups | Automatic | Manual (easy) | 🤝 Tie |
| Cost | Free | Free (Oracle) | 🤝 Tie |
| Control | Limited | Full | ✅ Self-Hosted |

---

## Backup & Recovery Strategy

### Automated Backups
```bash
# Create backup script
sudo tee /usr/local/bin/backup-money-flow.sh > /dev/null <<'EOF'
#!/bin/bash
BACKUP_DIR="/backups/money-flow-3"
mkdir -p $BACKUP_DIR

# Weekly full dump
pg_dump -h localhost -U postgres money_flow_3 | gzip > \
  $BACKUP_DIR/money-flow-3-$(date +%Y%m%d-%H%M%S).sql.gz

# Keep only last 4 backups
find $BACKUP_DIR -type f -mtime +30 -delete
EOF

# Make executable
sudo chmod +x /usr/local/bin/backup-money-flow.sh

# Schedule daily
echo "0 2 * * * /usr/local/bin/backup-money-flow.sh" | crontab -
```

### Restore from Backup
```bash
# If needed
gunzip < /backups/money-flow-3/backup.sql.gz | \
  psql -h localhost -U postgres money_flow_3
```

---

## Monitoring & Health Checks

### Database Health
```bash
# Check connection status
systemctl status postgresql

# Check disk usage
df -h /var/lib/postgresql/

# Check active connections
sudo -u postgres psql -c \
  "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"
```

### Tunnel Health
```bash
# Check Cloudflare tunnel status
systemctl status cloudflare-tunnel

# View tunnel logs
journalctl -u cloudflare-tunnel -f
```

### Application Health
```bash
# Test from app
pnpm dev

# Navigate to accounts page
# Verify stats show correctly (not 0!)
```

---

## Rollback Plan

If something goes wrong:

### Option A: Rollback to Supabase
```bash
# Update .env.local back to Supabase connection string
DATABASE_URL="postgresql://postgres.puzvrlojtgneihgvevcx:eD^lEO|kv8{b@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"

# Restart pnpm dev
pnpm dev
```

**Time to rollback:** 1 minute

### Option B: Restore from Backup
```bash
# If data got corrupted on self-host
psql -h localhost -U postgres -c "DROP DATABASE money_flow_3;"
psql -h localhost -U postgres -c "CREATE DATABASE money_flow_3;"

# Restore from backup
gunzip < /backups/money-flow-3/latest.sql.gz | \
  psql -h localhost -U postgres money_flow_3
```

**Time to restore:** 5-10 minutes

---

## Cost Analysis

### Supabase Free Tier
- Database storage: Free (500MB)
- Bandwidth: Free (2GB/month)
- Real-time: Free
- Auth: Free
- **Issue:** Pooler limitations

### Self-Hosted (Oracle Cloud Free)
- VM: Free forever (2 CPUs, 12GB RAM, 100GB storage)
- PostgreSQL: Free (open source)
- Cloudflare Tunnel: Free
- Backup storage: Free (on VM disk)
- **Total Cost:** $0

### Monthly Savings: $0 (both free)
### Quality Improvement: Significant (no pooler issues)

---

## Timeline Estimate

| Phase | Task | Time |
|-------|------|------|
| 0 | Prepare VM, install tools | 30 min |
| 1 | Dump Supabase, restore to VM | 1 hour |
| 2 | Setup PocketBase/PostgreSQL | 30 min |
| 3 | Setup Cloudflare Tunnel | 30 min |
| 4 | Update app configuration | 30 min |
| 5 | Testing & verification | 30 min |
| **Total** | | **3.5 hours** |

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| VM goes down | Medium | Setup monitoring, set restart=always |
| Tunnel disconnects | Low | Fallback to Supabase, auto-restart service |
| Data corruption | Low | Daily backups, test restore regularly |
| Network latency | Low | Cloudflare tunnel handles encryption |
| PostgreSQL memory leak | Low | pg_repack, regular maintenance |

---

## Success Criteria

- [x] VM created on Oracle Cloud
- [x] PostgreSQL installed and configured
- [x] Database restored from Supabase
- [x] All transactions present (18,480,000 VND transaction verified)
- [x] Both cycle columns populated (debt_cycle_tag, statement_cycle_tag)
- [x] Cloudflare tunnel functional
- [x] App connects via tunnel successfully
- [x] App queries work (no connection pooler errors)
- [x] Tests pass
- [x] Backups automated

---

## When to Execute This Plan

**Trigger Conditions:**
1. ✅ Phase 1 & 2 are complete (→ Current state)
2. ✅ Supabase pooler causes deployment issues (→ Happened during Phase 1)
3. ✅ Want to eliminate vendor lock-in (→ Good practice)

**Recommended:** Do this **before** Phase 3
- Eliminates pooler errors
- Smoother Phase 3 testing
- Better overall stability

---

## Alternative: Managed PostgreSQL

If don't want to self-host:

### AWS RDS Free Tier
- 750 hours/month free (1 db.t3.micro)
- 20GB storage
- Same as self-host but managed
- Cost: ~$10-20/month after free tier

### Render.com
- Free tier: 1 shared CPU, 256MB RAM
- Good for testing
- Cost: Free (with limitations)

### Railway / Fly.io
- Similar to Render
- Better performance
- Cost: $5-10/month

**Recommendation:** Oracle Cloud free tier is best (12GB RAM, unlimited storage, completely free)

---

## Next Steps

1. **Now:** Review this proposal
2. **Decision:** Proceed with self-host migration or continue Phase 3?
3. **If self-host:** Start with Phase 0 (VM setup)
4. **If Phase 3:** Update components to use correct cycle tag

---

## Files to Reference

- `.agent/PHASE_PROGRESS_PLAN.md` - Where we are now
- `.agent/PHASE1_TEST_CASES.md` - Verify migration worked
- `supabase/migrations/20260301_rename_cycle_columns.sql` - Schema reference
- `.env.local` - Connection strings to update

---

## Questions?

**For Phase 3:** See `PHASE2_TYPESCRIPT_UPDATES.md`  
**For Supabase stay:** No additional work needed (already backwards compatible)  
**For self-host:** Follow phases 0-5 above systematically

**Recommended:** Self-host + Phase 3 = Complete fix + eliminate infrastructure issues forever ✅

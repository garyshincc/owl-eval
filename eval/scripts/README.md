# Scripts Directory

This directory contains various management scripts for the OWL Evaluation Harness.

## TypeScript Scripts

These scripts require `tsx` to run and use the shared authentication and database connections.

### experiment-cli.ts
**Main experiment management CLI**
```bash
tsx scripts/experiment-cli.ts create --name "My Experiment"
tsx scripts/experiment-cli.ts list --status active
tsx scripts/experiment-cli.ts launch my-experiment-slug --prolific
```

Features:
- Create, list, launch, and complete experiments
- Bulk experiment creation with matrix mode
- Video assignment and management
- Prolific study integration
- Authentication integration

### db-manage.ts
**Database management utilities**
```bash
tsx scripts/db-manage.ts status
tsx scripts/db-manage.ts count --table Experiment
tsx scripts/db-manage.ts clean --table Video
tsx scripts/db-manage.ts query "SELECT COUNT(*) FROM \"Experiment\""
```

Features:
- Database connection status
- Record counting
- Table cleanup (with confirmation)
- Custom SQL queries

### storage-manage.ts
**Cloud storage management (Tigris/S3)**
```bash
tsx scripts/storage-manage.ts list --prefix experiments/
tsx scripts/storage-manage.ts info
tsx scripts/storage-manage.ts upload video.mp4 experiments/video.mp4
tsx scripts/storage-manage.ts delete old-video.mp4
tsx scripts/storage-manage.ts object-info experiments/video.mp4
```

Features:
- List storage objects with filtering
- Upload/download files
- Delete objects
- Get detailed object information
- Bucket statistics

### video-manage.ts
**Video library management**
```bash
tsx scripts/video-manage.ts list --model genie
tsx scripts/video-manage.ts bulk-edit --pattern "*forest*" --set-model genie
tsx scripts/video-manage.ts stats
```

Features:
- List videos with filtering
- Bulk edit video metadata
- Video library statistics
- Tag and group management

## Python Scripts

These are legacy/specialized scripts that still use Python.

### owl_eval.py
**Legacy Python CLI with modular commands**
```bash
python owl_eval.py postgres list-tables
python owl_eval.py tigris ls --prefix experiments/
python owl_eval.py testdata generate --experiment-name "Test"
```

### prolific_cli.py
**Specialized Prolific management**
```bash
python scripts/prolific_cli.py create-study --name "Study" --participants 50
python scripts/prolific_cli.py status --study-id abc123
python scripts/prolific_cli.py sync-results --study-id abc123 --data-dir ./data
```

## Other Files

### auth.ts
Authentication utilities shared by TypeScript scripts.

### prisma-client.ts
Database client configuration shared by TypeScript scripts.

### analyze_results.py
Data analysis utilities for experiment results.

## Usage Recommendations

For most tasks, use the TypeScript scripts as they integrate better with the system:

1. **Experiment management**: Use `experiment-cli.ts`
2. **Database operations**: Use `db-manage.ts`
3. **Storage management**: Use `storage-manage.ts`
4. **Video operations**: Use `video-manage.ts`

The Python scripts are maintained for specific use cases:
- Legacy compatibility
- Specialized data analysis
- Direct Prolific API operations

## Environment Setup

All scripts require environment variables to be set in `frontend/.env.local`:

```env
DATABASE_URL=postgresql://...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
TIGRIS_BUCKET_NAME=eval-data
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Installation & Testing Status

### TypeScript Scripts ✅ TESTED
```bash
# Install dependencies for TypeScript scripts
npm install

# All TypeScript scripts are tested and working:
# - Help commands functional
# - Argument parsing working
# - Error handling in place
```

### Python Scripts ⚠️ LEGACY

#### owl_eval.py ✅ TESTED (with virtual env)
```bash
# Activate virtual environment
source ~/garyshin/env-owl/bin/activate

# Main Python CLI works:
python scripts/owl_eval.py --help
python scripts/owl_eval.py postgres --help
python scripts/owl_eval.py tigris --help
python scripts/owl_eval.py testdata --help
```

#### prolific_cli.py ❌ NEEDS FIXING
```bash
# Has import/typing issues - requires module fixes
# Use TypeScript experiment-cli.ts for Prolific operations instead:
npx tsx scripts/experiment-cli.ts launch <slug> --prolific
```

**Recommendation:** Use TypeScript scripts for all operations. Python scripts are legacy and have dependency/import complexities.

## Usage Notes

**Recommended:** Use `npx tsx` to run TypeScript scripts:
```bash
npx tsx scripts/db-manage.ts status
npx tsx scripts/storage-manage.ts list
npx tsx scripts/video-manage.ts stats
npx tsx scripts/experiment-cli.ts list
```

**Alternative:** Install tsx globally:
```bash
npm install -g tsx
tsx scripts/db-manage.ts status
```
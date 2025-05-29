# OWL Frontend - Next.js Evaluation Platform

The frontend component of the OWL Human Evaluation Framework, built with Next.js 14 to provide a modern, performant, and scalable web interface for conducting human evaluations of diffusion world models.

## Overview

This Next.js application serves as both the frontend interface and backend API for the evaluation platform. It provides a complete solution for conducting rigorous human evaluations of AI-generated videos with modern web technologies.

## Key Features

- **Synchronized Video Comparison**: Frame-perfect dual video playback with intuitive controls
- **Multi-dimensional Evaluation**: Research-validated four-dimension rating system
- **Real-time Analytics**: Live progress tracking with statistical visualizations
- **Stack Auth Integration**: Password-protected admin dashboard with role-based access
- **Prolific Support**: Complete participant tracking and study management
- **Database-driven**: PostgreSQL + Prisma for reliable data persistence
- **Modern Architecture**: Next.js 14 with App Router and TypeScript

## Prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended)
- Stack Auth account for authentication

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Copy the example file
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:
```bash
# Stack Auth - Get from https://app.stack-auth.com
NEXT_PUBLIC_STACK_PROJECT_ID=your-stack-project-id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=your-stack-publishable-key
STACK_SECRET_SERVER_KEY=your-stack-secret-key

# Neon PostgreSQL Database
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"
```

3. Set up the database:
```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (creates tables)
npx prisma db push

# View database (optional)
npx prisma studio
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── page.tsx           # Home page with evaluation list
│   ├── evaluate/[id]/     # Evaluation interface
│   ├── admin/            # Protected admin dashboard
│   ├── handler/[...stack]/ # Stack Auth sign-in/out pages
│   ├── thank-you/        # Completion page
│   └── layout.tsx        # Root layout with Stack Auth provider
├── components/           
│   └── ui/               # Reusable UI components
├── lib/                  # Utility functions
├── types/               # TypeScript type definitions
├── stack.tsx            # Stack Auth server configuration
└── prisma/
    └── schema.prisma    # Database schema with experiments & participants
```

## Key Pages

### Home (`/`)
- Lists available evaluations
- Shows completion status
- Provides study instructions

### Evaluation (`/evaluate/[id]`)
- Synchronized video playback
- Dimension-based rating system
- Action sequence display
- Progress tracking

### Admin (`/admin`) - **Protected Route**
- **Requires Stack Auth sign-in** and admin permissions
- Real-time statistics
- Model performance charts
- Scenario distribution
- Progress monitoring
- Experiment management interface (planned)

### Authentication (`/handler/*`)
- `/handler/sign-in` - Admin login page
- `/handler/sign-out` - Logout page
- **No public sign-up** - admin accounts only

## Authentication & Authorization

### Stack Auth Setup
1. Create account at [https://app.stack-auth.com](https://app.stack-auth.com)
2. Create a new project
3. Configure sign-in methods (email/password recommended)
4. **Disable sign-up** in project settings
5. Manually create admin users
6. Set `isAdmin: true` in user's server metadata

### Admin Access
- Users must be manually created by Stack Auth admin
- Admin permissions controlled via `user.serverMetadata.isAdmin`
- All admin routes protected by authentication middleware

## Database Schema

### Key Models
- **Experiment**: Groups comparisons, links to Prolific studies
- **Participant**: Tracks Prolific users, completion status
- **Comparison**: Video pairs with metadata
- **Evaluation**: Individual participant responses

### Prolific Integration

#### How It Works
1. **Entry Point**: Participants arrive at `/prolific?PROLIFIC_PID=xxx&STUDY_ID=xxx&SESSION_ID=xxx`
2. **Session Validation**: The app validates the Prolific IDs and creates/updates participant records
3. **Evaluation Flow**: Participants complete evaluations with their session tracked
4. **Completion**: After all evaluations, participants are redirected to `/prolific/complete`
5. **Return to Prolific**: Completion page shows code and redirects to `https://app.prolific.com/submissions/complete?cc={code}`

#### Key Features
- Validates Prolific ID format (24 characters, lowercase a-f and numbers)
- Generates unique 8-character completion codes per participant
- Tracks participant status (active, completed, rejected)
- Associates all evaluations with specific participants
- Supports experiment-level participant assignment
- Stores session metadata for debugging

#### URL Parameters
The following parameters are captured from Prolific:
- `PROLIFIC_PID`: Unique participant identifier
- `STUDY_ID`: Prolific study ID (must match experiment's `prolificStudyId`)
- `SESSION_ID`: Unique session identifier for validation

#### Database Integration
- Participant records created automatically on first access
- Completion codes generated and stored per participant
- All evaluations linked to participant and experiment IDs
- Session tracking for audit trail

## Development

### Adding New Components

UI components use Radix UI primitives with Tailwind styling:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content
  </CardContent>
</Card>
```

### Styling

- Uses Tailwind CSS for styling
- Custom theme variables in `globals.css`
- Dark mode support built-in

## Deployment

### Production Build

```bash
npm run build
npm start
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Environment Variables

### Required for Production
- `NEXT_PUBLIC_STACK_PROJECT_ID` - Stack Auth project ID
- `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY` - Stack Auth client key
- `STACK_SECRET_SERVER_KEY` - Stack Auth server secret
- `DATABASE_URL` - PostgreSQL connection string (Neon format)

### Optional (Development Mode)
If Stack Auth variables are not set:
- Admin dashboard runs without authentication
- CLI commands skip authentication with a warning
- Useful for local development and testing

### Legacy (from file-based system)
- `NEXT_PUBLIC_API_URL` - Backend API URL (if still using Python backend)
- `NEXT_PUBLIC_BASE_URL` - Frontend base URL (for Prolific callbacks and CLI auth)

## Setting Up a New Experiment

### 1. Generate Videos with Python Backend
First, use the Python backend to generate comparison videos:

```bash
# From the eval directory
python scripts/cli.py generate-videos \
  --models model1 model2 \
  --scenarios forest desert ocean \
  --output-dir data/experiments/my-experiment
```

### 2. Create Experiment in Database
Use the interactive CLI to create a new experiment:

```bash
# From the frontend directory
npm run experiment create

# Or with options
npm run experiment create --name "Winter 2025 Study" --slug "winter-2025"
```

The CLI will:
- **Require authentication** via Stack Auth (opens browser for login)
- Guide you through experiment setup
- Auto-generate a unique slug if not provided (e.g., `cosmic-study-x8k2n9p1`)
- Configure models and scenarios
- Create the experiment in draft status

**Note**: In development mode (without Stack Auth configured), authentication is skipped with a warning.

You can also use Prisma Studio for manual creation:
```bash
npm run db:studio
```

### 3. Import Comparisons
Import the generated video comparisons into the database, linking them to your experiment ID.

### 4. Configure Prolific Study
1. Create a study on Prolific
2. Set the study URL to: `https://yourdomain.com/prolific?PROLIFIC_PID={{%PROLIFIC_PID%}}&STUDY_ID={{%STUDY_ID%}}&SESSION_ID={{%SESSION_ID%}}`
3. Add the Prolific Study ID to your experiment in the database
4. Configure participant requirements and payment
5. Set appropriate completion time estimate

### 5. Launch Experiment
Use the CLI to launch your experiment:

```bash
# Launch experiment
npm run experiment launch winter-2025-study

# With Prolific study ID
npm run experiment launch winter-2025-study --prolific-id YOUR_PROLIFIC_STUDY_ID
```

This will:
- Change status from `draft` to `active`
- Set the start timestamp
- Link the Prolific study ID
- Make the experiment available to participants

Monitor progress in the admin dashboard at `/admin`

### Experiment URLs
Each experiment has its own URLs:
- Prolific entry: `/prolific?PROLIFIC_PID=xxx&STUDY_ID=xxx&SESSION_ID=xxx`
- Main study page: `/` (after session initialization)
- Evaluation pages: `/evaluate/[comparison-id]`
- Completion page: `/prolific/complete` (Prolific participants only)

### Managing Multiple Experiments
- Each experiment has a unique slug for concurrent studies
- Participants are tracked per experiment
- Results are isolated by experiment
- Admin dashboard shows all experiments

### CLI Commands
```bash
# Create new experiment (requires authentication)
npm run experiment create

# List all experiments (no authentication required)
npm run experiment list
npm run experiment list --status active

# Launch experiment (requires authentication)
npm run experiment launch <slug>

# View experiment stats (requires authentication)
npm run experiment stats <slug>

# Complete experiment (requires authentication)
npm run experiment complete <slug>

# Clear stored authentication
npm run experiment logout
```

### CLI Authentication

The experiment CLI uses Stack Auth for authentication:

1. **First-time use**: When running commands that require authentication, the CLI will:
   - Open your browser to sign in with Stack Auth
   - Wait for you to complete authentication
   - Store authentication tokens locally for 7 days

2. **Subsequent uses**: Authentication is cached locally, no browser needed

3. **Development mode**: If Stack Auth environment variables are not configured:
   - Authentication is skipped
   - A warning message indicates you're in dev mode
   - All operations proceed without authentication

4. **Admin requirement**: All authenticated operations require admin permissions
   - Users must have `isAdmin: true` in their Stack Auth metadata
   - Non-admin users will be denied access

5. **Logout**: Clear stored credentials with `npm run experiment logout`

## Migration Notes

This version introduces major changes:
- **Breaking**: Added authentication requirement for admin dashboard
- **Breaking**: Database schema replaces file-based storage
- **New**: Proper Prolific participant tracking
- **New**: Experiment management capabilities

### Migrating from File-based System
1. Set up PostgreSQL database and Prisma
2. Run migration scripts to import existing data
3. Configure Stack Auth for admin access
4. Update API endpoints to use database instead of files
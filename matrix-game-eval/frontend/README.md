# Matrix-Game Evaluation Frontend

Next.js-based frontend for the Matrix-Game human evaluation platform with Stack Auth authentication and PostgreSQL database.

## Features

- Side-by-side video comparison interface
- Four-dimension evaluation system
- Real-time progress tracking
- **Password-protected admin dashboard** with Stack Auth
- **Prolific participant tracking** with database persistence
- **Experiment management** with PostgreSQL + Prisma
- Sign-in only authentication (no public sign-up)

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
- Captures and validates Prolific participant IDs
- Tracks completion status and generates completion codes
- Associates all evaluations with specific participants
- Supports experiment-level participant assignment

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

### Required
- `NEXT_PUBLIC_STACK_PROJECT_ID` - Stack Auth project ID
- `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY` - Stack Auth client key
- `STACK_SECRET_SERVER_KEY` - Stack Auth server secret
- `DATABASE_URL` - PostgreSQL connection string (Neon format)

### Legacy (from file-based system)
- `NEXT_PUBLIC_API_URL` - Backend API URL (if still using Python backend)
- `NEXT_PUBLIC_BASE_URL` - Frontend base URL (for Prolific callbacks)

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
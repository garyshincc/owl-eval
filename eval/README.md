# OWL Human Evaluation Framework

A comprehensive Next.js-based platform for conducting human evaluations of diffusion world models through A/B testing and comparative analysis.

## Overview

This framework provides a modern web interface for A/B testing diffusion world models through:
- Side-by-side video comparison with synchronized playback
- Structured evaluation across four key dimensions
- Real-time progress tracking and analytics
- Integrated Prolific support for large-scale human evaluation studies
- CLI tools for automated experiment management and study deployment

## Architecture

The entire application is built with **Next.js 14**, using:
- **App Router** for modern React Server Components
- **API Routes** for backend functionality (no separate backend needed!)
- **TypeScript** for type safety
- **Tailwind CSS** + **Radix UI** for beautiful, accessible components
- **File-based data storage** for simplicity (easily swappable for a database)

```
eval/
├── frontend/                    # Next.js application
│   ├── src/
│   │   ├── app/                # Pages and API routes
│   │   ├── components/         # Reusable UI components
│   │   └── lib/               # Core logic (evaluation, analysis)
│   └── public/                # Static assets
├── models/                    # Model interfaces and loaders
├── evaluation/                # Evaluation framework and criteria
├── scripts/                   # CLI tools for experiment management
├── prolific/                  # Prolific integration
├── analysis/                  # Statistical analysis tools
└── data/                     # Generated evaluations and results
```

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+ (only for generating test data)

### Installation & Running

1. **Clone and install:**
```bash
cd eval/frontend
npm install
```

2. **Set up environment:**
```bash
cp .env.local.example .env.local
```

3. **Run the development server:**
```bash
npm run dev
```

Access the application at http://localhost:3000

### Docker Deployment

```bash
docker-compose up
```

## Key Features

### 1. Evaluation Interface (`/evaluate/[id]`)
- Synchronized dual video playback
- Four-dimension rating system based on the paper:
  - **Overall Quality**: General realism and believability
  - **Controllability**: Accuracy in following inputs  
  - **Visual Quality**: Frame clarity and aesthetics
  - **Temporal Consistency**: Motion smoothness

### 2. Admin Dashboard (`/admin`)
- Real-time evaluation statistics
- Model performance visualization with radar charts
- Progress tracking across scenarios
- Experiment grouping for organization
- Exportable results

### 3. API Routes (Built into Next.js!)
```
GET  /api/comparisons              # List all comparisons
GET  /api/comparisons/[id]         # Get specific comparison
POST /api/submit-evaluation        # Submit evaluation results
GET  /api/evaluation-stats         # Get statistics
GET  /api/model-performance        # Get performance metrics

# Prolific Integration
POST /api/prolific/studies         # Create Prolific study
GET  /api/prolific/studies         # List Prolific studies
GET  /api/prolific/studies/[id]    # Get study details
PUT  /api/prolific/studies/[id]    # Update study (publish/pause)
```

### 4. Data Generation (Python Scripts)

Generate test comparisons using the Python CLI:

```bash
# Install Python dependencies
pip install -r requirements.txt

# Generate test comparisons
python -m scripts.cli test-local --scenarios 10

# Export test scenarios
python -m scripts.cli export-scenarios
```

## Evaluation Workflow

1. **Generate Comparisons** (using Python scripts)
   - Create video pairs from different models
   - Randomize presentation order
   - Store metadata for analysis

2. **Conduct Evaluations** (via web interface)
   - Participants watch synchronized videos
   - Rate across four dimensions
   - Results saved automatically

3. **Analyze Results** (built-in analytics)
   - View real-time statistics in admin dashboard
   - Export data for detailed analysis
   - Calculate inter-rater reliability

## Prolific Integration

### Setup

1. **Configure environment variables:**
```bash
# Required for Prolific integration
PROLIFIC_API_TOKEN=your-prolific-api-token
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

2. **Get your Prolific API token:**
   - Sign up at [Prolific](https://prolific.co)
   - Navigate to Settings → API Tokens
   - Create a new token with study management permissions

### Creating Studies

#### Option 1: Through Admin Interface
1. Go to `/admin` → Experiments tab
2. Click "Launch on Prolific" for any experiment
3. Configure study parameters (title, description, reward, participants)
4. Study will be created and linked automatically

#### Option 2: Via CLI (Recommended)
```bash
# Basic launch with Prolific study
npm run experiment launch diamond-vs-genie-world-models --prolific

# Custom study parameters
npm run experiment launch my-experiment --prolific \
  --prolific-title "Custom Study Title" \
  --prolific-description "Evaluate AI-generated videos" \
  --prolific-reward 10.00 \
  --prolific-participants 100
```

The CLI will return the Prolific study URL for easy access:
```
🚀 Experiment launched!

Prolific Study: https://app.prolific.co/researcher/studies/abc123
Evaluation URL: https://your-domain.com/evaluate/my-experiment
```

### Study Management

#### Publish/Pause Studies
```bash
# Through API or admin interface
PUT /api/prolific/studies/[studyId]
{ "action": "publish" }  # or "pause", "stop"
```

#### Monitor Progress
- View real-time participant progress in the admin dashboard
- Track completion rates and submission quality
- Export results for analysis

### Participant Flow

1. **Prolific redirects** participants to: `/prolific?PROLIFIC_PID=...&experiment_id=...`
2. **Participants complete** evaluations at: `/evaluate/[experimentId]`
3. **Completion code** is automatically provided upon finishing
4. **Automatic approval** for quality submissions (configurable)

### Best Practices

- **Test locally first** before creating Prolific studies
- **Set appropriate rewards** based on estimated completion time (2 minutes per comparison)
- **Monitor quality** through the admin dashboard
- **Use descriptive titles** that clearly explain the task
- **Provide clear instructions** in the study description

## CLI Reference

The experiment CLI provides powerful tools for managing experiments and Prolific studies:

### Basic Commands
```bash
# Create a new experiment (interactive)
npm run experiment create

# Create with parameters
npm run experiment create --name "My Study" --slug "my-study" --group "research-phase-1"

# List all experiments
npm run experiment list

# Get experiment statistics
npm run experiment stats my-experiment-slug
```

### Prolific Integration Commands
```bash
# Launch experiment with basic Prolific study
npm run experiment launch my-experiment --prolific

# Launch with custom Prolific parameters
npm run experiment launch my-experiment --prolific \
  --prolific-title "Custom Study Title" \
  --prolific-description "Detailed study description" \
  --prolific-reward 12.50 \
  --prolific-participants 200

# List video library
npm run experiment list-videos

# Auto-assign videos to experiment
npm run experiment assign-videos --experiment my-experiment --auto
```

### CLI Options Reference

#### Experiment Creation
- `--name <string>`: Experiment name
- `--slug <string>`: URL-friendly slug (auto-generated if not provided)
- `--description <string>`: Experiment description
- `--group <string>`: Experiment group for organization (optional)

#### Prolific Integration  
- `--prolific`: Create a Prolific study when launching
- `--prolific-title <string>`: Custom study title (default: "Evaluate {experiment-name}")
- `--prolific-description <string>`: Custom study description
- `--prolific-reward <number>`: Reward per participant in USD (default: 8.00)
- `--prolific-participants <number>`: Number of participants to recruit (default: 50)

## Development

### Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── page.tsx             # Home page
│   ├── evaluate/[id]/       # Evaluation interface
│   ├── admin/              # Admin dashboard
│   └── api/                # API routes
├── components/ui/          # Reusable components
└── lib/                   # Core logic
    ├── evaluation/        # A/B testing framework
    └── analysis/         # Statistical analysis
```

### Adding New Features

1. **New API Route:**
```typescript
// src/app/api/my-endpoint/route.ts
export async function GET(request: Request) {
  // Your logic here
  return NextResponse.json({ data })
}
```

2. **New UI Component:**
```typescript
// src/components/ui/my-component.tsx
export function MyComponent({ prop }: Props) {
  return <div className="...">Content</div>
}
```

## Configuration

Edit evaluation parameters in `src/lib/config.ts`:

```typescript
export function getConfig() {
  return {
    outputDir: './data/evaluations',
    targetEvaluationsPerComparison: 5,
    scenarios: ['beach', 'desert', 'forest', ...],
    // ... more settings
  }
}
```

## Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start

# Or use Docker
docker build -t eval ./frontend
docker run -p 3000:3000 eval
```

## API Reference

All API endpoints are implemented as Next.js API routes:

### GET `/api/comparisons`
Returns list of available comparisons with evaluation counts.

### POST `/api/submit-evaluation`
Submit evaluation results.

**Body:**
```json
{
  "comparison_id": "uuid",
  "dimension_scores": {
    "overall_quality": "A",
    "controllability": "B"
  },
  "completion_time_seconds": 120
}
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Make changes and test
4. Submit a pull request

## Tech Stack

- **Next.js 14** - Full-stack React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible components
- **Recharts** - Data visualization
- **UUID** - Unique identifiers

## License

MIT
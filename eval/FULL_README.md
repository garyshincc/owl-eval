# OWL Human Evaluation Framework - Complete Technical Documentation

A comprehensive, production-ready framework for conducting rigorous human evaluations of diffusion world models through A/B testing, comparative analysis, and large-scale crowd-sourced studies. Built with modern web technologies for scalability, reliability, and ease of use.

## System Architecture

The OWL framework is designed as a modern, full-stack application with clear separation of concerns and modular architecture:

```
eval/
├── frontend/                    # Next.js 14 full-stack application
│   ├── src/app/                # App Router with integrated API
│   ├── src/components/         # Reusable UI components
│   ├── src/lib/               # Core business logic
│   ├── prisma/                # Database schema and migrations
│   └── public/                # Static assets and video library
├── models/                     # Model interfaces and loaders
├── evaluation/                 # Evaluation framework and criteria
├── analysis/                   # Statistical analysis and reporting
├── prolific/                   # Prolific platform integration
├── scripts/                    # CLI utilities and automation
└── configs/                    # Configuration management
```

### Technology Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Next.js API Routes (serverless-ready)
- **Database**: Prisma ORM with PostgreSQL (production) / SQLite (development)
- **Authentication**: Built-in session management
- **File Storage**: Local filesystem with cloud storage support
- **Analytics**: Real-time statistics with chart visualizations
- **Deployment**: Docker, Vercel, or any Node.js hosting platform

## Complete Setup Guide

### Prerequisites

- **Node.js 18+** (required for frontend and CLI tools)
- **Python 3.8+** (required for data generation and analysis)
- **PostgreSQL** (recommended for production) or SQLite (for development)
- **Git** (for version control)
- **Docker** (optional, for containerized deployment)

### Development Environment Setup

#### 1. Repository Setup
```bash
git clone <your-repository-url>
cd owl-eval/eval
```

#### 2. Frontend Application Setup
```bash
cd frontend
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your specific configuration
```

#### 3. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Set up database (development)
npx prisma db push

# Or run migrations (production)
npx prisma migrate deploy
```

#### 4. Python Environment Setup
```bash
cd ..  # Back to eval/
pip install -r requirements.txt

# Or using virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### 5. Start Development Server
```bash
cd frontend
npm run dev
```

Access at:
- **Main Application**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin
- **API Documentation**: http://localhost:3000/api/health

### Production Deployment

#### Option 1: Docker Deployment (Recommended)
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Option 2: Manual Deployment
```bash
# Build frontend
cd frontend
npm run build

# Start production server
npm start

# Or use PM2 for process management
npm install -g pm2
pm2 start npm --name "owl-eval" -- start
```

#### Option 3: Cloud Deployment (Vercel)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel --prod
```

## System Components

### 1. Next.js Frontend

Modern React-based web interface featuring:

- **Home Page**: Lists available evaluations with progress tracking
- **Evaluation Interface**: Side-by-side video comparison with synchronized playback
- **Admin Dashboard**: Real-time statistics and visualizations
- **Prolific Integration**: Special flow for crowd-sourced evaluations

Key features:
- Responsive design with Tailwind CSS
- Real-time updates using React hooks
- Chart visualizations with Recharts
- Toast notifications for user feedback

### 2. Backend API (Flask)

REST API server providing:

```
GET  /api/comparisons          # List all comparisons
GET  /api/comparisons/:id      # Get specific comparison
POST /api/submit_evaluation    # Submit evaluation results
GET  /api/evaluation_stats     # Get statistics
GET  /api/model_performance    # Get performance metrics
```

### 3. Model System

Modular architecture for different world models:

```python
# Base interface
class BaseWorldModel(ABC):
    def generate_video(reference_image, actions, num_frames)
    def preprocess_image(image)
    def preprocess_actions(actions)
```

Supports:
- Matrix-Game model from HuggingFace
- Mock models for testing
- Easy extension for new models

### 4. Evaluation Framework

#### Dimensions (from paper)
1. **Overall Quality**: General realism and believability
2. **Controllability**: Accuracy in following inputs
3. **Visual Quality**: Frame clarity and aesthetics
4. **Temporal Consistency**: Motion smoothness

#### Test Scenarios
Pre-defined scenarios across 8 Minecraft biomes:
- Basic movement tests
- Complex navigation
- Camera control
- Environment interactions

### 5. Analysis Pipeline

Comprehensive analysis tools:

```bash
# Run analysis on collected data
python scripts/analyze_results.py --data-dir ./data --statistical-tests
```

Generates:
- Model performance metrics
- Inter-rater reliability (Fleiss' kappa)
- Statistical significance tests
- Visualization plots

### 6. Prolific Integration

For crowd-sourced evaluations:

```bash
# Create Prolific study
python scripts/prolific_cli.py create-study \
  --name "Matrix-Game Study" \
  --participants 100 \
  --comparisons-per-participant 5

# Sync results
python scripts/prolific_cli.py sync-results --study-id <ID>
```

## Usage Workflows

### 1. Local Testing

```bash
# Generate test comparisons
python -m scripts.cli test-local --scenarios 10

# Start servers
python backend_api.py &
cd frontend && npm run dev

# Access at http://localhost:3000
```

### 2. Running Evaluations

1. Create comparisons using CLI
2. Participants access web interface
3. Watch synchronized videos
4. Rate across 4 dimensions
5. Results saved automatically

### 3. Analyzing Results

```bash
# Generate comprehensive report
python scripts/analyze_results.py \
  --data-dir ./data/evaluations \
  --output-dir ./analysis_results

# View results in analysis_results/
# - summary_report.md
# - model_performance.csv
# - visualizations (PNG files)
```

## Configuration

Edit `configs/evaluation_config.yaml`:

```yaml
models:
  matrix_game:
    name: "Skywork/Matrix-Game"
    
evaluation_dimensions:
  - overall_quality
  - controllability
  - visual_quality
  - temporal_consistency

scenarios:
  - beach
  - desert
  - forest
  # ... etc

human_evaluation:
  evaluators_per_comparison: 5
  video_length_frames: 65
  fps: 16
```

## API Integration

### Frontend → Backend

```typescript
// Example: Submit evaluation
const response = await axios.post('/api/submit_evaluation', {
  comparison_id: 'uuid',
  dimension_scores: {
    overall_quality: 'A',
    controllability: 'B',
    // ...
  },
  completion_time_seconds: 120
})
```

### Backend → Models

```python
# Generate comparison
model = ModelLoader.load_model("matrix_game")
video = model.generate_video(
    reference_image=image,
    actions=action_sequence,
    num_frames=65
)
```

## Development

### Adding New Models

1. Create model class in `models/`:
```python
class NewModel(BaseWorldModel):
    def load_model(self, checkpoint_path=None):
        # Implementation
    
    def generate_video(self, reference_image, actions, **kwargs):
        # Implementation
```

2. Register in `ModelLoader.MODEL_REGISTRY`

### Frontend Development

```bash
cd frontend
npm run dev  # Development server
npm run build  # Production build
npm run lint  # Run linter
```

### Backend Development

```bash
# Run tests
pytest

# Format code
black .

# Type checking
mypy .
```

## Deployment

### Production Setup

1. Set environment variables:
```bash
export PROLIFIC_API_TOKEN=your-token
export SECRET_KEY=your-secret-key
export BASE_URL=https://your-domain.com
```

2. Build and deploy:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Monitoring

- Backend logs: `docker logs eval_backend_1`
- Frontend logs: `docker logs eval_frontend_1`
- Database backups: Automated daily in `./backups/`

## Troubleshooting

### Common Issues

1. **Videos not playing**: Ensure video files are accessible and in correct format (MP4/H.264)
2. **API connection errors**: Check CORS settings and API URL configuration
3. **Model loading fails**: Verify GPU availability and model checkpoint paths

### Debug Mode

```bash
# Backend debug mode
DEBUG=True python backend_api.py

# Frontend debug
npm run dev -- --debug
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Make changes and test thoroughly
4. Submit pull request with detailed description

## License

MIT

## Citation

If using this harness in research, please cite:

```bibtex
@software{matrix_game_eval,
  title = {Matrix-Game Human Evaluation Harness},
  author = {OWL Team},
  year = {2024},
  url = {https://github.com/your-org/eval}
}
```
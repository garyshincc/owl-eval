# OWL Evaluation Framework

A comprehensive human evaluation platform for diffusion world models featuring A/B testing, comparative analysis, and large-scale study management through Prolific integration.

## Overview

The OWL evaluation framework provides a complete solution for conducting rigorous human evaluations of AI-generated videos from diffusion world models. Built with modern web technologies, it offers synchronized video comparison, structured evaluation criteria, real-time analytics, and seamless integration with crowd-sourcing platforms.

## Key Features

- **Modern Web Interface**: Next.js-based evaluation platform with synchronized dual video playback
- **Structured Evaluation**: Four-dimension rating system (Overall Quality, Controllability, Visual Quality, Temporal Consistency)
- **Real-time Analytics**: Admin dashboard with progress tracking and performance visualization
- **Prolific Integration**: Automated study creation and management for large-scale evaluations
- **CLI Tools**: Powerful command-line interface for experiment management
- **Statistical Analysis**: Built-in tools for inter-rater reliability and significance testing

## Architecture

```
owl-eval/
├── eval/                           # Main evaluation framework
│   ├── frontend/                   # Next.js web application
│   │   ├── src/app/               # Pages and API routes
│   │   ├── src/components/        # UI components
│   │   └── src/lib/              # Core evaluation logic
│   ├── models/                    # Model interfaces and loaders
│   ├── evaluation/                # Evaluation framework and criteria
│   ├── scripts/                   # CLI tools for experiment management
│   ├── prolific/                  # Prolific platform integration
│   └── analysis/                  # Statistical analysis tools
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.8+
- Optional: GPU for running actual models

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd owl-eval/eval
   npm install
   pip install -r requirements.txt
   ```

2. **Set up environment:**
   ```bash
   cd frontend
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Start the development server:**
   ```bash
   cd frontend
   npm run dev
   ```

4. **Access the application:**
   Open http://localhost:3000 in your browser

### Docker Deployment

```bash
cd eval
docker-compose up
```

## Usage Workflows

### Creating Experiments

```bash
# Interactive experiment creation
cd eval
npm run experiment-cli create

# With parameters
npm run experiment-cli create --name "My Study" --slug "my-study"
```

### Running Evaluations

1. Navigate to the web interface at http://localhost:3000
2. Select an available experiment
3. Complete video comparisons with structured ratings
4. View results in the admin dashboard

### Prolific Integration

```bash
# Launch experiment with Prolific study
npm run experiment-cli launch my-experiment --prolific \
  --prolific-title "Evaluate AI Videos" \
  --prolific-reward 8.00 \
  --prolific-participants 100
```

### Analysis

```bash
# Generate comprehensive analysis
python scripts/analyze_results.py --data-dir ./data --statistical-tests
```

## Documentation

- **Frontend Documentation**: `eval/README.md` - Detailed Next.js application guide
- **Complete Documentation**: `eval/FULL_README.md` - Comprehensive technical documentation
- **Frontend Specific**: `eval/frontend/README.md` - Frontend-specific setup and development

## Development

The framework uses modern development practices:

- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, and Radix UI
- **Backend**: Integrated API routes (no separate backend needed)
- **Database**: Prisma with PostgreSQL for production deployments
- **Testing**: Comprehensive test suites for reliability

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Citation

If you use this framework in your research, please cite:

```bibtex
@software{owl_eval_framework,
  title = {OWL Human Evaluation Framework for Diffusion World Models},
  author = {OWL Team},
  year = {2024},
  url = {https://github.com/your-org/owl-eval}
}
```

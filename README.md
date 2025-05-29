# owl-eval
Human evaluation harness for diffusion world models

This repository contains the evaluation framework used to conduct human evaluations of diffusion-based world models through A/B testing and comparative analysis.

## Structure

- `eval/` - Main evaluation framework
  - `frontend/` - Next.js web interface for human evaluations
  - `scripts/` - CLI tools for experiment management
  - `prolific/` - Integration with Prolific for participant recruitment
  - `models/` - Model interfaces and loaders
  - `analysis/` - Statistical analysis tools

## Quick Start

1. Install dependencies:
   ```bash
   cd eval
   npm install
   pip install -r requirements.txt
   ```

2. Set up environment variables (see `eval/.env.example`)

3. Create an experiment:
   ```bash
   npm run experiment-cli create
   ```

4. Run evaluations locally:
   ```bash
   cd frontend
   npm run dev
   ```

See `eval/README.md` for detailed documentation.

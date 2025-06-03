# OWL Evaluation Framework

A comprehensive Next.js platform for conducting rigorous human evaluations of diffusion world models through A/B testing, comparative analysis, and large-scale crowd-sourced studies.

## Overview

Built with Next.js 14, this framework provides synchronized video comparison, structured evaluation criteria, real-time analytics, and seamless Prolific integration for evaluating AI-generated videos.

## Key Features

- **Synchronized Video Comparison**: Frame-perfect dual video playback
- **Multi-dimensional Evaluation**: Four research-validated dimensions (Overall Quality, Controllability, Visual Quality, Temporal Consistency)
- **Real-time Analytics**: Admin dashboard with live progress tracking
- **Prolific Integration**: Automated study creation and participant management
- **Bulk Operations**: Matrix mode experiment creation and video library management
- **CLI Tools**: Comprehensive command-line interface for automation
- **Modern Architecture**: Next.js 14 with TypeScript, Tailwind CSS, and PostgreSQL

## Architecture

```
eval/
├── frontend/                    # Next.js 14 application
│   ├── src/app/                # App Router pages and API routes
│   ├── src/components/         # UI components
│   ├── src/lib/               # Core logic
│   └── prisma/                # Database schema
├── scripts/                     # CLI tools
├── models/                      # Model interfaces
└── evaluation/                  # Test scenarios and criteria
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Stack Auth account (for admin access)

### Installation

```bash
# Clone and install
cd eval/frontend
npm install

# Set up environment
cp .env.local.example .env.local
# Edit .env.local with your database and Stack Auth credentials

# Set up database
npx prisma generate
npx prisma db push

# Start development
npm run dev
```

**Access:** http://localhost:3000

### Production Deployment

```bash
# Docker
cd eval && docker-compose up

# Or manual
npm run build && npm start
```

## Usage

### CLI Commands

```bash
# Navigate to eval directory first
cd eval

# Create experiments
npm run experiment-cli create --name "My Study"
npm run experiment-cli create-bulk --models "genie-2b,diamond,sora" --scenarios "forest,desert,ocean"

# Manage video library
npm run experiment-cli list-videos --model "genie-2b"
npm run experiment-cli bulk-edit-videos --pattern "forest_*.mp4" --set-model "genie-2b"
npm run experiment-cli assign-videos --experiment my-study --strategy auto

# Launch experiments
npm run experiment-cli launch my-experiment --prolific --prolific-reward 8.00

# View stats
npm run experiment-cli list
npm run experiment-cli stats my-experiment
```

### Web Interface

- **Main Interface**: http://localhost:3000 (participant evaluations)
- **Admin Dashboard**: http://localhost:3000/admin (requires Stack Auth login)
- **Evaluation Flow**: Synchronized video playback with four-dimension ratings
- **Prolific Integration**: Automatic participant tracking and completion codes

## Key Features Details

### Matrix Mode Experiments
Automatically generates all possible model pair comparisons across scenarios:
- `genie-2b vs diamond` across `forest, desert, ocean` = 3 experiments
- Full matrix with 4 models × 3 scenarios = 18 pairwise experiments

### Video Library Management
- **Metadata Support**: Model names, scenario IDs, tags, groups
- **Bulk Operations**: Pattern-based selection and editing
- **Smart Assignment**: Auto-matches videos by metadata or filename patterns

### Prolific Integration
- **Automated Study Creation**: CLI creates and links Prolific studies
- **Participant Tracking**: Unique completion codes and session validation
- **Payment Management**: Configurable rewards and participant counts

### Authentication
- **Stack Auth**: Secure admin dashboard access
- **CLI Integration**: Browser-based authentication with 7-day token caching
- **Role-based Access**: Admin-only experiment management

## Tech Stack

- **Next.js 14**: Full-stack React framework with App Router
- **TypeScript**: Complete type safety
- **Tailwind CSS + Radix UI**: Modern, accessible components
- **Prisma + PostgreSQL**: Type-safe database operations
- **Stack Auth**: Authentication and user management

## License
MIT
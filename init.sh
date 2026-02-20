#!/bin/bash
set -e

echo "======================================="
echo "  Tote Sonar - Development Setup"
echo "======================================="
echo ""

# Check Node.js version
if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js is not installed. Please install Node.js 20+."
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "ERROR: Node.js 18+ is required. Current version: $(node -v)"
  exit 1
fi

echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"
echo ""

# Navigate to project directory
cd "$(dirname "$0")"

# Create data directories if they don't exist
mkdir -p data/uploads data/thumbnails
echo "Data directories ready."

# Install dependencies
echo "Installing dependencies..."
npm install
echo "Dependencies installed."
echo ""

# Build the application (if not already built or in dev mode)
# For development, we use `next dev` which doesn't require a build step

# Start the development server
echo "======================================="
echo "  Starting Tote Sonar dev server..."
echo "  URL: http://localhost:3000"
echo "  Health: http://localhost:3000/api/health"
echo "======================================="
echo ""

PORT=3000 npx next dev --port 3000

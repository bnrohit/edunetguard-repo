#!/bin/bash
set -e

echo "🏫 EduNetGuard Setup"
echo "====================="

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install it first."
    exit 1
fi

echo "✅ Docker found"

# Create necessary directories
echo "Creating directories..."
mkdir -p data
mkdir -p logs

# Check if config exists
if [ ! -f config/school.json ]; then
    echo "⚠️  config/school.json not found. Creating from template..."
    cp config/school.json.example config/school.json 2>/dev/null || echo "Please create config/school.json manually"
fi

# Pull images
echo "Pulling Docker images..."
docker compose pull

# Build custom images
echo "Building custom images..."
docker compose build

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit config/school.json with your school's details"
echo "  2. Run: docker compose up -d"
echo "  3. Visit http://localhost:3001 to set up Uptime Kuma"
echo "  4. Visit http://localhost:3000 to view your status page"
echo ""

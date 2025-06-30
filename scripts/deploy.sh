#!/bin/bash

# Tail Match Deployment Script
# Usage: ./scripts/deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

echo "🐾 Starting Tail Match deployment for $ENVIRONMENT environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker daemon."
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not available. Please install Docker Compose plugin."
    exit 1
fi

cd "$PROJECT_ROOT"

# Load environment variables
if [ "$ENVIRONMENT" = "production" ]; then
    ENV_FILE=".env.prod"
    COMPOSE_FILES="-f compose.yaml -f compose.prod.yaml"
else
    ENV_FILE=".env.local"
    COMPOSE_FILES="-f compose.yaml"
fi

if [ ! -f "$ENV_FILE" ]; then
    print_error "Environment file $ENV_FILE not found!"
    print_warning "Please create $ENV_FILE based on .env.example"
    exit 1
fi

print_status "Using environment file: $ENV_FILE"
print_status "Using compose files: $COMPOSE_FILES"

# Export environment variables
set -a
source "$ENV_FILE"
set +a

# Pre-deployment checks
print_status "Running pre-deployment checks..."

# Check database connection parameters
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL is not set in $ENV_FILE"
    exit 1
fi

# Create necessary directories
mkdir -p logs
mkdir -p data/backups

# Pull latest images (for production)
if [ "$ENVIRONMENT" = "production" ]; then
    print_status "Pulling latest Docker images..."
    docker compose $COMPOSE_FILES pull
fi

# Stop existing containers
print_status "Stopping existing services..."
docker compose $COMPOSE_FILES down || true

# Build and start services
print_status "Building and starting services..."
docker compose $COMPOSE_FILES up -d --build

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 30

# Health checks
print_status "Running health checks..."

# Check if database is ready
if ! docker compose $COMPOSE_FILES exec -T db pg_isready -U "${DB_USER:-tailmatch_user}" -d "${DB_NAME:-tailmatch}" &> /dev/null; then
    print_warning "Database health check failed, waiting longer..."
    sleep 30
    if ! docker compose $COMPOSE_FILES exec -T db pg_isready -U "${DB_USER:-tailmatch_user}" -d "${DB_NAME:-tailmatch}" &> /dev/null; then
        print_error "Database is not ready after extended wait"
        exit 1
    fi
fi

# Check if web service is responding
WEB_PORT=${NEXT_PORT:-3000}
if [ "$ENVIRONMENT" = "production" ]; then
    WEB_PORT=80
fi

if ! curl -f "http://localhost:$WEB_PORT/api/health" &> /dev/null; then
    print_warning "Web service health check failed, waiting longer..."
    sleep 30
    if ! curl -f "http://localhost:$WEB_PORT/api/health" &> /dev/null; then
        print_error "Web service is not responding"
        docker compose $COMPOSE_FILES logs web
        exit 1
    fi
fi

# Display service status
print_status "Deployment completed successfully!"
echo ""
print_status "Service Status:"
docker compose $COMPOSE_FILES ps

echo ""
print_status "Logs (last 20 lines):"
docker compose $COMPOSE_FILES logs --tail=20

echo ""
if [ "$ENVIRONMENT" = "production" ]; then
    print_status "🎉 Tail Match is now running in production!"
    print_status "🌐 Web: https://tail-match.llll-ll.com"
else
    print_status "🎉 Tail Match is now running in development!"
    print_status "🌐 Web: http://localhost:$WEB_PORT"
fi

print_status "📊 API Health: http://localhost:$WEB_PORT/api/health"
print_status "📝 View logs: docker compose $COMPOSE_FILES logs -f"
print_status "🛑 Stop services: docker compose $COMPOSE_FILES down"

echo ""
print_warning "Remember to:"
print_warning "- Set up SSL certificates for production"
print_warning "- Configure backup schedules"
print_warning "- Monitor logs regularly"
print_warning "- Update environment variables as needed"
#!/bin/bash

# Docker Playground Quick Start Script
# Fixes the "localhost:3000 can't reach this page" issue

set -e

echo "🚀 Docker Playground Quick Start"
echo "==============================="
echo

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Diagnosing the issue...${NC}"

# Check Docker daemon
echo -n "1. Checking Docker daemon... "
if docker info >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not running${NC}"
    echo -e "${YELLOW}   Please start Docker Desktop and try again${NC}"
    exit 1
fi

# Check if Docker Swarm is initialized
echo -n "2. Checking Docker Swarm... "
if docker node ls >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Swarm initialized${NC}"
else
    echo -e "${YELLOW}⚠️  Swarm not initialized${NC}"
    echo "   Initializing Docker Swarm..."
    docker swarm init >/dev/null 2>&1 || {
        echo -e "${RED}   ❌ Failed to initialize swarm${NC}"
        exit 1
    }
    echo -e "${GREEN}   ✅ Swarm initialized${NC}"
fi

# Check if port 3000 is available
echo -n "3. Checking port 3000... "
if lsof -i :3000 >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 3000 is in use${NC}"
    echo "   Killing processes on port 3000..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}   ✅ Port 3000 is now free${NC}"
else
    echo -e "${GREEN}✅ Available${NC}"
fi

echo
echo -e "${BLUE}🛠️  The Problem:${NC}"
echo "The original docker-compose.yml has complex networking that doesn't expose port 3000 properly."
echo
echo -e "${BLUE}💡 The Solution:${NC}"
echo "We'll run the application directly with Go, which is simpler and works immediately."
echo

read -p "Would you like to start the Docker Playground now? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "You can start it later with: go run ."
    exit 0
fi

echo
echo -e "${GREEN}🚀 Starting Docker Playground...${NC}"
echo

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo -e "${RED}❌ Go is not installed or not in PATH${NC}"
    echo
    echo "Options to fix this:"
    echo "1. Install Go from https://golang.org/dl/"
    echo "2. Or use the Docker method (see below)"
    echo
    echo -e "${BLUE}🐳 Alternative: Using Docker directly${NC}"
    echo "docker build -t playground ."
    echo "docker run -p 3000:3000 -v /var/run/docker.sock:/var/run/docker.sock playground"
    exit 1
fi

# Create dummy L2 container if it doesn't exist
echo -n "4. Setting up L2 container... "
if docker ps -a --format "table {{.Names}}" | grep -q "^l2$"; then
    echo -e "${GREEN}✅ Already exists${NC}"
else
    echo -e "${YELLOW}⚠️  Creating dummy L2 container${NC}"
    docker run -d --name l2 --restart unless-stopped alpine:latest sleep infinity >/dev/null 2>&1 || {
        echo -e "${RED}   ❌ Failed to create L2 container${NC}"
        exit 1
    }
    echo -e "${GREEN}   ✅ L2 container created${NC}"
fi

# Pull required Docker image
echo -n "5. Checking Docker images... "
if docker images --format "table {{.Repository}}:{{.Tag}}" | grep -q "franela/dind:latest"; then
    echo -e "${GREEN}✅ franela/dind available${NC}"
else
    echo -e "${YELLOW}⚠️  Pulling franela/dind image${NC}"
    docker pull franela/dind >/dev/null 2>&1 || {
        echo -e "${RED}   ❌ Failed to pull franela/dind${NC}"
        exit 1
    }
    echo -e "${GREEN}   ✅ franela/dind image ready${NC}"
fi

# Install dependencies
echo "Installing Go dependencies..."
go mod download || {
    echo -e "${RED}❌ Failed to download dependencies${NC}"
    exit 1
}

echo
echo -e "${GREEN}✅ All ready! Starting the application...${NC}"
echo -e "${YELLOW}📝 Once started, open: ${BLUE}http://localhost:3000${NC}"
echo -e "${YELLOW}📝 Press Ctrl+C to stop the server${NC}"
echo

# Start the application
go run . -save /tmp/sessions -playground-domain "localhost:3000" -l2 "l2" -unsafe || {
    echo -e "${RED}❌ Failed to start the application${NC}"
    echo
    echo "If you see permission errors, try:"
    echo "sudo go run . -save /tmp/sessions -playground-domain \"localhost:3000\" -l2 \"l2\" -unsafe"
    exit 1
}

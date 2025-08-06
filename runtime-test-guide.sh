#!/bin/bash

# Runtime Testing Guide for Docker Playground Transformation
# This script provides step-by-step instructions and automated checks

set -e

echo "🚀 Docker Playground Runtime Testing Guide"
echo "=========================================="
echo
echo "This guide will help you test your transformed Docker playground"
echo "to ensure the single-instance functionality works correctly."
echo

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Pre-Runtime Checklist${NC}"
echo "========================="

# Check Docker daemon
echo -n "1. Checking Docker daemon... "
if docker info >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not running${NC}"
    echo -e "${YELLOW}   Please start Docker Desktop and try again${NC}"
    exit 1
fi

# Check if ports are available
echo -n "2. Checking port 3000 availability... "
if lsof -i :3000 >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 3000 is in use${NC}"
    echo -e "${YELLOW}   You may need to stop other services or use a different port${NC}"
else
    echo -e "${GREEN}✅ Available${NC}"
fi

# Check Go installation
echo -n "3. Checking Go installation... "
if go version >/dev/null 2>&1; then
    echo -e "${GREEN}✅ $(go version)${NC}"
else
    echo -e "${RED}❌ Go not found${NC}"
    echo -e "${YELLOW}   Please install Go and try again${NC}"
    exit 1
fi

echo
echo -e "${PURPLE}🧪 Manual Testing Scenarios${NC}"
echo "==========================="
echo
echo "After starting the application with 'go run .', test these scenarios:"
echo

echo -e "${BLUE}Scenario 1: Basic Single Instance Creation${NC}"
echo "----------------------------------------"
echo "1. Open browser to http://localhost:3000"
echo "2. Create a new session"
echo "3. ✅ EXPECTED: Single instance should be automatically created"
echo "4. ✅ EXPECTED: Terminal should be immediately available"
echo "5. ✅ EXPECTED: No 'Add Instance' button should be visible"
echo

echo -e "${BLUE}Scenario 2: Terminal Functionality${NC}"
echo "-------------------------------"
echo "1. In the terminal, type: docker --version"
echo "2. ✅ EXPECTED: Should show Docker version inside container"
echo "3. Type: docker run hello-world"
echo "4. ✅ EXPECTED: Should run and show hello-world output"
echo "5. Type: docker ps"
echo "6. ✅ EXPECTED: Should show running containers"
echo

echo -e "${BLUE}Scenario 3: File Editor Test${NC}"
echo "--------------------------"
echo "1. Click the 'Editor' button"
echo "2. ✅ EXPECTED: File explorer should open"
echo "3. Create a test file: test.txt"
echo "4. ✅ EXPECTED: File should be created and editable"
echo "5. Save the file"
echo "6. In terminal, type: ls -la"
echo "7. ✅ EXPECTED: test.txt should be visible"
echo

echo -e "${BLUE}Scenario 4: Port Exposure Test${NC}"
echo "------------------------------"
echo "1. In terminal, run: docker run -d -p 80:80 nginx"
echo "2. Click 'Open Port' button"
echo "3. Enter port: 80"
echo "4. ✅ EXPECTED: Port should appear as clickable link"
echo "5. Click the port link"
echo "6. ✅ EXPECTED: Should open nginx welcome page in new tab"
echo

echo -e "${BLUE}Scenario 5: Session Persistence${NC}"
echo "------------------------------"
echo "1. Create some files and containers"
echo "2. Note the session URL"
echo "3. Close browser tab"
echo "4. Open session URL in new tab"
echo "5. ✅ EXPECTED: Should reconnect to same instance"
echo "6. ✅ EXPECTED: Files and containers should still exist"
echo

echo -e "${BLUE}Scenario 6: Multiple Instance Prevention${NC}"
echo "----------------------------------------"
echo "1. Try to make API call to create another instance:"
echo "   curl -X POST http://localhost:3000/sessions/\$SESSION_ID/instances"
echo "2. ✅ EXPECTED: Should return 409 Conflict status"
echo "3. ✅ EXPECTED: Error message should mention one instance policy"
echo

echo -e "${BLUE}Scenario 7: Session Expiration${NC}"
echo "-----------------------------"
echo "1. Note the session timer in the UI"
echo "2. ✅ EXPECTED: Timer should count down from the configured limit"
echo "3. ✅ EXPECTED: Warning should appear when session nears expiration"
echo "4. Click 'Close Session' button"
echo "5. ✅ EXPECTED: Session should end and resources cleaned up"
echo

echo -e "${PURPLE}🔧 Automated Test Runner${NC}"
echo "======================="
echo
read -p "Would you like to run the application now for testing? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Starting Docker Playground...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop the server when testing is complete${NC}"
    echo
    
    # Build and run
    if go build -o playground .; then
        echo -e "${GREEN}✅ Build successful${NC}"
        echo -e "${BLUE}🌐 Server starting on http://localhost:3000${NC}"
        echo
        ./playground
    else
        echo -e "${RED}❌ Build failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Manual start: Run 'go run .' when ready to test${NC}"
fi

echo
echo -e "${GREEN}📝 Testing Complete!${NC}"
echo "==================="
echo "If all scenarios passed, your transformation is working correctly!"
echo
echo "Key verification points:"
echo "✅ Single instance auto-created per session"
echo "✅ No 'Add Instance' button in UI"
echo "✅ Terminal works with Docker commands"
echo "✅ File editor integration works"
echo "✅ Port exposure works"
echo "✅ Session persistence works"
echo "✅ Multiple instance creation is blocked"
echo "✅ Session expiration works properly"

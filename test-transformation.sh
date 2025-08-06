#!/bin/bash

# Docker Playground Transformation Test Suite
# Tests the single-instance per session functionality

set -e

echo "🧪 Docker Playground Transformation Test Suite"
echo "=============================================="
echo

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test results
print_test_result() {
    local test_name="$1"
    local result="$2"
    local details="$3"
    
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $test_name"
        [ -n "$details" ] && echo -e "   ${BLUE}ℹ️  $details${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $test_name"
        [ -n "$details" ] && echo -e "   ${RED}💥 $details${NC}"
        ((TESTS_FAILED++))
    fi
    echo
}

# Function to check if file exists and has expected content
check_file_content() {
    local file="$1"
    local expected_pattern="$2"
    local description="$3"
    
    if [ ! -f "$file" ]; then
        print_test_result "File existence: $description" "FAIL" "File $file not found"
        return 1
    fi
    
    if grep -q "$expected_pattern" "$file"; then
        print_test_result "Content check: $description" "PASS" "Found expected pattern in $file"
        return 0
    else
        print_test_result "Content check: $description" "FAIL" "Pattern '$expected_pattern' not found in $file"
        return 1
    fi
}

echo "📋 Phase 1: File Structure Verification"
echo "======================================="

# Check if key modified files exist
files_to_check=(
    "pwd/session.go"
    "handlers/new_instance.go" 
    "pwd/instance.go"
    "handlers/www/default/index.html"
    "handlers/www/assets/app-simplified.js"
    "handlers/session_terminal.go"
    "handlers/bootstrap.go"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        print_test_result "File exists: $file" "PASS"
    else
        print_test_result "File exists: $file" "FAIL" "Required file missing"
    fi
done

echo "📋 Phase 2: Backend Code Changes Verification"
echo "============================================="

# Test 1: Check if session.go has auto-instance creation
check_file_content "pwd/session.go" "InstanceNew" "Auto-instance creation in SessionNew"

# Test 2: Check if new_instance.go prevents multiple instances
check_file_content "handlers/new_instance.go" "StatusConflict" "Multiple instance prevention (409 status)"

# Test 3: Check if instance.go has InstanceGetSingle method
check_file_content "pwd/instance.go" "InstanceGetSingle" "InstanceGetSingle method added"

# Test 4: Check if session_terminal.go has simplified routes
check_file_content "handlers/session_terminal.go" "SessionTerminalWS" "Simplified terminal WebSocket handler"

echo "📋 Phase 3: Frontend Changes Verification"
echo "========================================="

# Test 5: Check if simplified UI removes Add Instance button
if [ -f "handlers/www/default/index.html" ]; then
    if ! grep -q "newInstance()" "handlers/www/default/index.html"; then
        print_test_result "Remove Add Instance UI" "PASS" "newInstance() button removed from UI"
    else
        print_test_result "Remove Add Instance UI" "FAIL" "Add Instance button still present"
    fi
fi

# Test 6: Check if simplified JavaScript exists
check_file_content "handlers/www/assets/app-simplified.js" "attachTerminal" "Simplified JavaScript auto-connection"

# Test 7: Check if full-screen terminal CSS is present
check_file_content "handlers/www/default/index.html" "height.*100%" "Full-screen terminal layout"

echo "📋 Phase 4: Backup Files Verification"
echo "====================================="

# Check if original files were backed up
backup_files=(
    "handlers/www/default/index-original.html"
    "handlers/www/assets/app-original.js"
    "pwd/session-original.go"
    "handlers/new_instance-original.go"
)

for file in "${backup_files[@]}"; do
    if [ -f "$file" ]; then
        print_test_result "Backup exists: $file" "PASS"
    else
        print_test_result "Backup exists: $file" "FAIL" "Backup file missing"
    fi
done

echo "📋 Phase 5: Code Syntax Verification"
echo "===================================="

# Check Go syntax
echo "Checking Go syntax..."
if go fmt -l . | grep -q .; then
    print_test_result "Go code formatting" "FAIL" "Some Go files need formatting"
else
    print_test_result "Go code formatting" "PASS" "All Go files properly formatted"
fi

# Try to build the project
echo "Attempting to build the project..."
if go build -o /tmp/playground-test ./; then
    print_test_result "Go build" "PASS" "Project builds successfully"
    rm -f /tmp/playground-test
else
    print_test_result "Go build" "FAIL" "Build errors detected"
fi

echo "📋 Phase 6: Configuration Files Check"
echo "====================================="

# Check if Docker files exist
config_files=(
    "docker-compose.yml"
    "Dockerfile"
    "go.mod"
    "go.sum"
)

for file in "${config_files[@]}"; do
    if [ -f "$file" ]; then
        print_test_result "Config file: $file" "PASS"
    else
        print_test_result "Config file: $file" "FAIL" "Configuration file missing"
    fi
done

echo "📋 Phase 7: Dependencies Check"
echo "=============================="

# Check if all Go dependencies are available
if go mod tidy && go mod download; then
    print_test_result "Go dependencies" "PASS" "All dependencies resolved"
else
    print_test_result "Go dependencies" "FAIL" "Dependency issues detected"
fi

# Check if required Docker images would be available
docker_images=("franela/dind")
for image in "${docker_images[@]}"; do
    echo "Checking if Docker image $image exists in registry..."
    if docker manifest inspect "$image" >/dev/null 2>&1; then
        print_test_result "Docker image: $image" "PASS" "Image available in registry"
    else
        print_test_result "Docker image: $image" "FAIL" "Image not accessible (may need Docker daemon)"
    fi
done

echo "📊 Test Summary"
echo "==============="
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Total tests: $((TESTS_PASSED + TESTS_FAILED))"
echo

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Your transformation is ready for runtime testing.${NC}"
    echo
    echo "📝 Next Steps for Runtime Testing:"
    echo "1. Start the application: go run ."
    echo "2. Open browser to: http://localhost:3000" 
    echo "3. Create a new session"
    echo "4. Verify single instance is auto-created"
    echo "5. Check terminal connectivity"
    echo "6. Test Docker commands in terminal"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please review the issues above before runtime testing.${NC}"
    exit 1
fi

#!/bin/bash

# Load Testing Runner for Charity Management System
# This script runs k6 load tests and provides real performance measurements

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
RESULTS_DIR="./results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create results directory
mkdir -p "$RESULTS_DIR"

# Check if k6 is installed
check_k6() {
    if ! command -v k6 &> /dev/null; then
        echo -e "${RED}Error: k6 is not installed.${NC}"
        echo "Install k6 with:"
        echo "  curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xvz --strip-components 1 -C /usr/local/bin"
        exit 1
    fi
}

# Check if application is running
check_application() {
    echo -e "${YELLOW}Checking if application is running...${NC}"
    if ! curl -s "$API_BASE_URL/health" > /dev/null 2>&1; then
        echo -e "${RED}Error: Application is not running at $API_BASE_URL${NC}"
        echo "Start the application first:"
        echo "  cd backend && make dev-start"
        exit 1
    fi
    echo -e "${GREEN}✓ Application is running${NC}"
}

# Run specific test
run_test() {
    local test_name="$1"
    local test_file="tests/${test_name}-test.js"
    local result_file="$RESULTS_DIR/${test_name}_${TIMESTAMP}.json"
    
    if [ ! -f "$test_file" ]; then
        echo -e "${RED}Error: Test file $test_file not found${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Running $test_name test...${NC}"
    echo "Test file: $test_file"
    echo "Results: $result_file"
    echo "API Base: $API_BASE_URL"
    echo
    
    k6 run \
        --out json="$result_file" \
        --env API_BASE_URL="$API_BASE_URL" \
        "$test_file"
    
    echo -e "${GREEN}✓ $test_name test completed${NC}"
    echo "Results saved to: $result_file"
    echo
}

# Main function
main() {
    local test_type="${1:-baseline}"
    
    echo "==================================="
    echo "  Charity Management System"
    echo "  Load Testing Runner"
    echo "==================================="
    echo
    
    check_k6
    check_application
    
    case "$test_type" in
        "baseline")
            run_test "baseline"
            ;;
        "stress")
            run_test "stress"
            ;;
        "spike")
            run_test "spike"
            ;;
        "all")
            run_test "baseline"
            run_test "stress"
            run_test "spike"
            ;;
        *)
            echo -e "${RED}Error: Unknown test type '$test_type'${NC}"
            echo "Available test types: baseline, stress, spike, all"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}Load testing completed!${NC}"
    echo "Check results in: $RESULTS_DIR"
}

# Run main function with all arguments
main "$@"
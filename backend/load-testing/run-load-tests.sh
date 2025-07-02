#!/bin/bash

# Load Testing Script for Lewisham Charity Backend
# Requires k6 to be installed: https://k6.io/docs/getting-started/installation/

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_URL="${BACKEND_URL:-http://localhost:8080}"
RESULTS_DIR="${SCRIPT_DIR}/results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TEST_RUN_ID="loadtest_${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v k6 &> /dev/null; then
        log_error "k6 is not installed. Please install it from https://k6.io/docs/getting-started/installation/"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        log_error "curl is not installed"
        exit 1
    fi
    
    log_success "All dependencies are available"
}

check_api_health() {
    log_info "Checking API health at ${BACKEND_URL}..."
    
    if curl -sf "${BACKEND_URL}/health" > /dev/null; then
        log_success "API is healthy and ready for testing"
    else
        log_error "API health check failed. Is the server running at ${BACKEND_URL}?"
        exit 1
    fi
}

setup_results_directory() {
    mkdir -p "${RESULTS_DIR}/${TEST_RUN_ID}"
    log_info "Results will be saved to: ${RESULTS_DIR}/${TEST_RUN_ID}"
}

run_baseline_test() {
    log_info "Running baseline load test..."
    
    k6 run \
        --out json="${RESULTS_DIR}/${TEST_RUN_ID}/baseline.json" \
        --out csv="${RESULTS_DIR}/${TEST_RUN_ID}/baseline.csv" \
        --tag testid=baseline \
        --env BASE_URL="${BACKEND_URL}" \
        "${SCRIPT_DIR}/k6-load-test.js"
    
    local exit_code=$?
    if [ $exit_code -eq 0 ]; then
        log_success "Baseline test completed successfully"
    else
        log_warning "Baseline test completed with warnings (exit code: ${exit_code})"
    fi
    
    return $exit_code
}

run_stress_test() {
    log_info "Running stress test..."
    
    k6 run \
        --out json="${RESULTS_DIR}/${TEST_RUN_ID}/stress.json" \
        --out csv="${RESULTS_DIR}/${TEST_RUN_ID}/stress.csv" \
        --tag testid=stress \
        --env BASE_URL="${BACKEND_URL}" \
        "${SCRIPT_DIR}/k6-stress-test.js"
    
    local exit_code=$?
    if [ $exit_code -eq 0 ]; then
        log_success "Stress test completed successfully"
    else
        log_warning "Stress test completed with warnings (exit code: ${exit_code})"
    fi
    
    return $exit_code
}

run_spike_test() {
    log_info "Running spike test..."
    
    k6 run \
        --out json="${RESULTS_DIR}/${TEST_RUN_ID}/spike.json" \
        --out csv="${RESULTS_DIR}/${TEST_RUN_ID}/spike.csv" \
        --tag testid=spike \
        --env BASE_URL="${BACKEND_URL}" \
        "${SCRIPT_DIR}/k6-spike-test.js"
    
    local exit_code=$?
    if [ $exit_code -eq 0 ]; then
        log_success "Spike test completed successfully"
    else
        log_warning "Spike test completed with warnings (exit code: ${exit_code})"
    fi
    
    return $exit_code
}

generate_summary_report() {
    log_info "Generating summary report..."
    
    local report_file="${RESULTS_DIR}/${TEST_RUN_ID}/summary_report.md"
    
    cat > "${report_file}" << EOF
# Load Testing Report - ${TEST_RUN_ID}

## Test Configuration
- **Timestamp**: $(date)
- **Target URL**: ${BACKEND_URL}
- **Test Run ID**: ${TEST_RUN_ID}

## Test Results Summary

### Baseline Test
EOF

    if [ -f "${RESULTS_DIR}/${TEST_RUN_ID}/baseline.json" ]; then
        echo "✅ Completed successfully" >> "${report_file}"
        
        # Extract key metrics from JSON (requires jq)
        if command -v jq &> /dev/null; then
            echo "" >> "${report_file}"
            echo "**Key Metrics:**" >> "${report_file}"
            
            local baseline_json="${RESULTS_DIR}/${TEST_RUN_ID}/baseline.json"
            
            # Process JSON results if available
            if [ -s "${baseline_json}" ]; then
                echo "- HTTP requests: $(grep -c '"metric":"http_reqs"' "${baseline_json}" 2>/dev/null || echo 'N/A')" >> "${report_file}"
                echo "- HTTP failures: $(grep -c '"metric":"http_req_failed"' "${baseline_json}" 2>/dev/null || echo 'N/A')" >> "${report_file}"
            fi
        fi
    else
        echo "❌ Failed or not run" >> "${report_file}"
    fi

    cat >> "${report_file}" << EOF

### Stress Test
EOF

    if [ -f "${RESULTS_DIR}/${TEST_RUN_ID}/stress.json" ]; then
        echo "✅ Completed successfully" >> "${report_file}"
    else
        echo "❌ Failed or not run" >> "${report_file}"
    fi

    cat >> "${report_file}" << EOF

### Spike Test
EOF

    if [ -f "${RESULTS_DIR}/${TEST_RUN_ID}/spike.json" ]; then
        echo "✅ Completed successfully" >> "${report_file}"
    else
        echo "❌ Failed or not run" >> "${report_file}"
    fi

    cat >> "${report_file}" << EOF

## Files Generated
- Baseline: \`baseline.json\`, \`baseline.csv\`
- Stress: \`stress.json\`, \`stress.csv\`
- Spike: \`spike.json\`, \`spike.csv\`

## Analysis
Please review the JSON and CSV files for detailed metrics including:
- HTTP request duration percentiles
- Error rates by endpoint
- Connection counts
- Business metric counters

## Recommendations
Based on the test results, consider:
1. Monitoring response times during peak load
2. Reviewing error patterns
3. Optimizing database queries if needed
4. Scaling considerations for production

EOF

    log_success "Summary report generated: ${report_file}"
}

cleanup_old_results() {
    log_info "Cleaning up old test results (keeping last 10 runs)..."
    
    if [ -d "${RESULTS_DIR}" ]; then
        # Keep only the 10 most recent test directories
        ls -dt "${RESULTS_DIR}"/loadtest_* 2>/dev/null | tail -n +11 | xargs rm -rf 2>/dev/null || true
        log_success "Cleanup completed"
    fi
}

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS] [TEST_TYPE]

Load testing script for Lewisham Charity Backend API

TEST_TYPE options:
    baseline    Run baseline load test only
    stress      Run stress test only
    spike       Run spike test only
    all         Run all tests (default)

OPTIONS:
    -u, --url URL       Backend URL (default: http://localhost:8080)
    -h, --help          Show this help message
    -c, --cleanup       Cleanup old results before running
    --skip-health       Skip API health check

Examples:
    $0                                  # Run all tests
    $0 baseline                         # Run baseline test only
    $0 -u http://staging.api.com all    # Run all tests against staging
    $0 --cleanup stress                 # Clean old results and run stress test

EOF
}

# Parse command line arguments
SKIP_HEALTH=false
CLEANUP=false
TEST_TYPE="all"

while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--url)
            BACKEND_URL="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        -c|--cleanup)
            CLEANUP=true
            shift
            ;;
        --skip-health)
            SKIP_HEALTH=true
            shift
            ;;
        baseline|stress|spike|all)
            TEST_TYPE="$1"
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    log_info "Starting load testing for Lewisham Charity Backend"
    log_info "Target URL: ${BACKEND_URL}"
    log_info "Test Type: ${TEST_TYPE}"
    
    check_dependencies
    
    if [ "$SKIP_HEALTH" != true ]; then
        check_api_health
    fi
    
    if [ "$CLEANUP" = true ]; then
        cleanup_old_results
    fi
    
    setup_results_directory
    
    local overall_exit_code=0
    
    case $TEST_TYPE in
        baseline)
            run_baseline_test || overall_exit_code=$?
            ;;
        stress)
            run_stress_test || overall_exit_code=$?
            ;;
        spike)
            run_spike_test || overall_exit_code=$?
            ;;
        all)
            run_baseline_test || overall_exit_code=$?
            sleep 30  # Cool down between tests
            run_stress_test || overall_exit_code=$?
            sleep 30  # Cool down between tests
            run_spike_test || overall_exit_code=$?
            ;;
    esac
    
    generate_summary_report
    
    if [ $overall_exit_code -eq 0 ]; then
        log_success "All load tests completed successfully!"
    else
        log_warning "Load tests completed with some issues (exit code: ${overall_exit_code})"
    fi
    
    log_info "Results saved to: ${RESULTS_DIR}/${TEST_RUN_ID}"
    
    exit $overall_exit_code
}

# Run main function
main "$@" 
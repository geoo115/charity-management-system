# 🚀 GitHub Actions CI/CD - Quick Setup Guide

## Prerequisites

Before using the CI/CD pipelines, ensure your repository has the necessary configuration.

## 1. Repository Settings

### Enable GitHub Actions
1. Go to `Settings` → `Actions` → `General`
2. Select "Allow all actions and reusable workflows"
3. Enable "Read and write permissions" for GITHUB_TOKEN

### Branch Protection
Add protection rules for the `main` branch:
```bash
# Using GitHub CLI
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["Test and Quality Check","Security Scan"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":2}'
```

## 2. Required Permissions

The workflows require these permissions (set automatically):
- `contents: read` - Access to repository content
- `packages: write` - Push to GitHub Container Registry
- `security-events: write` - Upload security scan results
- `actions: read` - Access to workflow information

## 3. Optional Secrets (for enhanced features)

Add these secrets in `Settings` → `Secrets and variables` → `Actions`:

### Security Scanning
```bash
SNYK_TOKEN=your_snyk_api_token
GITLEAKS_LICENSE=your_gitleaks_license_key
```

### Deployment Platforms
```bash
# Vercel
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id

# Netlify  
NETLIFY_AUTH_TOKEN=your_netlify_token
NETLIFY_SITE_ID=your_netlify_site_id
```

### Notifications
```bash
SLACK_WEBHOOK=https://hooks.slack.com/services/...
TEAMS_WEBHOOK=https://outlook.office.com/webhook/...
```

## 4. Environment Configuration

### Create Environment Files
The CI/CD system expects these environment files in the backend:
```bash
# backend/.env.example (for local development)
DB_HOST=localhost
DB_PORT=5433
DB_USER=usr
DB_PASSWORD=pwd
DB_NAME=lewisham_hub
REDIS_HOST=localhost
REDIS_PORT=6380
JWT_SECRET=your-very-long-jwt-secret-key-at-least-32-characters-long
PORT=8080
```

## 5. Test the Setup

### Trigger First Pipeline
1. Make a small change to either backend or frontend
2. Commit and push to a feature branch:
   ```bash
   git checkout -b test-ci-setup
   echo "# Testing CI/CD" >> README.md
   git add README.md
   git commit -m "test: trigger CI/CD pipeline"
   git push origin test-ci-setup
   ```
3. Create a pull request
4. Check the `Actions` tab to see workflows running

### Expected Workflow Execution
For a backend change, you should see:
- ✅ **Backend CI**: Test, security scan, build
- ✅ **Security**: Comprehensive security scanning
- ⏭️ **Docker CI**: Skipped (only on main/develop)

For a frontend change:
- ✅ **Frontend CI**: Test, accessibility, security, build  
- ✅ **Security**: Security scanning
- ⏭️ **Docker CI**: Skipped (only on main/develop)

## 6. Production Deployment Setup

### Container Registry Access
The workflows automatically push to GitHub Container Registry at:
- `ghcr.io/{owner}/{repo}/backend:latest`
- `ghcr.io/{owner}/{repo}/frontend:latest`

### Environment Protection
Set up protected environments:
1. Go to `Settings` → `Environments`
2. Create `production` environment
3. Add required reviewers
4. Set deployment branch policy to `main`

## 7. Monitoring Setup

### GitHub Security Tab
Security scan results appear in:
1. `Security` → `Code scanning alerts`
2. `Security` → `Dependabot alerts`
3. `Security` → `Secret scanning alerts`

### Action Insights
Monitor pipeline performance:
1. `Actions` → `Management` → `Usage`
2. Review workflow run times and success rates
3. Monitor artifact storage usage

## 8. Customization

### Workflow Triggers
Modify triggers in workflow files:
```yaml
on:
  push:
    branches: [ main, develop, feature/* ]  # Add feature branches
    paths:
      - 'backend/**'
      - '!backend/docs/**'                  # Ignore docs changes
```

### Quality Gates
Adjust thresholds in workflows:
```yaml
env:
  COVERAGE_THRESHOLD: 80        # Test coverage requirement
  MAX_CRITICAL_ISSUES: 5        # Security issue threshold
  BUILD_TIMEOUT: 10m            # Build timeout
```

## 9. Troubleshooting

### Common Issues

**Workflow doesn't trigger:**
- Check file paths in workflow triggers
- Ensure branch protection rules allow Actions
- Verify file permissions are correct

**Container registry push fails:**
- Verify packages:write permission is enabled
- Check if repository is private (may need different auth)

**Security scans fail:**
- Some tools require tokens for full functionality
- Check if secrets are properly configured
- Review scan results for actual issues vs. tool failures

**Tests fail:**
- Ensure database services are properly configured in workflow
- Check environment variable setup
- Verify test database credentials

### Debug Mode
Enable detailed logging:
```yaml
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

### Getting Help
```bash
# View workflow runs
gh run list

# Get detailed run information
gh run view <run-id>

# Download logs
gh run download <run-id>

# View repository settings
gh repo view --json defaultBranch,visibility,permissions
```

## 10. Next Steps

After setup is complete:

1. **Review Security Findings**: Check the Security tab for any issues
2. **Monitor Performance**: Review Lighthouse reports and load test results  
3. **Set up Notifications**: Configure Slack/Teams webhooks for team alerts
4. **Plan Deployments**: Configure actual deployment targets (K8s, cloud providers)
5. **Team Training**: Ensure team understands the CI/CD process

## Quick Checklist

- [ ] GitHub Actions enabled with proper permissions
- [ ] Branch protection rules configured
- [ ] Environment files present in repository
- [ ] First workflow run completed successfully
- [ ] Security scan results reviewed
- [ ] Container images built and pushed
- [ ] Team notified about new CI/CD setup
- [ ] Documentation reviewed and customized

---

**Ready to Go!** 🚀 Your CI/CD pipeline is now set up and ready for development.
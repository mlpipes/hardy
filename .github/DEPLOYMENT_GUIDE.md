# GitHub Actions Deployment Guide

## 🚀 Quick Start (Recommended)

### Option 1: Minimal Starter (No External Dependencies)
Start with the absolute basics - just linting and build checks:

```bash
# Keep only the starter workflow
git add .github/workflows/starter.yml
git add .github/CONTRIBUTING.md
git add .github/ISSUE_TEMPLATE/
git commit -m "ci: add minimal GitHub Actions starter workflow"
git push
```

**What this includes:**
- ✅ TypeScript checking
- ✅ ESLint validation
- ✅ Build verification
- ❌ No database required
- ❌ No external services

### Option 2: Basic with Database (Recommended)
Includes database testing for more realistic CI:

```bash
# Use the basic CI workflow
git add .github/workflows/ci-basic.yml
git add .github/CONTRIBUTING.md
git add .github/ISSUE_TEMPLATE/
git commit -m "ci: add basic GitHub Actions with database testing"
git push
```

**What this includes:**
- ✅ Everything from starter
- ✅ PostgreSQL database testing
- ✅ Prisma migrations
- ✅ Unit tests
- ❌ No security scanning yet

### Option 3: Basic + Security
Adds basic security scanning:

```bash
# Add security scanning
git add .github/workflows/ci-basic.yml
git add .github/workflows/security-basic.yml
git add .github/dependabot.yml
git commit -m "ci: add basic CI with security scanning"
git push
```

**What this includes:**
- ✅ Everything from basic
- ✅ npm audit security scanning
- ✅ GitHub CodeQL analysis
- ✅ Dependabot dependency updates
- ❌ No advanced security tools yet

## 🔧 Configuration Steps

### 1. Repository Secrets (Required)
Go to GitHub Settings > Secrets and Variables > Actions:

```bash
# For Option 1 (Starter):
# No secrets required!

# For Option 2 (Basic with Database):
# No secrets required! (Uses test database)

# For Option 3 (Basic + Security):
# No secrets required! (Basic security is free)
```

### 2. Branch Protection (Optional but Recommended)
1. Go to Settings > Branches
2. Add rule for `main` branch
3. Check "Require status checks to pass before merging"
4. Select the checks you want to require:
   - `basic-checks` (for starter)
   - `test` (for basic with database)
   - `basic-security` (for basic + security)

### 3. Team Configuration
Update reviewer assignments in workflows if needed:

```yaml
# In workflows, replace placeholder team names:
reviewers:
  - "your-team-name"  # Replace with your GitHub team
```

## 🎯 Upgrade Path

### Phase 1: Start Simple
```bash
# Week 1: Get comfortable with basic workflows
git add .github/workflows/starter.yml
```

### Phase 2: Add Database Testing
```bash
# Week 2: Add database and real tests
git rm .github/workflows/starter.yml
git add .github/workflows/ci-basic.yml
```

### Phase 3: Add Security
```bash
# Week 3: Add security scanning
git add .github/workflows/security-basic.yml
git add .github/dependabot.yml
```

### Phase 4: Full Feature Set (Later)
When you're ready for advanced features, you can add:
- Matrix testing (multiple Node.js versions)
- Advanced security scanning (Snyk, Semgrep)
- Automated releases
- Pull request validation
- Coverage reporting

## 🐛 Troubleshooting

### Common Issues

**"npm run type-check command not found"**
```bash
# Add to package.json scripts:
"type-check": "tsc --noEmit"
```

**"npm run lint command not found"**
```bash
# Add to package.json scripts:
"lint": "eslint . --ext .ts,.tsx,.js,.jsx"
```

**Database connection errors (Basic workflow)**
```bash
# The workflow automatically sets up PostgreSQL
# Check that your migrations run properly locally first:
npm run db:migrate
```

**Build fails with missing environment variables**
```bash
# Make sure your build works locally with minimal env:
BETTER_AUTH_SECRET=test-secret-32-chars npm run build
```

### Viewing Workflow Results
1. Go to your GitHub repository
2. Click "Actions" tab
3. Click on a workflow run to see details
4. Click on individual jobs to see logs

## ✅ Verification Checklist

After committing your workflows:

- [ ] Go to Actions tab and see workflows listed
- [ ] Create a test PR to trigger workflows
- [ ] Check that all steps pass (green checkmarks)
- [ ] Review workflow logs for any warnings
- [ ] Verify branch protection rules work (if configured)

## 📞 Need Help?

If you encounter issues:

1. **Check the logs** - Click on failed workflow runs
2. **Compare with working examples** - Look at other open source projects
3. **GitHub Actions documentation** - https://docs.github.com/actions
4. **Community support** - GitHub Discussions or Stack Overflow

## 🚀 Ready to Deploy?

Choose your starting point:

```bash
# Absolute beginner (no external dependencies):
git add .github/workflows/starter.yml .github/CONTRIBUTING.md .github/ISSUE_TEMPLATE/

# Recommended (basic with database):
git add .github/workflows/ci-basic.yml .github/CONTRIBUTING.md .github/ISSUE_TEMPLATE/

# Advanced beginner (basic + security):
git add .github/workflows/ci-basic.yml .github/workflows/security-basic.yml .github/dependabot.yml .github/CONTRIBUTING.md .github/ISSUE_TEMPLATE/
```

Then commit and push! 🎉
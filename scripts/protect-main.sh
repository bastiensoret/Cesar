#!/usr/bin/env bash
# Protect the main branch of bastiensoret/Cesar on GitHub.
# Usage: GITHUB_TOKEN=ghp_xxx ./scripts/protect-main.sh
#
# Requires a GitHub personal access token with "repo" scope.
# Create one at: https://github.com/settings/tokens

set -euo pipefail

OWNER="bastiensoret"
REPO="Cesar"
BRANCH="main"

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "Error: GITHUB_TOKEN environment variable is required."
  echo "Create a token at https://github.com/settings/tokens (repo scope)."
  exit 1
fi

API="https://api.github.com/repos/${OWNER}/${REPO}/branches/${BRANCH}/protection"

echo "Applying branch protection to ${OWNER}/${REPO}:${BRANCH}..."

curl -sf -X PUT "$API" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -d '{
    "required_status_checks": null,
    "enforce_admins": true,
    "required_pull_request_reviews": {
      "required_approving_review_count": 1,
      "dismiss_stale_reviews": true
    },
    "restrictions": null,
    "allow_force_pushes": false,
    "allow_deletions": false
  }' > /dev/null

echo "Done! Branch protection enabled on '${BRANCH}':"
echo "  - Pull request required (1 approving review)"
echo "  - Stale reviews dismissed on new pushes"
echo "  - Enforced for admins"
echo "  - Force pushes blocked"
echo "  - Branch deletion blocked"

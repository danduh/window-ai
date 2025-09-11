#!/bin/bash

# Deploy script for multi-website infrastructure
# Usage: ./deploy.sh [site-name|all]

set -e

SITE_NAME=${1}

if [ -z "$SITE_NAME" ]; then
    echo "Usage: $0 [site-name|all]"
    echo ""
    echo "Available sites:"
    # Extract site names from websites.ts config file
    grep -E "^\s+\w+:" src/config/websites.ts | sed 's/[[:space:]]*\([^:]*\):.*/  \1/' | grep -v "domain\|siteName"
    exit 1
fi

if [ "$SITE_NAME" = "all" ]; then
    echo "Deploying all websites..."
    DEPLOY_SITE="" cdk deploy --all --require-approval=never
else
    echo "Deploying website: $SITE_NAME"
    # Deploy shared infrastructure first, then the specific site
    DEPLOY_SITE="$SITE_NAME" cdk deploy static-websites-shared website-"$SITE_NAME" --require-approval=never
fi

echo "Deployment completed!"

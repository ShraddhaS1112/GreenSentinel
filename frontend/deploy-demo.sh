#!/bin/bash
set -e

DEMO_BUCKET="green-sentinel-demo-frontend-938881281454"
DEMO_CF_ID="$1"   # CloudFront distribution ID passed as argument
PROFILE="green-sentinel"
REGION="ap-south-1"

echo "Building demo bundle..."
npm run build:demo

echo "Uploading hashed assets (cache 1 year)..."
aws s3 sync dist/assets/ s3://$DEMO_BUCKET/assets/ \
  --cache-control "public, max-age=31536000, immutable" \
  --profile $PROFILE \
  --region $REGION

echo "Uploading entry points (no cache)..."
aws s3 sync dist/ s3://$DEMO_BUCKET/ \
  --exclude "assets/*" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --profile $PROFILE \
  --region $REGION

if [ -n "$DEMO_CF_ID" ]; then
  echo "Invalidating CloudFront..."
  aws cloudfront create-invalidation \
    --distribution-id $DEMO_CF_ID \
    --paths "/*" \
    --profile $PROFILE
fi

echo "Done."

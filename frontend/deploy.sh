#!/usr/bin/env bash
# deploy.sh — Green Sentinel frontend deploy
# Builds and uploads to S3 with correct Cache-Control headers,
# then invalidates CloudFront so users get fresh content immediately.

set -e

BUCKET="green-sentinel-dev-frontend-938881281454"
DISTRIBUTION="E7IN6ZTW0EXV5"
PROFILE="green-sentinel"
REGION="ap-south-1"

echo "Building..."
npm run build

echo "Uploading hashed assets (cache 1 year)..."
aws s3 sync dist/assets/ "s3://$BUCKET/assets/" \
  --cache-control "public, max-age=31536000, immutable" \
  --profile "$PROFILE" --region "$REGION"

echo "Uploading entry points (no cache)..."
aws s3 sync dist/ "s3://$BUCKET/" \
  --exclude "assets/*" \
  --delete \
  --cache-control "no-cache, no-store, must-revalidate" \
  --profile "$PROFILE" --region "$REGION"

echo "Invalidating CloudFront..."
aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION" \
  --paths "/*" \
  --profile "$PROFILE" --region "$REGION" \
  --output text --query 'Invalidation.Id'

echo "Done. Changes will be live in ~30 seconds."

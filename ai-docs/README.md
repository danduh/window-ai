You should be inside folder `e2e-docs`
```bash
# Build Site
python3 -m mkdocs build

# Upload to AWS S3
aws s3 sync site s3://e2e-ai-helper --delete --profile danduh --cache-control max-age=3600 --acl public-read

# Invalidate Distribution
aws cloudfront create-invalidation --distribution-id E1PBXTCSJDZL5V --paths "/" "/*" "/*.*" --profile danduh
```

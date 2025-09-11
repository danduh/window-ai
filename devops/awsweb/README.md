# AWS Multi-Website Infrastructure

This package contains AWS CDK infrastructure for deploying multiple static websites using a shared S3 bucket, individual CloudFront distributions, and a shared SSL certificate.

## Architecture

The multi-website infrastructure includes:

- **Shared S3 Bucket**: `static-websites` for hosting all website files
- **Individual CloudFront Distributions**: One per website for global content delivery and caching
- **Shared ACM Certificate**: Single wildcard certificate for `*.danduh.me` domains
- **Origin Access Identity**: For secure S3 access from CloudFront only

## Websites Configuration

Websites are configured in `src/config/websites.ts`:

```typescript
export const WEBSITES: Record<string, WebsiteConfig> = {
  mysite: {
    domain: 'mysite.danduh.me',
    siteName: 'mysite',
  },
  // Add more websites here
};
```

### Current Websites

- **mysite**: `mysite.danduh.me` → `s3://static-websites/mysite/`

### Shared Resources

- **S3 Bucket**: `static-websites`
- **Certificate ARN**: `arn:aws:acm:us-east-1:411429114957:certificate/e3ea7859-fa8e-4da2-8e7a-3819310c2c8c`

## Adding New Websites

1. Add the website configuration to `src/config/websites.ts`:
   ```typescript
   mynewsite: {
     domain: 'mynewsite.danduh.me',
     siteName: 'mynewsite',
   },
   ```

2. Deploy the new website:
   ```bash
   nx deploy awsweb --site mynewsite
   ```

## Deployment

### Deploy a Specific Website

Deploy a single website with default HTML content:

```bash
# Deploy mysite website (includes shared infrastructure)
nx deploy-mysite awsweb
```

### Deploy All Websites

Deploy all configured websites:

```bash
nx deploy awsweb
```

### Deploy Shared Infrastructure Only

Deploy just the shared S3 bucket:

```bash
nx deploy-shared awsweb
```

### Adding Deployment for New Websites

When you add a new website to the configuration, you'll need to add a corresponding deployment target in `project.json`:

```json
"deploy-newsite": {
  "executor": "nx:run-commands",
  "options": {
    "cwd": "devops/awsweb",
    "command": "DEPLOY_SITE=newsite cdk deploy static-websites-shared website-newsite --require-approval=never"
  }
},
```

## Features

- **Multi-Website Support**: Single S3 bucket with folder-based organization
- **Individual CloudFront Distributions**: Each website gets its own distribution for custom caching and configuration
- **Shared SSL Certificate**: Single wildcard certificate covers all `*.danduh.me` domains
- **Default Content**: Automatic "Hello World" HTML page creation for new websites
- **SPA Support**: Configured for Single Page Applications with proper error handling
- **Security**: 
  - S3 bucket blocked from public access
  - Origin Access Identity for CloudFront-only access per website folder
  - SSL enforcement
- **Performance**:
  - CloudFront caching optimization
  - Gzip compression enabled
  - HTTP/2 and HTTP/3 support
- **Cost Optimization**:
  - Single shared S3 bucket reduces costs
  - Lifecycle rules for S3 objects
  - All-region price class for production performance

## Security

- All S3 bucket public access is blocked
- Each website's CloudFront distribution can only access its specific folder in S3
- SSL/TLS encryption is enforced for all websites
- Shared ACM certificate managed externally

## File Organization

Each website gets its own folder in the shared S3 bucket:

```
s3://static-websites/
├── mysite/
│   ├── index.html
│   └── assets/
└── anothernewsite/
    ├── index.html
    └── css/
```

## Stack Outputs

### Shared Stack Outputs

The `static-websites-shared` stack provides:
- `SharedBucketName`: S3 bucket name for all websites

### Individual Website Stack Outputs

Each `website-<sitename>` stack provides:
- `DistributionId`: CloudFront distribution ID for cache invalidation
- `DistributionDomainName`: CloudFront domain name  
- `WebsiteUrl`: Complete website URL
- `S3Path`: S3 path for uploading files (`s3://static-websites/<sitename>/`)

### Updating snapshots

To update snapshots, run the following command:

`nx test awsweb --configuration=update-snapshot`

## Run lint

Run `nx lint awsweb`

### Fixable issues

You can also automatically fix some lint errors by running the following command:

`nx lint awsweb --configuration=fix`

## Deploy to AWS

### Deploy all Websites

Run `nx deploy awsweb`

### Deploy a single Website

Run `nx deploy-mysite awsweb` (or the specific site deployment target)

### Hotswap deployment

> [!CAUTION]
> Not to be used in production deployments

Use the --hotswap flag with the deploy target to attempt to update your AWS resources directly instead of generating an AWS CloudFormation change set and deploying it. Deployment falls back to AWS CloudFormation deployment if hot swapping is not possible.

Currently hot swapping supports Lambda functions, Step Functions state machines, and Amazon ECS container images. The --hotswap flag also disables rollback (i.e., implies --no-rollback).

Run `nx cdk awsweb deploy --hotswap --all`

## Cfn Guard Suppressions

There may be instances where you want to suppress certain rules on resources. You can do this in two ways:

### Supress a rule on a given construct

```typescript
// Example - specific CDK construct suppressions can be added if needed
// This functionality may need to be implemented as part of the CDK constructs
```

## Useful links

- [Infra reference docs](TODO)
- [Learn more about NX](https://nx.dev/getting-started/intro)

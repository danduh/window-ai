# Multi-Website Infrastructure Setup Summary

## 🎉 Implementation Complete!

Your AWS infrastructure has been successfully updated to support multiple static websites with the following architecture:

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS Infrastructure                        │
├─────────────────────────────────────────────────────────────────┤
│  S3 Bucket: static-websites                                     │
│  ├── mysite/                                                    │
│  │   ├── index.html                                             │
│  │   └── assets/                                                │
│  └── [future-sites]/                                            │
│                                                                 │
│  CloudFront Distributions (one per site):                      │
│  ├── mysite.danduh.me → static-websites/mysite/                │
│  └── [future-distributions]                                    │
│                                                                 │
│  Shared Certificate:                                            │
│  └── *.danduh.me (ARN: ...e3ea7859-fa8e-4da2-8e7a-3819310c2c8c)│
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Deployment Commands

### Deploy All Websites
```bash
nx deploy awsweb
```

### Deploy Specific Website
```bash
nx deploy-mysite awsweb
```

### Deploy Shared Infrastructure Only
```bash
nx deploy-shared awsweb
```

## 📝 Adding New Websites

### Step 1: Update Website Configuration

Edit `devops/awsweb/src/config/websites.ts`:

```typescript
export const WEBSITES: Record<string, WebsiteConfig> = {
  mysite: {
    domain: 'mysite.danduh.me',
    siteName: 'mysite',
  },
  // Add your new website here
  newsite: {
    domain: 'newsite.danduh.me',
    siteName: 'newsite',
  },
};
```

### Step 2: Add Deployment Target

Edit `devops/awsweb/project.json` and add a new deployment target:

```json
"deploy-newsite": {
  "executor": "nx:run-commands",
  "options": {
    "cwd": "devops/awsweb",
    "command": "DEPLOY_SITE=newsite npx cdk deploy static-websites-shared website-newsite --require-approval=never"
  }
},
```

### Step 3: Deploy the New Website

```bash
nx deploy-newsite awsweb
```

This will:
- Create a CloudFront distribution for `newsite.danduh.me`
- Create a folder `s3://static-websites/newsite/`
- Deploy a default "Hello World" HTML page
- Configure SSL using the shared certificate

## 🏗️ Infrastructure Details

### Created Stacks
1. **static-websites-shared**: Contains the shared S3 bucket
2. **website-mysite**: CloudFront distribution for mysite.danduh.me
3. **monorepo-infra-sandbox**: Sandbox environment (existing)

### Key Features
- ✅ Single S3 bucket for all websites (`static-websites`)
- ✅ Individual CloudFront distributions per website
- ✅ Shared SSL certificate for `*.danduh.me`
- ✅ Automatic "Hello World" page creation for new sites
- ✅ SPA (Single Page Application) support
- ✅ Proper security (OAI, blocked public access)
- ✅ Cost optimization (lifecycle rules, single bucket)

### File Organization
```
s3://static-websites/
├── mysite/
│   └── index.html (Hello World page)
└── [future-sites]/
    └── index.html
```

## 🔧 Development Workflow

1. **Add new website** → Update `websites.ts` + add deployment target
2. **Deploy website** → `nx deploy-<sitename> awsweb`
3. **Upload content** → Use S3 path from stack outputs
4. **Invalidate cache** → Use CloudFront distribution ID from outputs

## 📊 Stack Outputs

Each deployed website provides:
- **DistributionId**: For cache invalidation
- **DistributionDomainName**: CloudFront domain
- **WebsiteUrl**: Complete website URL (`https://mysite.danduh.me`)
- **S3Path**: Upload path (`s3://static-websites/mysite/`)

## 🎯 Next Steps

1. **Test the deployment**:
   ```bash
   nx deploy-mysite awsweb
   ```

2. **Upload your website content** to `s3://static-websites/mysite/`

3. **Add more websites** by following the "Adding New Websites" guide above

4. **Set up DNS** for `*.danduh.me` to point to the CloudFront distributions (you mentioned handling this separately)

Your multi-website infrastructure is ready to go! 🚀

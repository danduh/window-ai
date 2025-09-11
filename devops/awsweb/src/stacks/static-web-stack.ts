import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';

export interface StaticWebStackProps extends cdk.StackProps {
  /**
   * Environment name (dev, qa, prod)
   */
  environment: string;

  /**
   * Custom domain name for the website (e.g., dev.promptver.io)
   */
  customDomainName: string;

  /**
   * The hosted zone domain (e.g., promptver.io)
   */
  hostedZoneDomain: string;

  /**
   * The hosted zone ID for the domain
   */
  hostedZoneId: string;

  /**
   * S3 bucket name for the static website
   */
  bucketName: string;

  /**
   * ACM certificate ARN for CloudFront (must be in us-east-1)
   */
  certificateArn: string;
}

export class StaticWebStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly websiteUrl: string;

  constructor(scope: Construct, id: string, props: StaticWebStackProps) {
    super(scope, id, props);

    // Import the existing hosted zone
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      'HostedZone',
      {
        hostedZoneId: props.hostedZoneId,
        zoneName: props.hostedZoneDomain,
      },
    );

    // Import the existing ACM certificate from us-east-1 region
    const certificate = certificatemanager.Certificate.fromCertificateArn(
      this,
      'Certificate',
      props.certificateArn,
    );

    // Create S3 bucket for static website hosting
    this.bucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: props.bucketName,
      // Safer defaults for prod: retain bucket and contents
      removalPolicy:
        props.environment === 'prod'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: props.environment !== 'prod',
      versioned: true, // Enable versioning for rollback capability
      publicReadAccess: false, // Block all public access - only CloudFront can access
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      // Add lifecycle rules for cost optimization
      lifecycleRules: [
        {
          id: 'delete-incomplete-multipart-uploads',
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        },
        {
          id: 'delete-old-versions',
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
    });

    // Create Origin Access Identity for CloudFront to access S3
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'OAI',
      {
        comment: `OAI for ${props.bucketName}`,
      },
    );

    // Grant CloudFront OAI read access to the S3 bucket
    this.bucket.grantRead(originAccessIdentity);

    // Create CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(this.bucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      },
      // Configure for single page application (SPA)
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      // Custom domain configuration
      domainNames: [props.customDomainName],
      certificate: certificate,
      // Enable HTTP/2 and HTTP/3
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      // Price class for cost optimization (can be upgraded for production)
      priceClass:
        props.environment === 'prod'
          ? cloudfront.PriceClass.PRICE_CLASS_ALL
          : cloudfront.PriceClass.PRICE_CLASS_100,
      // Disable logging for now to avoid ACL issues
      enableLogging: false,
    });

    // Create Route53 A record to point to CloudFront distribution
    new route53.ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      recordName: props.customDomainName.replace(
        `.${props.hostedZoneDomain}`,
        '',
      ),
      target: route53.RecordTarget.fromAlias(
        new route53targets.CloudFrontTarget(this.distribution),
      ),
      comment: `Alias record for ${props.customDomainName} pointing to CloudFront distribution`,
    });

    // Store the website URL
    this.websiteUrl = `https://${props.customDomainName}`;

    // Add tags to all resources
    cdk.Tags.of(this).add('Environment', props.environment);
    cdk.Tags.of(this).add('Service', 'static-website');
    cdk.Tags.of(this).add('Purpose', 'ui-hosting');

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: 'S3 bucket name for static website',
      exportName: `${id}-BucketName`,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: `${id}-DistributionId`,
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
      exportName: `${id}-DistributionDomainName`,
    });

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: this.websiteUrl,
      description: 'Website URL',
      exportName: `${id}-WebsiteUrl`,
    });
  }
}

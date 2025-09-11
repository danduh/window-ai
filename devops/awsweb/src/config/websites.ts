/**
 * Configuration for static websites
 */
export interface WebsiteConfig {
  domain: string;
  siteName: string;
}

/**
 * Websites configuration
 * Add new websites here to create their CloudFront distributions
 */
export const WEBSITES: Record<string, WebsiteConfig> = {
  windowai: {
    domain: 'windowai.danduh.me',
    siteName: 'windowai',
  },
  // Add more websites here as needed
  // example: {
  //   domain: 'example.danduh.me',
  //   siteName: 'example',
  // },
};

/**
 * Common configuration for all websites
 */
export const COMMON_CONFIG = {
  /**
   * Shared S3 bucket for all websites
   */
  bucketName: 'danduh-static-websites',
  
  /**
   * Shared ACM certificate ARN (must be in us-east-1 for CloudFront)
   */
  certificateArn: 'arn:aws:acm:us-east-1:411429114957:certificate/e3ea7859-fa8e-4da2-8e7a-3819310c2c8c',
} as const;

// ============================================================
// Apple App Store Server API v2 Verification Service
// Verifies transactions using the official Apple library
// ============================================================

import https from 'https';
import { logger } from '../utils/logger.js';

let AppStoreServerAPIClient;
let SignedDataVerifier;
let appleRootCAs = [];
let certCache = {};

/**
 * Attempt to load the Apple App Store Server library
 * Gracefully degrades if not installed
 */
async function loadAppStoreLibrary() {
  try {
    const module = await import('@apple/app-store-server-library');
    AppStoreServerAPIClient = module.AppStoreServerAPIClient;
    SignedDataVerifier = module.SignedDataVerifier;
    logger.info('Apple App Store Server library loaded successfully');
    return true;
  } catch (error) {
    logger.warn('Apple App Store Server library not installed:', error.message);
    logger.info('App Store verification will gracefully degrade. Install with: npm install @apple/app-store-server-library');
    return false;
  }
}

/**
 * Download Apple Root CA certificates from Apple's server
 * Caches them in memory for subsequent verifications
 */
async function downloadAppleRootCAs() {
  if (appleRootCAs.length > 0) {
    return appleRootCAs;
  }

  logger.info('Downloading Apple Root CA certificates...');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.apple.com',
      path: '/certificateauthority/AppleRootCA4.cer',
      method: 'GET',
    };

    https.request(options, (res) => {
      let data = Buffer.alloc(0);

      res.on('data', (chunk) => {
        data = Buffer.concat([data, chunk]);
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          appleRootCAs.push(data);
          logger.info('Successfully downloaded Apple Root CA');
          resolve([data]);
        } else {
          logger.warn('Failed to download Apple Root CA:', res.statusCode);
          resolve([]);
        }
      });
    })
      .on('error', (error) => {
        logger.error('Error downloading Apple Root CA:', error.message);
        reject(error);
      })
      .end();
  });
}

/**
 * Build AppStoreServerAPIClient if library is available
 */
async function buildAPIClient() {
  if (!AppStoreServerAPIClient) {
    logger.debug('App Store Server API Client not available');
    return null;
  }

  const issuerId = process.env.IAP_ISSUER_ID || process.env.APP_STORE_ISSUER_ID;
  const keyId = process.env.IAP_KEY_ID || process.env.APNS_KEY_ID;
  let keyContent = process.env.IAP_KEY_CONTENT || process.env.APNS_KEY_CONTENT;

  if (!issuerId || !keyId || !keyContent) {
    logger.warn('App Store API credentials incomplete:', {
      hasIssuerId: !!issuerId,
      hasKeyId: !!keyId,
      hasKeyContent: !!keyContent,
    });
    return null;
  }

  // Decode base64 key content if necessary
  if (keyContent.includes('base64:')) {
    keyContent = Buffer.from(keyContent.replace('base64:', ''), 'base64').toString('utf8');
  }

  const environment = process.env.NODE_ENV === 'production'
    ? 'PRODUCTION'
    : 'SANDBOX';

  try {
    const client = new AppStoreServerAPIClient(
      keyContent,
      keyId,
      issuerId,
      process.env.APP_APPLE_ID || '6758818206',
      environment
    );
    logger.info('AppStoreServerAPIClient initialized', { environment, issuerId });
    return client;
  } catch (error) {
    logger.error('Failed to build AppStoreServerAPIClient:', error.message);
    return null;
  }
}

/**
 * Build SignedDataVerifier if library is available
 */
async function buildSignedDataVerifier() {
  if (!SignedDataVerifier) {
    logger.debug('SignedDataVerifier not available');
    return null;
  }

  try {
    const rootCAs = await downloadAppleRootCAs();
    const verifier = new SignedDataVerifier(rootCAs, true, true);
    logger.info('SignedDataVerifier initialized');
    return verifier;
  } catch (error) {
    logger.error('Failed to build SignedDataVerifier:', error.message);
    return null;
  }
}

let apiClient = null;
let dataVerifier = null;
let initialized = false;

/**
 * Initialize the App Store verification service
 * Downloads certificates and builds clients on startup
 */
export async function initializeAppStoreVerification() {
  if (initialized) {
    return;
  }

  logger.info('Initializing App Store verification service...');

  const libraryAvailable = await loadAppStoreLibrary();

  if (!libraryAvailable) {
    logger.warn('App Store verification service running in degraded mode');
    initialized = true;
    return;
  }

  try {
    apiClient = await buildAPIClient();
    dataVerifier = await buildSignedDataVerifier();
    logger.info('App Store verification service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize App Store service:', error.message);
  }

  initialized = true;
}

/**
 * Verify a transaction by looking it up via the App Store Server API
 * Returns transaction info and validity status
 */
export async function verifyTransaction(transactionId) {
  if (!apiClient) {
    logger.error('AppStoreServerAPIClient not initialized');
    return {
      valid: false,
      error: 'App Store API client not configured',
      transactionId,
    };
  }

  try {
    logger.info('Verifying transaction:', { transactionId });

    const response = await apiClient.getTransactionInfo(transactionId);

    if (!response || !response.signedTransactionInfo) {
      logger.warn('No signed transaction info in response');
      return {
        valid: false,
        error: 'Transaction not found',
        transactionId,
      };
    }

    // Verify the signed transaction payload
    const verifiedData = await verifySignedTransaction(response.signedTransactionInfo);

    if (!verifiedData.valid) {
      return verifiedData;
    }

    return {
      valid: true,
      transactionId,
      transactionInfo: verifiedData.transactionInfo,
      bundleId: verifiedData.bundleId,
      appAppleId: verifiedData.appAppleId,
    };
  } catch (error) {
    logger.error('Transaction verification failed:', {
      transactionId,
      error: error.message,
    });

    return {
      valid: false,
      error: error.message,
      transactionId,
    };
  }
}

/**
 * Verify a signed transaction JWT
 * Decodes and verifies the JWS signed transaction info
 */
export async function verifySignedTransaction(signedTransactionInfo) {
  if (!dataVerifier) {
    logger.error('SignedDataVerifier not initialized');
    return {
      valid: false,
      error: 'Signed data verifier not configured',
    };
  }

  try {
    logger.debug('Verifying signed transaction');

    // The SignedDataVerifier will decode and validate the JWT
    const decodedData = dataVerifier.verifyAndDecodeSignedData(signedTransactionInfo);

    if (!decodedData) {
      logger.warn('Failed to decode signed transaction data');
      return {
        valid: false,
        error: 'Invalid signed data',
      };
    }

    return {
      valid: true,
      transactionInfo: decodedData,
      bundleId: decodedData.bundleId,
      appAppleId: decodedData.appAppleId,
    };
  } catch (error) {
    logger.error('Signed transaction verification failed:', error.message);

    return {
      valid: false,
      error: error.message,
    };
  }
}

/**
 * Get subscription status for a transaction
 * Checks if the subscription is currently active
 */
export async function getSubscriptionStatus(transactionId) {
  const verification = await verifyTransaction(transactionId);

  if (!verification.valid) {
    return {
      active: false,
      error: verification.error,
    };
  }

  const txnInfo = verification.transactionInfo;

  // Check if subscription is currently active
  const now = Date.now();
  const expiresAt = txnInfo.expiresDate ? parseInt(txnInfo.expiresDate, 10) : null;

  const isActive = expiresAt && expiresAt > now;

  return {
    active: isActive,
    transactionId,
    productId: txnInfo.productId,
    purchaseDate: txnInfo.purchaseDate ? new Date(parseInt(txnInfo.purchaseDate, 10)) : null,
    expiresDate: txnInfo.expiresDate ? new Date(parseInt(txnInfo.expiresDate, 10)) : null,
    isTrialPeriod: txnInfo.isTrialPeriod || false,
    willAutoRenew: txnInfo.isInBillingRetryPeriod === false && !txnInfo.revocationDate,
    revocationDate: txnInfo.revocationDate ? new Date(parseInt(txnInfo.revocationDate, 10)) : null,
  };
}

/**
 * Handle App Store Server Notification v2
 * Verifies the signed notification payload and extracts the data
 */
export async function handleNotification(signedPayload) {
  if (!dataVerifier) {
    logger.error('SignedDataVerifier not initialized for notification handling');
    return {
      valid: false,
      error: 'Signed data verifier not configured',
    };
  }

  try {
    logger.debug('Processing App Store notification');

    // Verify and decode the notification JWT
    const responseBodyV2 = dataVerifier.verifyAndDecodeNotification(signedPayload);

    if (!responseBodyV2) {
      logger.warn('Failed to verify notification payload');
      return {
        valid: false,
        error: 'Invalid notification signature',
      };
    }

    const notificationType = responseBodyV2.notificationType;
    const subtype = responseBodyV2.subtype;
    const transactionInfo = responseBodyV2.data?.signedTransactionInfo
      ? await verifySignedTransaction(responseBodyV2.data.signedTransactionInfo)
      : null;

    logger.info('App Store notification received:', {
      notificationType,
      subtype,
      transactionId: transactionInfo?.transactionInfo?.transactionId,
    });

    return {
      valid: true,
      notificationType,
      subtype,
      timestamp: responseBodyV2.signedDate,
      transactionInfo: transactionInfo?.transactionInfo || null,
      appAppleId: responseBodyV2.data?.appAppleId,
      bundleId: responseBodyV2.data?.bundleId,
    };
  } catch (error) {
    logger.error('Notification verification failed:', error.message);

    return {
      valid: false,
      error: error.message,
    };
  }
}

/**
 * Graceful function wrappers for when library is not available
 * These prevent errors during development/testing without the library
 */

export function verifyTransactionSafe(transactionId) {
  if (!initialized) {
    logger.warn('App Store verification not initialized');
    return Promise.resolve({
      valid: false,
      error: 'Service not initialized',
      transactionId,
    });
  }

  if (!apiClient) {
    logger.debug('App Store API client not available, returning unverified');
    return Promise.resolve({
      valid: false,
      error: 'App Store API client not configured',
      transactionId,
      gracefulDegrade: true,
    });
  }

  return verifyTransaction(transactionId);
}

export function verifySignedTransactionSafe(signedTransactionInfo) {
  if (!initialized) {
    logger.warn('App Store verification not initialized');
    return Promise.resolve({
      valid: false,
      error: 'Service not initialized',
    });
  }

  if (!dataVerifier) {
    logger.debug('Signed data verifier not available, returning unverified');
    return Promise.resolve({
      valid: false,
      error: 'Signed data verifier not configured',
      gracefulDegrade: true,
    });
  }

  return verifySignedTransaction(signedTransactionInfo);
}

export function getSubscriptionStatusSafe(transactionId) {
  if (!initialized) {
    logger.warn('App Store verification not initialized');
    return Promise.resolve({
      active: false,
      error: 'Service not initialized',
    });
  }

  if (!apiClient) {
    logger.debug('App Store API client not available');
    return Promise.resolve({
      active: false,
      error: 'App Store API client not configured',
      gracefulDegrade: true,
    });
  }

  return getSubscriptionStatus(transactionId);
}

export function handleNotificationSafe(signedPayload) {
  if (!initialized) {
    logger.warn('App Store verification not initialized');
    return Promise.resolve({
      valid: false,
      error: 'Service not initialized',
    });
  }

  if (!dataVerifier) {
    logger.debug('Signed data verifier not available');
    return Promise.resolve({
      valid: false,
      error: 'Signed data verifier not configured',
      gracefulDegrade: true,
    });
  }

  return handleNotification(signedPayload);
}

export default {
  initializeAppStoreVerification,
  verifyTransaction,
  verifySignedTransaction,
  getSubscriptionStatus,
  handleNotification,
  verifyTransactionSafe,
  verifySignedTransactionSafe,
  getSubscriptionStatusSafe,
  handleNotificationSafe,
};

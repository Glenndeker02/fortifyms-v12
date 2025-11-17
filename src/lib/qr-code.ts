import QRCode from 'qrcode';
import { nanoid } from 'nanoid';

/**
 * QR Code Utilities
 *
 * Generate and verify QR codes for batch traceability and anti-counterfeiting.
 *
 * Reference: TODO.md Phase 2, newprd.md Module 3.4.5 (Traceability & QR Codes)
 */

/**
 * Batch QR Code Data
 */
export interface BatchQRData {
  batchId: string;
  millId: string;
  millName: string;
  productionDate: string;
  commodity: string;
  fortificationLevel: string;
  qcStatus: string;
  complianceScore?: number;
  certificateUrl: string;
  verificationCode: string;
  timestamp: number;
}

/**
 * QR Code Generation Options
 */
export interface QRCodeOptions {
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  width?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * Generate QR Code as Data URL
 *
 * @param data - Data to encode
 * @param options - QR code options
 * @returns Promise resolving to data URL
 */
export async function generateQRCodeDataURL(
  data: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const defaultOptions: QRCodeOptions = {
    errorCorrectionLevel: 'H', // High error correction for better scanning
    margin: 4,
    width: 400,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    ...options,
  };

  return QRCode.toDataURL(data, defaultOptions);
}

/**
 * Generate QR Code as Buffer (for server-side PDF generation)
 *
 * @param data - Data to encode
 * @param options - QR code options
 * @returns Promise resolving to buffer
 */
export async function generateQRCodeBuffer(
  data: string,
  options: QRCodeOptions = {}
): Promise<Buffer> {
  const defaultOptions: QRCodeOptions = {
    errorCorrectionLevel: 'H',
    margin: 4,
    width: 400,
    ...options,
  };

  return QRCode.toBuffer(data, defaultOptions);
}

/**
 * Generate QR Code as SVG String
 *
 * @param data - Data to encode
 * @param options - QR code options
 * @returns Promise resolving to SVG string
 */
export async function generateQRCodeSVG(
  data: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const defaultOptions: QRCodeOptions = {
    errorCorrectionLevel: 'H',
    margin: 4,
    width: 400,
    ...options,
  };

  return QRCode.toString(data, { type: 'svg', ...defaultOptions });
}

/**
 * Generate Verification Code
 * Unique code for anti-counterfeiting
 *
 * @param length - Length of code
 * @returns Verification code
 */
export function generateVerificationCode(length: number = 16): string {
  return nanoid(length);
}

/**
 * Create Batch QR Data Object
 *
 * @param batch - Batch information
 * @returns Batch QR data object
 */
export function createBatchQRData(batch: {
  batchId: string;
  millId: string;
  millName: string;
  productionDate: Date;
  commodity: string;
  fortificationLevel: string;
  qcStatus: string;
  complianceScore?: number;
}): BatchQRData {
  const verificationCode = generateVerificationCode();

  return {
    batchId: batch.batchId,
    millId: batch.millId,
    millName: batch.millName,
    productionDate: batch.productionDate.toISOString(),
    commodity: batch.commodity,
    fortificationLevel: batch.fortificationLevel,
    qcStatus: batch.qcStatus,
    complianceScore: batch.complianceScore,
    certificateUrl: `${process.env.NEXT_PUBLIC_APP_URL}/traceability/certificate/${batch.batchId}`,
    verificationCode,
    timestamp: Date.now(),
  };
}

/**
 * Encode Batch QR Data to JSON String
 *
 * @param data - Batch QR data
 * @returns JSON string
 */
export function encodeBatchQRData(data: BatchQRData): string {
  return JSON.stringify(data);
}

/**
 * Decode Batch QR Data from JSON String
 *
 * @param jsonString - JSON string
 * @returns Batch QR data or null if invalid
 */
export function decodeBatchQRData(jsonString: string): BatchQRData | null {
  try {
    const data = JSON.parse(jsonString);

    // Validate required fields
    const requiredFields = [
      'batchId',
      'millId',
      'productionDate',
      'commodity',
      'verificationCode',
    ];

    const isValid = requiredFields.every((field) => field in data);

    if (!isValid) {
      return null;
    }

    return data as BatchQRData;
  } catch {
    return null;
  }
}

/**
 * Generate Batch QR Code
 * Complete workflow to generate QR code for a batch
 *
 * @param batch - Batch information
 * @param format - Output format ('dataURL' | 'buffer' | 'svg')
 * @param options - QR code options
 * @returns Promise resolving to QR code in specified format
 */
export async function generateBatchQRCode(
  batch: {
    batchId: string;
    millId: string;
    millName: string;
    productionDate: Date;
    commodity: string;
    fortificationLevel: string;
    qcStatus: string;
    complianceScore?: number;
  },
  format: 'dataURL' | 'buffer' | 'svg' = 'dataURL',
  options: QRCodeOptions = {}
): Promise<string | Buffer> {
  // Create QR data object
  const qrData = createBatchQRData(batch);

  // Encode to JSON
  const jsonData = encodeBatchQRData(qrData);

  // Generate QR code in requested format
  switch (format) {
    case 'buffer':
      return generateQRCodeBuffer(jsonData, options);
    case 'svg':
      return generateQRCodeSVG(jsonData, options);
    case 'dataURL':
    default:
      return generateQRCodeDataURL(jsonData, options);
  }
}

/**
 * Verify Batch QR Code
 * Check if QR code is valid and not tampered
 *
 * @param jsonData - Scanned QR code data
 * @param verifyWithDatabase - Function to verify against database
 * @returns Verification result
 */
export async function verifyBatchQRCode(
  jsonData: string,
  verifyWithDatabase?: (batchId: string, verificationCode: string) => Promise<boolean>
): Promise<{
  valid: boolean;
  data?: BatchQRData;
  error?: string;
}> {
  // Decode QR data
  const qrData = decodeBatchQRData(jsonData);

  if (!qrData) {
    return {
      valid: false,
      error: 'Invalid QR code format',
    };
  }

  // Check age (QR codes older than 2 years might be suspicious)
  const age = Date.now() - qrData.timestamp;
  const twoYears = 2 * 365 * 24 * 60 * 60 * 1000;

  if (age > twoYears) {
    return {
      valid: false,
      data: qrData,
      error: 'QR code is too old',
    };
  }

  // Verify with database if function provided
  if (verifyWithDatabase) {
    const isValid = await verifyWithDatabase(qrData.batchId, qrData.verificationCode);

    if (!isValid) {
      return {
        valid: false,
        data: qrData,
        error: 'Verification code does not match database records',
      };
    }
  }

  return {
    valid: true,
    data: qrData,
  };
}

/**
 * Generate Lot QR Code (Multiple Batches)
 * For institutional procurement orders
 *
 * @param lotId - Lot ID
 * @param batchIds - Array of batch IDs in the lot
 * @param format - Output format
 * @param options - QR code options
 * @returns Promise resolving to QR code
 */
export async function generateLotQRCode(
  lotId: string,
  batchIds: string[],
  format: 'dataURL' | 'buffer' | 'svg' = 'dataURL',
  options: QRCodeOptions = {}
): Promise<string | Buffer> {
  const lotData = {
    type: 'LOT',
    lotId,
    batchIds,
    batchCount: batchIds.length,
    certificateUrl: `${process.env.NEXT_PUBLIC_APP_URL}/traceability/lot/${lotId}`,
    verificationCode: generateVerificationCode(),
    timestamp: Date.now(),
  };

  const jsonData = JSON.stringify(lotData);

  switch (format) {
    case 'buffer':
      return generateQRCodeBuffer(jsonData, options);
    case 'svg':
      return generateQRCodeSVG(jsonData, options);
    case 'dataURL':
    default:
      return generateQRCodeDataURL(jsonData, options);
  }
}

/**
 * Create QR Code for Compliance Certificate
 *
 * @param auditId - Audit ID
 * @param millId - Mill ID
 * @param score - Compliance score
 * @param format - Output format
 * @param options - QR code options
 * @returns Promise resolving to QR code
 */
export async function generateComplianceCertificateQR(
  auditId: string,
  millId: string,
  score: number,
  format: 'dataURL' | 'buffer' | 'svg' = 'dataURL',
  options: QRCodeOptions = {}
): Promise<string | Buffer> {
  const certData = {
    type: 'COMPLIANCE_CERTIFICATE',
    auditId,
    millId,
    score,
    certificateUrl: `${process.env.NEXT_PUBLIC_APP_URL}/compliance/certificate/${auditId}`,
    verificationCode: generateVerificationCode(),
    timestamp: Date.now(),
  };

  const jsonData = JSON.stringify(certData);

  switch (format) {
    case 'buffer':
      return generateQRCodeBuffer(jsonData, options);
    case 'svg':
      return generateQRCodeSVG(jsonData, options);
    case 'dataURL':
    default:
      return generateQRCodeDataURL(jsonData, options);
  }
}

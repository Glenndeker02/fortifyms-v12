import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { generateBatchQRCode } from './qr-code';
import { formatNumber, formatPercentage } from './utils';
import { COMMODITY_LABELS, COMPLIANCE_SCORE_CATEGORIES } from './constants';

/**
 * PDF Generator Service
 *
 * Generate professional PDF documents for certificates, reports, and documentation.
 * Supports batch certificates, QC reports, compliance certificates, and training certificates.
 *
 * Reference: TODO.md Phase 2, newprd.md Module 3.4.6 (Reporting & Certificates)
 */

/**
 * PDF Configuration
 */
const PDF_CONFIG = {
  headerColor: '#10b981', // FortifyMIS primary green
  textColor: '#1f2937',
  mutedColor: '#6b7280',
  dangerColor: '#dc2626',
  warningColor: '#f59e0b',
  fontSize: {
    title: 24,
    subtitle: 16,
    heading: 14,
    body: 11,
    small: 9,
  },
  margin: 20,
  lineHeight: 1.5,
};

/**
 * Add PDF Header
 */
function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Logo placeholder (TODO: Add actual logo)
  doc.setFillColor(PDF_CONFIG.headerColor);
  doc.rect(PDF_CONFIG.margin, PDF_CONFIG.margin, 40, 15, 'F');
  doc.setTextColor('#ffffff');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('FortifyMIS', PDF_CONFIG.margin + 5, PDF_CONFIG.margin + 10);

  // Title
  doc.setTextColor(PDF_CONFIG.textColor);
  doc.setFontSize(PDF_CONFIG.fontSize.title);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, PDF_CONFIG.margin + 50, { align: 'center' });

  if (subtitle) {
    doc.setFontSize(PDF_CONFIG.fontSize.subtitle);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(PDF_CONFIG.mutedColor);
    doc.text(subtitle, pageWidth / 2, PDF_CONFIG.margin + 63, { align: 'center' });
  }

  return PDF_CONFIG.margin + 80;
}

/**
 * Add PDF Footer
 */
function addFooter(doc: jsPDF, pageNumber: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFontSize(PDF_CONFIG.fontSize.small);
  doc.setTextColor(PDF_CONFIG.mutedColor);
  doc.text(
    `Generated on ${format(new Date(), 'MMM dd, yyyy HH:mm')}`,
    PDF_CONFIG.margin,
    pageHeight - 10
  );
  doc.text(`Page ${pageNumber}`, pageWidth - PDF_CONFIG.margin, pageHeight - 10, {
    align: 'right',
  });
}

/**
 * Generate Batch Traceability Certificate
 *
 * @param batch - Batch data
 * @returns Promise resolving to PDF blob
 */
export async function generateBatchCertificate(batch: {
  batchId: string;
  millId: string;
  millName: string;
  productionDate: Date;
  commodity: string;
  inputWeight: number;
  outputWeight: number;
  fortificationLevel: string;
  premixBrand: string;
  premixDosingRate: number;
  qcStatus: string;
  complianceScore?: number;
  qcResults?: {
    testType: string;
    result: string;
    status: string;
  }[];
}): Promise<Blob> {
  const doc = new jsPDF();
  let yPosition = addHeader(doc, 'BATCH TRACEABILITY CERTIFICATE', 'Food Fortification Program');

  // Certificate ID
  doc.setFontSize(PDF_CONFIG.fontSize.body);
  doc.setTextColor(PDF_CONFIG.mutedColor);
  doc.text(`Certificate ID: ${batch.batchId}`, PDF_CONFIG.margin, yPosition);
  yPosition += 20;

  // Mill Information
  doc.setFontSize(PDF_CONFIG.fontSize.heading);
  doc.setTextColor(PDF_CONFIG.textColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Mill Information', PDF_CONFIG.margin, yPosition);
  yPosition += 10;

  doc.setFontSize(PDF_CONFIG.fontSize.body);
  doc.setFont('helvetica', 'normal');
  doc.text(`Mill Name: ${batch.millName}`, PDF_CONFIG.margin, yPosition);
  yPosition += 7;
  doc.text(`Mill ID: ${batch.millId}`, PDF_CONFIG.margin, yPosition);
  yPosition += 7;
  doc.text(`Production Date: ${format(batch.productionDate, 'MMM dd, yyyy')}`, PDF_CONFIG.margin, yPosition);
  yPosition += 15;

  // Batch Details
  doc.setFontSize(PDF_CONFIG.fontSize.heading);
  doc.setFont('helvetica', 'bold');
  doc.text('Batch Details', PDF_CONFIG.margin, yPosition);
  yPosition += 10;

  doc.setFontSize(PDF_CONFIG.fontSize.body);
  doc.setFont('helvetica', 'normal');
  doc.text(`Commodity: ${COMMODITY_LABELS[batch.commodity as keyof typeof COMMODITY_LABELS] || batch.commodity}`, PDF_CONFIG.margin, yPosition);
  yPosition += 7;
  doc.text(`Input Weight: ${formatNumber(batch.inputWeight, 2)} kg`, PDF_CONFIG.margin, yPosition);
  yPosition += 7;
  doc.text(`Output Weight: ${formatNumber(batch.outputWeight, 2)} kg`, PDF_CONFIG.margin, yPosition);
  yPosition += 7;
  doc.text(`Fortification Level: ${batch.fortificationLevel}`, PDF_CONFIG.margin, yPosition);
  yPosition += 7;
  doc.text(`Premix Brand: ${batch.premixBrand}`, PDF_CONFIG.margin, yPosition);
  yPosition += 7;
  doc.text(`Premix Dosing Rate: ${formatNumber(batch.premixDosingRate, 4)} kg/MT`, PDF_CONFIG.margin, yPosition);
  yPosition += 15;

  // QC Status
  doc.setFontSize(PDF_CONFIG.fontSize.heading);
  doc.setFont('helvetica', 'bold');
  doc.text('Quality Control Status', PDF_CONFIG.margin, yPosition);
  yPosition += 10;

  doc.setFontSize(PDF_CONFIG.fontSize.body);
  doc.setFont('helvetica', 'normal');

  const statusColor =
    batch.qcStatus === 'PASS' || batch.qcStatus === 'EXCELLENT'
      ? PDF_CONFIG.headerColor
      : batch.qcStatus === 'MARGINAL'
      ? PDF_CONFIG.warningColor
      : PDF_CONFIG.dangerColor;

  doc.setTextColor(statusColor);
  doc.setFont('helvetica', 'bold');
  doc.text(`Status: ${batch.qcStatus}`, PDF_CONFIG.margin, yPosition);
  yPosition += 7;

  if (batch.complianceScore !== undefined) {
    doc.setTextColor(PDF_CONFIG.textColor);
    doc.setFont('helvetica', 'normal');
    doc.text(`Compliance Score: ${formatPercentage(batch.complianceScore / 100, true, 1)}`, PDF_CONFIG.margin, yPosition);
    yPosition += 15;
  } else {
    yPosition += 8;
  }

  // QC Test Results
  if (batch.qcResults && batch.qcResults.length > 0) {
    doc.setFontSize(PDF_CONFIG.fontSize.heading);
    doc.setTextColor(PDF_CONFIG.textColor);
    doc.setFont('helvetica', 'bold');
    doc.text('QC Test Results', PDF_CONFIG.margin, yPosition);
    yPosition += 10;

    doc.setFontSize(PDF_CONFIG.fontSize.body);
    doc.setFont('helvetica', 'normal');

    batch.qcResults.forEach((test) => {
      doc.text(`• ${test.testType}: ${test.result} (${test.status})`, PDF_CONFIG.margin + 5, yPosition);
      yPosition += 7;
    });
    yPosition += 8;
  }

  // QR Code
  try {
    const qrCodeDataURL = await generateBatchQRCode(
      {
        ...batch,
        qcStatus: batch.qcStatus,
      },
      'dataURL'
    );

    const pageWidth = doc.internal.pageSize.getWidth();
    const qrSize = 60;
    const qrX = pageWidth - PDF_CONFIG.margin - qrSize;
    const qrY = yPosition;

    doc.addImage(qrCodeDataURL as string, 'PNG', qrX, qrY, qrSize, qrSize);

    doc.setFontSize(PDF_CONFIG.fontSize.small);
    doc.setTextColor(PDF_CONFIG.mutedColor);
    doc.text('Scan for verification', qrX + qrSize / 2, qrY + qrSize + 7, { align: 'center' });
  } catch (error) {
    console.error('Error adding QR code to PDF:', error);
  }

  // Certificate Statement
  yPosition += 80;
  doc.setFontSize(PDF_CONFIG.fontSize.body);
  doc.setTextColor(PDF_CONFIG.textColor);
  doc.setFont('helvetica', 'italic');
  const pageWidth = doc.internal.pageSize.getWidth();
  const certText =
    'This certificate confirms that the above batch has been produced in accordance with food fortification standards and has passed quality control testing.';
  const splitText = doc.splitTextToSize(certText, pageWidth - 2 * PDF_CONFIG.margin);
  doc.text(splitText, PDF_CONFIG.margin, yPosition);

  addFooter(doc, 1);

  return doc.output('blob');
}

/**
 * Generate QC Test Report
 *
 * @param report - QC test report data
 * @returns Promise resolving to PDF blob
 */
export async function generateQCTestReport(report: {
  reportId: string;
  batchId: string;
  millName: string;
  testDate: Date;
  testedBy: string;
  tests: {
    testType: string;
    targetValue: number;
    actualValue: number;
    unit: string;
    status: string;
    variance: number;
  }[];
  overallStatus: string;
  notes?: string;
}): Promise<Blob> {
  const doc = new jsPDF();
  let yPosition = addHeader(doc, 'QUALITY CONTROL TEST REPORT', `Batch: ${report.batchId}`);

  // Report Information
  doc.setFontSize(PDF_CONFIG.fontSize.body);
  doc.setTextColor(PDF_CONFIG.mutedColor);
  doc.text(`Report ID: ${report.reportId}`, PDF_CONFIG.margin, yPosition);
  yPosition += 7;
  doc.text(`Test Date: ${format(report.testDate, 'MMM dd, yyyy HH:mm')}`, PDF_CONFIG.margin, yPosition);
  yPosition += 7;
  doc.text(`Mill: ${report.millName}`, PDF_CONFIG.margin, yPosition);
  yPosition += 7;
  doc.text(`Tested By: ${report.testedBy}`, PDF_CONFIG.margin, yPosition);
  yPosition += 20;

  // Test Results Table
  doc.setFontSize(PDF_CONFIG.fontSize.heading);
  doc.setTextColor(PDF_CONFIG.textColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Test Results', PDF_CONFIG.margin, yPosition);
  yPosition += 10;

  // Table headers
  doc.setFillColor(240, 240, 240);
  doc.rect(PDF_CONFIG.margin, yPosition, 170, 10, 'F');
  doc.setFontSize(PDF_CONFIG.fontSize.small);
  doc.setFont('helvetica', 'bold');
  doc.text('Test Type', PDF_CONFIG.margin + 2, yPosition + 7);
  doc.text('Target', PDF_CONFIG.margin + 60, yPosition + 7);
  doc.text('Actual', PDF_CONFIG.margin + 85, yPosition + 7);
  doc.text('Variance', PDF_CONFIG.margin + 110, yPosition + 7);
  doc.text('Status', PDF_CONFIG.margin + 140, yPosition + 7);
  yPosition += 12;

  // Table rows
  doc.setFont('helvetica', 'normal');
  report.tests.forEach((test) => {
    doc.setTextColor(PDF_CONFIG.textColor);
    doc.text(test.testType, PDF_CONFIG.margin + 2, yPosition + 5);
    doc.text(`${formatNumber(test.targetValue, 2)} ${test.unit}`, PDF_CONFIG.margin + 60, yPosition + 5);
    doc.text(`${formatNumber(test.actualValue, 2)} ${test.unit}`, PDF_CONFIG.margin + 85, yPosition + 5);
    doc.text(`${formatPercentage(test.variance, true, 1)}`, PDF_CONFIG.margin + 110, yPosition + 5);

    const statusColor =
      test.status === 'PASS' || test.status === 'EXCELLENT'
        ? PDF_CONFIG.headerColor
        : test.status === 'MARGINAL'
        ? PDF_CONFIG.warningColor
        : PDF_CONFIG.dangerColor;
    doc.setTextColor(statusColor);
    doc.text(test.status, PDF_CONFIG.margin + 140, yPosition + 5);

    yPosition += 10;
  });

  yPosition += 10;

  // Overall Status
  doc.setFontSize(PDF_CONFIG.fontSize.heading);
  doc.setTextColor(PDF_CONFIG.textColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Overall Status', PDF_CONFIG.margin, yPosition);
  yPosition += 10;

  const statusColor =
    report.overallStatus === 'PASS' || report.overallStatus === 'EXCELLENT'
      ? PDF_CONFIG.headerColor
      : report.overallStatus === 'MARGINAL'
      ? PDF_CONFIG.warningColor
      : PDF_CONFIG.dangerColor;

  doc.setFontSize(PDF_CONFIG.fontSize.subtitle);
  doc.setTextColor(statusColor);
  doc.text(report.overallStatus, PDF_CONFIG.margin, yPosition);
  yPosition += 15;

  // Notes
  if (report.notes) {
    doc.setFontSize(PDF_CONFIG.fontSize.heading);
    doc.setTextColor(PDF_CONFIG.textColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes', PDF_CONFIG.margin, yPosition);
    yPosition += 10;

    doc.setFontSize(PDF_CONFIG.fontSize.body);
    doc.setFont('helvetica', 'normal');
    const pageWidth = doc.internal.pageSize.getWidth();
    const splitNotes = doc.splitTextToSize(report.notes, pageWidth - 2 * PDF_CONFIG.margin);
    doc.text(splitNotes, PDF_CONFIG.margin, yPosition);
  }

  addFooter(doc, 1);

  return doc.output('blob');
}

/**
 * Generate Compliance Certificate
 *
 * @param compliance - Compliance audit data
 * @returns Promise resolving to PDF blob
 */
export async function generateComplianceCertificate(compliance: {
  auditId: string;
  millName: string;
  millId: string;
  auditDate: Date;
  auditor: string;
  score: number;
  category: string;
  validUntil: Date;
  strengths?: string[];
  improvements?: string[];
}): Promise<Blob> {
  const doc = new jsPDF();
  let yPosition = addHeader(doc, 'COMPLIANCE CERTIFICATE', 'Food Fortification Standards');

  // Certificate border
  doc.setDrawColor(PDF_CONFIG.headerColor);
  doc.setLineWidth(2);
  doc.rect(15, 15, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 30);

  // Mill Information
  doc.setFontSize(PDF_CONFIG.fontSize.subtitle);
  doc.setTextColor(PDF_CONFIG.textColor);
  doc.setFont('helvetica', 'bold');
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.text(compliance.millName, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  doc.setFontSize(PDF_CONFIG.fontSize.body);
  doc.setTextColor(PDF_CONFIG.mutedColor);
  doc.setFont('helvetica', 'normal');
  doc.text(`Mill ID: ${compliance.millId}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  // Compliance Score
  doc.setFontSize(PDF_CONFIG.fontSize.heading);
  doc.setTextColor(PDF_CONFIG.textColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Compliance Score', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  const scoreCategory = Object.values(COMPLIANCE_SCORE_CATEGORIES).find(
    (cat) => compliance.score >= cat.min && compliance.score <= cat.max
  );

  doc.setFontSize(48);
  doc.setTextColor(PDF_CONFIG.headerColor);
  doc.text(`${compliance.score}%`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  doc.setFontSize(PDF_CONFIG.fontSize.subtitle);
  doc.setTextColor(PDF_CONFIG.mutedColor);
  doc.text(scoreCategory?.label || compliance.category, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 25;

  // Audit Details
  doc.setFontSize(PDF_CONFIG.fontSize.body);
  doc.setTextColor(PDF_CONFIG.textColor);
  doc.text(`Audit Date: ${format(compliance.auditDate, 'MMM dd, yyyy')}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 7;
  doc.text(`Auditor: ${compliance.auditor}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 7;
  doc.text(`Valid Until: ${format(compliance.validUntil, 'MMM dd, yyyy')}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  // Strengths and Improvements
  if (compliance.strengths && compliance.strengths.length > 0) {
    doc.setFontSize(PDF_CONFIG.fontSize.heading);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Strengths', PDF_CONFIG.margin, yPosition);
    yPosition += 10;

    doc.setFontSize(PDF_CONFIG.fontSize.body);
    doc.setFont('helvetica', 'normal');
    compliance.strengths.forEach((strength) => {
      const splitText = doc.splitTextToSize(`• ${strength}`, pageWidth - 2 * PDF_CONFIG.margin - 5);
      doc.text(splitText, PDF_CONFIG.margin + 5, yPosition);
      yPosition += 7 * splitText.length;
    });
    yPosition += 8;
  }

  if (compliance.improvements && compliance.improvements.length > 0) {
    doc.setFontSize(PDF_CONFIG.fontSize.heading);
    doc.setFont('helvetica', 'bold');
    doc.text('Areas for Improvement', PDF_CONFIG.margin, yPosition);
    yPosition += 10;

    doc.setFontSize(PDF_CONFIG.fontSize.body);
    doc.setFont('helvetica', 'normal');
    compliance.improvements.forEach((improvement) => {
      const splitText = doc.splitTextToSize(`• ${improvement}`, pageWidth - 2 * PDF_CONFIG.margin - 5);
      doc.text(splitText, PDF_CONFIG.margin + 5, yPosition);
      yPosition += 7 * splitText.length;
    });
  }

  addFooter(doc, 1);

  return doc.output('blob');
}

/**
 * Generate Training Certificate
 *
 * @param training - Training completion data
 * @returns Promise resolving to PDF blob
 */
export async function generateTrainingCertificate(training: {
  certificateId: string;
  participantName: string;
  moduleName: string;
  completionDate: Date;
  score: number;
  duration: number;
  instructor?: string;
}): Promise<Blob> {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Decorative border
  doc.setDrawColor(PDF_CONFIG.headerColor);
  doc.setLineWidth(3);
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30);
  doc.setLineWidth(1);
  doc.rect(20, 20, pageWidth - 40, pageHeight - 40);

  let yPosition = 50;

  // Certificate Title
  doc.setFontSize(32);
  doc.setTextColor(PDF_CONFIG.headerColor);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICATE OF COMPLETION', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  // Subtitle
  doc.setFontSize(14);
  doc.setTextColor(PDF_CONFIG.mutedColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Food Fortification Training Program', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 30;

  // Participant Name
  doc.setFontSize(12);
  doc.setTextColor(PDF_CONFIG.textColor);
  doc.text('This is to certify that', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(training.participantName, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Module Information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('has successfully completed the training module', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 12;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF_CONFIG.headerColor);
  doc.text(training.moduleName, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  // Training Details
  doc.setFontSize(11);
  doc.setTextColor(PDF_CONFIG.textColor);
  doc.setFont('helvetica', 'normal');
  doc.text(`Completion Date: ${format(training.completionDate, 'MMMM dd, yyyy')}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;
  doc.text(`Score: ${training.score}%`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;
  doc.text(`Duration: ${training.duration} hours`, pageWidth / 2, yPosition, { align: 'center' });

  if (training.instructor) {
    yPosition += 8;
    doc.text(`Instructor: ${training.instructor}`, pageWidth / 2, yPosition, { align: 'center' });
  }

  // Certificate ID
  yPosition = pageHeight - 40;
  doc.setFontSize(9);
  doc.setTextColor(PDF_CONFIG.mutedColor);
  doc.text(`Certificate ID: ${training.certificateId}`, pageWidth / 2, yPosition, { align: 'center' });

  addFooter(doc, 1);

  return doc.output('blob');
}

/**
 * Generate Procurement RFP Document
 *
 * @param rfp - RFP data
 * @returns Promise resolving to PDF blob
 */
export async function generateRFPDocument(rfp: {
  rfpId: string;
  buyerName: string;
  buyerType: string;
  commodity: string;
  quantity: number;
  deliveryLocation: string;
  deliveryDeadline: Date;
  specifications: string;
  submissionDeadline: Date;
  contactEmail: string;
  contactPhone?: string;
}): Promise<Blob> {
  const doc = new jsPDF();
  let yPosition = addHeader(doc, 'REQUEST FOR PROPOSAL (RFP)', `RFP ID: ${rfp.rfpId}`);

  // Buyer Information
  doc.setFontSize(PDF_CONFIG.fontSize.heading);
  doc.setTextColor(PDF_CONFIG.textColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Buyer Information', PDF_CONFIG.margin, yPosition);
  yPosition += 10;

  doc.setFontSize(PDF_CONFIG.fontSize.body);
  doc.setFont('helvetica', 'normal');
  doc.text(`Organization: ${rfp.buyerName}`, PDF_CONFIG.margin, yPosition);
  yPosition += 7;
  doc.text(`Type: ${rfp.buyerType}`, PDF_CONFIG.margin, yPosition);
  yPosition += 7;
  doc.text(`Contact Email: ${rfp.contactEmail}`, PDF_CONFIG.margin, yPosition);
  yPosition += 7;
  if (rfp.contactPhone) {
    doc.text(`Contact Phone: ${rfp.contactPhone}`, PDF_CONFIG.margin, yPosition);
    yPosition += 7;
  }
  yPosition += 10;

  // Procurement Details
  doc.setFontSize(PDF_CONFIG.fontSize.heading);
  doc.setFont('helvetica', 'bold');
  doc.text('Procurement Details', PDF_CONFIG.margin, yPosition);
  yPosition += 10;

  doc.setFontSize(PDF_CONFIG.fontSize.body);
  doc.setFont('helvetica', 'normal');
  doc.text(`Commodity: ${COMMODITY_LABELS[rfp.commodity as keyof typeof COMMODITY_LABELS] || rfp.commodity}`, PDF_CONFIG.margin, yPosition);
  yPosition += 7;
  doc.text(`Quantity: ${formatNumber(rfp.quantity, 0)} MT`, PDF_CONFIG.margin, yPosition);
  yPosition += 7;
  doc.text(`Delivery Location: ${rfp.deliveryLocation}`, PDF_CONFIG.margin, yPosition);
  yPosition += 7;
  doc.text(`Delivery Deadline: ${format(rfp.deliveryDeadline, 'MMM dd, yyyy')}`, PDF_CONFIG.margin, yPosition);
  yPosition += 15;

  // Specifications
  doc.setFontSize(PDF_CONFIG.fontSize.heading);
  doc.setFont('helvetica', 'bold');
  doc.text('Specifications & Requirements', PDF_CONFIG.margin, yPosition);
  yPosition += 10;

  doc.setFontSize(PDF_CONFIG.fontSize.body);
  doc.setFont('helvetica', 'normal');
  const pageWidth = doc.internal.pageSize.getWidth();
  const splitSpecs = doc.splitTextToSize(rfp.specifications, pageWidth - 2 * PDF_CONFIG.margin);
  doc.text(splitSpecs, PDF_CONFIG.margin, yPosition);
  yPosition += 7 * splitSpecs.length + 10;

  // Submission Information
  doc.setFontSize(PDF_CONFIG.fontSize.heading);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF_CONFIG.dangerColor);
  doc.text('SUBMISSION DEADLINE', PDF_CONFIG.margin, yPosition);
  yPosition += 10;

  doc.setFontSize(PDF_CONFIG.fontSize.subtitle);
  doc.text(format(rfp.submissionDeadline, 'MMMM dd, yyyy HH:mm'), PDF_CONFIG.margin, yPosition);

  addFooter(doc, 1);

  return doc.output('blob');
}

/**
 * Download PDF Blob as File
 *
 * @param blob - PDF blob
 * @param filename - Filename for download
 */
export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

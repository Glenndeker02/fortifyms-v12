import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer'

// Define styles for the certificate
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
  },
  border: {
    border: '8px solid #1e40af',
    padding: 30,
    height: '100%',
    position: 'relative',
  },
  innerBorder: {
    border: '2px solid #60a5fa',
    padding: 40,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 10,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 5,
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  },
  presentedTo: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 10,
  },
  userName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 20,
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: 10,
    minWidth: 300,
  },
  completionText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 5,
    lineHeight: 1.6,
  },
  courseName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    marginTop: 10,
    marginBottom: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 30,
    marginBottom: 20,
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 40,
    borderTop: '1px solid #e2e8f0',
    paddingTop: 20,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  signatureItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '40%',
  },
  signatureLine: {
    borderTop: '1px solid #94a3b8',
    width: '100%',
    marginBottom: 5,
  },
  signatureLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  verificationSection: {
    marginTop: 20,
    textAlign: 'center',
  },
  verificationCode: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  verificationText: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 5,
  },
  seal: {
    position: 'absolute',
    top: 60,
    right: 60,
    width: 80,
    height: 80,
    borderRadius: 40,
    border: '3px solid #10b981',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
  },
  sealText: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scoreSection: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 5,
  },
  scoreText: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
  },
})

interface TrainingCertificatePDFProps {
  userName: string
  courseName: string
  completionDate: string
  score: number
  verificationCode: string
  courseId: string
  duration?: string
  instructor?: string
}

export const TrainingCertificatePDF: React.FC<TrainingCertificatePDFProps> = ({
  userName,
  courseName,
  completionDate,
  score,
  verificationCode,
  courseId,
  duration,
  instructor,
}) => {
  const formattedDate = new Date(completionDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.border}>
          <View style={styles.innerBorder}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Certificate of Completion</Text>
              <Text style={styles.subtitle}>FortifyMIS Training Program</Text>
              <Text style={styles.subtitle}>Food Fortification Excellence</Text>
            </View>

            {/* Completion Seal */}
            <View style={styles.seal}>
              <Text style={styles.sealText}>COMPLETED</Text>
            </View>

            {/* Main Content */}
            <View style={styles.content}>
              <Text style={styles.presentedTo}>This certificate is proudly presented to</Text>
              <Text style={styles.userName}>{userName}</Text>

              <Text style={styles.completionText}>
                for successfully completing the training course
              </Text>
              <Text style={styles.courseName}>{courseName}</Text>

              {/* Score Section */}
              {score > 0 && (
                <View style={styles.scoreSection}>
                  <Text style={styles.scoreText}>
                    Final Score: {score}% - {score >= 90 ? 'Excellent' : score >= 80 ? 'Good' : 'Pass'}
                  </Text>
                </View>
              )}

              {/* Details Row */}
              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Date of Completion</Text>
                  <Text style={styles.detailValue}>{formattedDate}</Text>
                </View>
                {duration && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Course Duration</Text>
                    <Text style={styles.detailValue}>{duration}</Text>
                  </View>
                )}
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Course ID</Text>
                  <Text style={styles.detailValue}>{courseId}</Text>
                </View>
              </View>
            </View>

            {/* Footer with signatures */}
            <View style={styles.footer}>
              <View style={styles.signatureRow}>
                <View style={styles.signatureItem}>
                  <View style={styles.signatureLine} />
                  <Text style={styles.signatureLabel}>Program Manager</Text>
                  <Text style={styles.signatureLabel}>FortifyMIS</Text>
                </View>
                <View style={styles.signatureItem}>
                  <View style={styles.signatureLine} />
                  <Text style={styles.signatureLabel}>
                    {instructor || 'Training Coordinator'}
                  </Text>
                  <Text style={styles.signatureLabel}>FortifyMIS</Text>
                </View>
              </View>

              {/* Verification Section */}
              <View style={styles.verificationSection}>
                <Text style={styles.verificationCode}>
                  Verification Code: {verificationCode}
                </Text>
                <Text style={styles.verificationText}>
                  Verify this certificate at fortifyms.org/verify or scan the QR code
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

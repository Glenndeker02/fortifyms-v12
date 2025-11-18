import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #1e40af',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 5,
  },
  section: {
    marginTop: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
    backgroundColor: '#f1f5f9',
    padding: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: '40%',
    fontWeight: 'bold',
    color: '#475569',
  },
  value: {
    width: '60%',
    color: '#0f172a',
  },
  scoreBox: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f0fdf4',
    border: '2px solid #10b981',
    borderRadius: 5,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10b981',
    textAlign: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#059669',
    textAlign: 'center',
    marginTop: 5,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    padding: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1px solid #e2e8f0',
  },
  tableCol1: { width: '10%' },
  tableCol2: { width: '40%' },
  tableCol3: { width: '20%' },
  tableCol4: { width: '15%' },
  tableCol5: { width: '15%' },
  redFlag: {
    backgroundColor: '#fee2e2',
    border: '1px solid #ef4444',
    padding: 8,
    marginBottom: 8,
    borderRadius: 3,
  },
  redFlagTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 3,
  },
  redFlagText: {
    fontSize: 9,
    color: '#7f1d1d',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: '1px solid #e2e8f0',
    paddingTop: 10,
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
  },
})

interface ComplianceReportPDFProps {
  audit: any
  mill: any
  template: any
  scoringResult: any
  auditor: any
  reviewer?: any
}

export const ComplianceReportPDF: React.FC<ComplianceReportPDFProps> = ({
  audit,
  mill,
  template,
  scoringResult,
  auditor,
  reviewer,
}) => {
  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return '#10b981'
    if (percentage >= 75) return '#84cc16'
    if (percentage >= 60) return '#f59e0b'
    return '#ef4444'
  }

  const formatDate = (date: any) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Compliance Audit Report</Text>
          <Text style={styles.subtitle}>FortifyMIS Certification System</Text>
        </View>

        {/* Mill Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mill Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Mill Name:</Text>
            <Text style={styles.value}>{mill.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Registration Number:</Text>
            <Text style={styles.value}>{mill.registrationNumber || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Location:</Text>
            <Text style={styles.value}>
              {mill.region}, {mill.country}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Contact:</Text>
            <Text style={styles.value}>
              {mill.phone} | {mill.email}
            </Text>
          </View>
        </View>

        {/* Audit Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audit Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Audit Date:</Text>
            <Text style={styles.value}>{formatDate(audit.auditDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Audit Type:</Text>
            <Text style={styles.value}>{audit.auditType}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Template:</Text>
            <Text style={styles.value}>
              {template.name} v{template.version}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Commodity:</Text>
            <Text style={styles.value}>{template.commodity}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Auditor:</Text>
            <Text style={styles.value}>{auditor.name}</Text>
          </View>
          {reviewer && (
            <View style={styles.row}>
              <Text style={styles.label}>Reviewer:</Text>
              <Text style={styles.value}>{reviewer.name}</Text>
            </View>
          )}
        </View>

        {/* Overall Score */}
        <View
          style={[
            styles.scoreBox,
            {
              backgroundColor:
                scoringResult.overallPercentage >= 75 ? '#f0fdf4' : '#fee2e2',
              borderColor: getScoreColor(scoringResult.overallPercentage),
            },
          ]}
        >
          <Text
            style={[
              styles.scoreText,
              { color: getScoreColor(scoringResult.overallPercentage) },
            ]}
          >
            {scoringResult.overallPercentage.toFixed(1)}%
          </Text>
          <Text
            style={[
              styles.scoreLabel,
              { color: getScoreColor(scoringResult.overallPercentage) },
            ]}
          >
            Overall Compliance Score - {scoringResult.category}
          </Text>
          <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-around' }}>
            <View>
              <Text style={{ fontSize: 9, color: '#64748b' }}>Points Achieved</Text>
              <Text style={{ fontSize: 14, fontWeight: 'bold' }}>
                {scoringResult.achievedPoints}/{scoringResult.totalPoints}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 9, color: '#64748b' }}>Critical Failures</Text>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#ef4444' }}>
                {scoringResult.criticalFailures}
              </Text>
            </View>
          </View>
        </View>

        {/* Section Scores */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Section-wise Performance</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCol1}>#</Text>
              <Text style={styles.tableCol2}>Section</Text>
              <Text style={styles.tableCol3}>Score</Text>
              <Text style={styles.tableCol4}>Items</Text>
              <Text style={styles.tableCol5}>Status</Text>
            </View>
            {scoringResult.sectionScores.map((section: any, index: number) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCol1}>{index + 1}</Text>
                <Text style={styles.tableCol2}>{section.sectionName}</Text>
                <Text style={styles.tableCol3}>{section.percentage.toFixed(1)}%</Text>
                <Text style={styles.tableCol4}>
                  {section.compliantItems}/{section.itemCount}
                </Text>
                <Text style={styles.tableCol5}>
                  {section.passed ? 'PASS' : 'FAIL'}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Page>

      {/* Page 2: Red Flags and Recommendations */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Non-Compliance Issues & Recommendations</Text>
        </View>

        {scoringResult.redFlags.length === 0 ? (
          <View style={styles.section}>
            <Text style={{ color: '#10b981', fontSize: 14, textAlign: 'center' }}>
              ✓ No compliance issues identified. Excellent performance!
            </Text>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={{ marginBottom: 10, fontWeight: 'bold' }}>
              Total Issues: {scoringResult.redFlags.length} (Critical:{' '}
              {scoringResult.criticalFailures}, Major: {scoringResult.majorIssues}, Minor:{' '}
              {scoringResult.minorIssues})
            </Text>

            {scoringResult.redFlags.map((flag: any, index: number) => (
              <View key={index} style={styles.redFlag}>
                <Text style={styles.redFlagTitle}>
                  [{flag.criticality}] {flag.question}
                </Text>
                <Text style={styles.redFlagText}>Issue: {flag.issue}</Text>
                <Text style={[styles.redFlagText, { marginTop: 3, fontWeight: 'bold' }]}>
                  Recommendation: {flag.recommendation}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Executive Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <Text style={{ marginBottom: 5 }}>
            This audit was conducted on {formatDate(audit.auditDate)} at {mill.name}.
          </Text>
          <Text style={{ marginBottom: 5 }}>
            The mill achieved an overall compliance score of{' '}
            {scoringResult.overallPercentage.toFixed(1)}%, which is classified as{' '}
            {scoringResult.category}.
          </Text>
          {scoringResult.criticalFailures > 0 && (
            <Text style={{ marginBottom: 5, color: '#ef4444', fontWeight: 'bold' }}>
              ATTENTION: {scoringResult.criticalFailures} critical failure(s) identified.
              Immediate corrective action required.
            </Text>
          )}
          <Text>
            {scoringResult.category === 'EXCELLENT' &&
              'The mill demonstrates exemplary compliance with fortification standards.'}
            {scoringResult.category === 'GOOD' &&
              'The mill shows good compliance with minor areas for improvement.'}
            {scoringResult.category === 'NEEDS_IMPROVEMENT' &&
              'The mill requires improvements in several areas to meet certification standards.'}
            {scoringResult.category === 'NON_COMPLIANT' &&
              'The mill does not meet minimum compliance requirements and must undertake significant corrective actions.'}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            This report was generated by FortifyMIS on {formatDate(new Date())}
          </Text>
          <Text>Report ID: {audit.id}</Text>
        </View>
      </Page>
    </Document>
  )
}

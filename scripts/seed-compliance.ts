import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const complianceTemplates = [
  {
    name: 'Fortified Rice Production Compliance',
    commodity: 'Rice',
    country: 'Kenya',
    region: 'East Africa',
    standardReference: 'Kenya Bureau of Standards KS 05-2023',
    certificationType: 'INITIAL',
    sections: {
      sections: [
        {
          id: 'premix_storage',
          title: 'Section 1: Premix Storage & Handling',
          items: [
            {
              id: 'premix_temp',
              question: 'Is the premix stored in a cool, dry location away from direct sunlight?',
              type: 'yes_no',
              criticality: 'CRITICAL',
              weight: 10,
              evidenceRequired: true,
              help: 'Premix should be stored below 25°C in a dry environment'
            },
            {
              id: 'premix_labeling',
              question: 'Are all premix containers clearly labeled with product name, batch number, and expiry date?',
              type: 'yes_no',
              criticality: 'MAJOR',
              weight: 5,
              evidenceRequired: true,
              help: 'Check that all containers have proper labeling'
            },
            {
              id: 'premix_fumigation',
              question: 'Is the storage area protected from pests and insects?',
              type: 'yes_no',
              criticality: 'CRITICAL',
              weight: 10,
              evidenceRequired: false,
              help: 'Ensure proper pest control measures are in place'
            }
          ]
        },
        {
          id: 'dosing_equipment',
          title: 'Section 2: Dosing Equipment',
          items: [
            {
              id: 'doser_calibration',
              question: 'Is the doser calibrated within the last 90 days?',
              type: 'yes_no',
              criticality: 'CRITICAL',
              weight: 10,
              evidenceRequired: true,
              help: 'Check calibration certificate and date'
            },
            {
              id: 'doser_accuracy',
              question: 'What is the current doser accuracy (%)?',
              type: 'numeric',
              unit: '%',
              target: 98,
              tolerance: 2,
              criticality: 'CRITICAL',
              weight: 10,
              evidenceRequired: true,
              help: 'Measure actual output vs expected output'
            },
            {
              id: 'doser_maintenance',
              question: 'Is preventive maintenance performed regularly on dosing equipment?',
              type: 'yes_no',
              criticality: 'MAJOR',
              weight: 5,
              evidenceRequired: true,
              help: 'Check maintenance logs and schedules'
            }
          ]
        },
        {
          id: 'mixing_blending',
          title: 'Section 3: Mixing & Blending',
          items: [
            {
              id: 'mixing_time',
              question: 'What is the mixing time (minutes)?',
              type: 'numeric',
              unit: 'minutes',
              target: 10,
              tolerance: 2,
              criticality: 'MAJOR',
              weight: 5,
              evidenceRequired: false,
              help: 'Ensure adequate mixing time for uniform distribution'
            },
            {
              id: 'mixing_uniformity',
              question: 'Has mixing uniformity been tested in the last 30 days?',
              type: 'yes_no',
              criticality: 'MAJOR',
              weight: 5,
              evidenceRequired: true,
              help: 'Check uniformity test results'
            }
          ]
        },
        {
          id: 'quality_control',
          title: 'Section 4: Quality Control',
          items: [
            {
              id: 'qc_frequency',
              question: 'Are QC tests performed on every batch?',
              type: 'yes_no',
              criticality: 'CRITICAL',
              weight: 10,
              evidenceRequired: true,
              help: 'Verify QC testing schedule and records'
            },
            {
              id: 'qc_records',
              question: 'Are QC records maintained for minimum 12 months?',
              type: 'yes_no',
              criticality: 'MAJOR',
              weight: 5,
              evidenceRequired: true,
              help: 'Check record retention policy'
            }
          ]
        },
        {
          id: 'record_keeping',
          title: 'Section 5: Record Keeping',
          items: [
            {
              id: 'batch_records',
              question: 'Are complete batch records maintained for all production?',
              type: 'yes_no',
              criticality: 'CRITICAL',
              weight: 10,
              evidenceRequired: true,
              help: 'Verify batch record completeness'
            },
            {
              id: 'traceability',
              question: 'Is traceability maintained from raw material to finished product?',
              type: 'yes_no',
              criticality: 'MAJOR',
              weight: 5,
              evidenceRequired: true,
              help: 'Check traceability documentation'
            }
          ]
        },
        {
          id: 'facility_hygiene',
          title: 'Section 6: Facility & Hygiene',
          items: [
            {
              id: 'facility_cleanliness',
              question: 'Is the production facility maintained in a clean and sanitary condition?',
              type: 'yes_no',
              criticality: 'MAJOR',
              weight: 5,
              evidenceRequired: true,
              help: 'Inspect facility cleanliness'
            },
            {
              id: 'personnel_hygiene',
              question: 'Do all personnel follow proper hygiene protocols?',
              type: 'yes_no',
              criticality: 'MAJOR',
              weight: 5,
              evidenceRequired: false,
              help: 'Check hygiene training records'
            }
          ]
        },
        {
          id: 'packaging_labeling',
          title: 'Section 7: Packaging & Labeling',
          items: [
            {
              id: 'fortification_label',
              question: 'Are all products properly labeled as fortified?',
              type: 'yes_no',
              criticality: 'CRITICAL',
              weight: 10,
              evidenceRequired: true,
              help: 'Verify product labeling compliance'
            },
            {
              id: 'nutrient_content',
              question: 'Does the label accurately declare nutrient content?',
              type: 'yes_no',
              criticality: 'CRITICAL',
              weight: 10,
              evidenceRequired: true,
              help: 'Check label against actual nutrient content'
            }
          ]
        }
      ]
    },
    scoringRules: {
      passingScore: 75,
      criticalFailureThreshold: 1,
      sectionThresholds: {
        'premix_storage': 80,
        'dosing_equipment': 90,
        'mixing_blending': 70,
        'quality_control': 85,
        'record_keeping': 80,
        'facility_hygiene': 70,
        'packaging_labeling': 90
      },
      scoringWeights: {
        CRITICAL: 10,
        MAJOR: 5,
        MINOR: 2
      }
    }
  },
  {
    name: 'Fortified Maize Flour Compliance',
    commodity: 'Maize',
    country: 'Kenya',
    region: 'East Africa',
    standardReference: 'Kenya Bureau of Standards KS 06-2023',
    certificationType: 'INITIAL',
    sections: {
      sections: [
        {
          id: 'premix_handling',
          title: 'Section 1: Premix Handling',
          items: [
            {
              id: 'premix_storage_temp',
              question: 'Is premix storage temperature monitored and controlled?',
              type: 'yes_no',
              criticality: 'CRITICAL',
              weight: 10,
              evidenceRequired: true,
              help: 'Temperature should be maintained below 25°C'
            }
          ]
        },
        {
          id: 'milling_process',
          title: 'Section 2: Milling Process',
          items: [
            {
              id: 'milling_efficiency',
              question: 'Is milling efficiency within acceptable range?',
              type: 'yes_no',
              criticality: 'MAJOR',
              weight: 5,
              evidenceRequired: false,
              help: 'Check milling output and quality'
            }
          ]
        }
      ]
    },
    scoringRules: {
      passingScore: 75,
      criticalFailureThreshold: 1,
      sectionThresholds: {
        'premix_handling': 80,
        'milling_process': 70
      },
      scoringWeights: {
        CRITICAL: 10,
        MAJOR: 5,
        MINOR: 2
      }
    }
  }
];

async function seedComplianceTemplates() {
  try {
    console.log('Seeding compliance templates...');

    for (const template of complianceTemplates) {
      await prisma.complianceTemplate.create({
        data: {
          name: template.name,
          version: '1.0',
          commodity: template.commodity,
          country: template.country,
          region: template.region,
          standardReference: template.standardReference,
          certificationType: template.certificationType,
          sections: JSON.stringify(template.sections),
          scoringRules: JSON.stringify(template.scoringRules),
          isActive: true
        }
      });
    }

    console.log('Compliance templates seeded successfully!');
  } catch (error) {
    console.error('Error seeding compliance templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedComplianceTemplates();
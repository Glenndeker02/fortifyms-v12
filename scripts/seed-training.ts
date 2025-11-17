import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sampleCourses = [
  {
    title: 'Rice Parboiling Optimization',
    description: 'Learn best practices for optimizing rice parboiling processes including soaking, steaming, and drying parameters.',
    category: 'Process',
    difficulty: 'Intermediate',
    duration: 30,
    language: 'en'
  },
  {
    title: 'Volumetric Doser Calibration',
    description: 'Master the calibration procedures for volumetric dosers to ensure accurate fortification levels.',
    category: 'Equipment',
    difficulty: 'Beginner',
    duration: 15,
    language: 'en'
  },
  {
    title: 'Premix Handling and Storage',
    description: 'Proper procedures for handling, storing, and managing premix to maintain quality and prevent contamination.',
    category: 'Process',
    difficulty: 'Beginner',
    duration: 20,
    language: 'en'
  },
  {
    title: 'Quality Control Sampling Techniques',
    description: 'Learn proper sampling methods for quality control testing and analysis of fortified products.',
    category: 'QA',
    difficulty: 'Intermediate',
    duration: 25,
    language: 'en'
  },
  {
    title: 'Advanced Dosing Calibration',
    description: 'Advanced techniques for calibrating and troubleshooting complex dosing systems.',
    category: 'Equipment',
    difficulty: 'Advanced',
    duration: 45,
    language: 'en'
  },
  {
    title: 'Understanding Fortification Standards',
    description: 'Comprehensive overview of national and international fortification standards and compliance requirements.',
    category: 'Compliance',
    difficulty: 'Intermediate',
    duration: 35,
    language: 'en'
  },
  {
    title: 'Mixing Uniformity Verification',
    description: 'Techniques for verifying and ensuring uniform mixing of premix in food products.',
    category: 'QA',
    difficulty: 'Intermediate',
    duration: 30,
    language: 'en'
  },
  {
    title: 'Batch Record Documentation',
    description: 'Best practices for maintaining accurate and comprehensive batch records for compliance.',
    category: 'Compliance',
    difficulty: 'Beginner',
    duration: 20,
    language: 'en'
  }
];

const sampleModules = [
  {
    courseId: 1, // Rice Parboiling Optimization
    modules: [
      { title: 'Introduction to Parboiling', content: 'Overview of parboiling process', order: 1 },
      { title: 'Soaking Process Parameters', content: 'Optimal soaking conditions', order: 2 },
      { title: 'Steaming Best Practices', content: 'Steam pressure and time management', order: 3 },
      { title: 'Drying Techniques', content: 'Efficient drying methods', order: 4 }
    ]
  },
  {
    courseId: 2, // Volumetric Doser Calibration
    modules: [
      { title: 'Doser Components', content: 'Understanding doser parts', order: 1 },
      { title: 'Calibration Procedures', content: 'Step-by-step calibration', order: 2 },
      { title: 'Troubleshooting', content: 'Common issues and solutions', order: 3 }
    ]
  }
];

const sampleQuizzes = [
  {
    moduleId: 1,
    question: 'What is the optimal soaking temperature for rice parboiling?',
    type: 'MULTIPLE_CHOICE',
    options: '["60-65°C", "65-75°C", "75-85°C", "85-95°C"]',
    correctAnswer: '65-75°C',
    points: 1,
    order: 1
  },
  {
    moduleId: 1,
    question: 'Proper soaking time typically ranges from 4-8 hours.',
    type: 'TRUE_FALSE',
    options: null,
    correctAnswer: 'true',
    points: 1,
    order: 2
  }
];

async function seedTrainingData() {
  try {
    console.log('Seeding training data...');

    // Create courses
    for (const course of sampleCourses) {
      await prisma.trainingCourse.create({
        data: course
      });
    }
    console.log('Created training courses');

    // Create modules
    for (const courseModules of sampleModules) {
      const course = await prisma.trainingCourse.findFirst({
        where: { title: sampleCourses[courseModules.courseId - 1].title }
      });

      if (course) {
        for (const module of courseModules.modules) {
          await prisma.trainingModule.create({
            data: {
              ...module,
              courseId: course.id
            }
          });
        }
      }
    }
    console.log('Created training modules');

    // Create quizzes
    for (const quiz of sampleQuizzes) {
      const module = await prisma.trainingModule.findFirst({
        where: { title: quiz.moduleId === 1 ? 'Introduction to Parboiling' : 'Doser Components' }
      });

      if (module) {
        await prisma.quiz.create({
          data: {
            ...quiz,
            moduleId: module.id
          }
        });
      }
    }
    console.log('Created quizzes');

    console.log('Training data seeded successfully!');
  } catch (error) {
    console.error('Error seeding training data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTrainingData();
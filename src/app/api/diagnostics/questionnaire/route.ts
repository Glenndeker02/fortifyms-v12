import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { category, subcategory, cropType, equipmentType } = await request.json();

    // Sample questionnaire templates based on category
    const questionnaires = {
      rice_parboiling: {
        soaking: {
          title: 'Rice Parboiling - Soaking Process Diagnostic',
          questions: [
            {
              id: 'soak_temp',
              type: 'numeric',
              question: 'Enter soaking bath temperature in °C:',
              unit: '°C',
              expectedRange: { min: 65, max: 75 },
              help: 'Measure water temperature at multiple points in the soaking tank',
              required: true,
              branching: {
                'out_of_range': {
                  condition: 'value < 65 || value > 75',
                  nextQuestions: ['temp_alarm_check', 'heating_system_check']
                }
              }
            },
            {
              id: 'soak_time',
              type: 'numeric',
              question: 'Enter soaking time in hours:',
              unit: 'hours',
              expectedRange: { min: 4, max: 8 },
              help: 'Total time from when rice enters to when it leaves soaking tank',
              required: true,
              branching: {
                'insufficient': {
                  condition: 'value < 4',
                  nextQuestions: ['bottleneck_analysis', 'capacity_planning']
                },
                'excessive': {
                  condition: 'value > 8',
                  nextQuestions: ['efficiency_analysis', 'quality_impact']
                }
              }
            },
            {
              id: 'water_quality',
              type: 'dropdown',
              question: 'Select water quality status:',
              options: ['Clear', 'Slightly cloudy', 'Cloudy', 'Very cloudy'],
              help: 'Visual assessment of water clarity',
              required: true,
              branching: {
                'poor_quality': {
                  condition: 'value === "Cloudy" || value === "Very cloudy"',
                  nextQuestions: ['water_source_check', 'filtration_system']
                }
              }
            },
            {
              id: 'uniform_soaking',
              type: 'yes_no',
              question: 'Is soaking uniform across all rice batches?',
              help: 'Check if all rice receives consistent soaking treatment',
              required: true,
              branching: {
                'non_uniform': {
                  condition: 'value === "no"',
                  nextQuestions: ['mixing_mechanism', 'tank_design', 'circulation_pump']
                }
              }
            },
            {
              id: 'temp_alarm_check',
              type: 'yes_no',
              question: 'Are temperature alarms functioning properly?',
              help: 'Test alarm system for temperature deviations',
              required: false,
              conditional: true
            },
            {
              id: 'heating_system_check',
              type: 'dropdown',
              question: 'Heating system status:',
              options: ['Operating normally', 'Intermittent issues', 'Not functioning', 'Needs maintenance'],
              help: 'Assess heating system performance',
              required: false,
              conditional: true
            },
            {
              id: 'bottleneck_analysis',
              type: 'dropdown',
              question: 'Identify bottleneck cause:',
              options: ['Limited tank capacity', 'Slow drainage', 'Insufficient water supply', 'Process scheduling'],
              help: 'Root cause analysis for insufficient soaking time',
              required: false,
              conditional: true
            }
          ]
        },
        steaming: {
          title: 'Rice Parboiling - Steaming Process Diagnostic',
          questions: [
            {
              id: 'steam_pressure',
              type: 'numeric',
              question: 'Enter steaming pressure in PSI:',
              unit: 'PSI',
              expectedRange: { min: 10, max: 15 },
              help: 'Measure pressure gauge on steaming vessel',
              required: true
            },
            {
              id: 'steam_time',
              type: 'numeric',
              question: 'Enter steaming duration in minutes:',
              unit: 'minutes',
              expectedRange: { min: 15, max: 25 },
              help: 'Time from steam introduction to rice discharge',
              required: true
            }
          ]
        }
      },
      doser_calibration: {
        volumetric: {
          title: 'Volumetric Doser Calibration Diagnostic',
          questions: [
            {
              id: 'doser_type',
              type: 'dropdown',
              question: 'Select doser type:',
              options: ['Volumetric cup', 'Rotary valve', 'Auger feeder'],
              help: 'Identify the specific type of volumetric doser',
              required: true
            },
            {
              id: 'calibration_test_weight',
              type: 'numeric',
              question: 'Enter calibration test weight (g):',
              unit: 'g',
              expectedRange: { min: 95, max: 105 },
              help: 'Collect doser output for 1 minute and weigh',
              required: true
            },
            {
              id: 'repeatability_test',
              type: 'numeric',
              question: 'Enter repeatability variation (%):',
              unit: '%',
              expectedRange: { min: 0, max: 5 },
              help: 'Run 3 tests and calculate variation',
              required: true
            }
          ]
        }
      }
    };

    const selectedQuestionnaire = questionnaires[category]?.[subcategory];
    
    if (!selectedQuestionnaire) {
      return NextResponse.json(
        { error: 'Questionnaire not found for selected category/subcategory' },
        { status: 404 }
      );
    }

    // Create diagnostic result entry
    const diagnosticResult = await db.diagnosticResult.create({
      data: {
        userId: session.user.id,
        category,
        subcategory,
        status: 'IN_PROGRESS',
        progress: 0,
        currentStep: 0,
        totalSteps: selectedQuestionnaire.questions.length,
        responses: JSON.stringify({}),
        result: 'IN_PROGRESS'
      }
    });

    return NextResponse.json({
      diagnosticId: diagnosticResult.id,
      questionnaire: selectedQuestionnaire
    });
  } catch (error) {
    console.error('Error creating questionnaire:', error);
    return NextResponse.json(
      { error: 'Failed to create questionnaire' },
      { status: 500 }
    );
  }
}
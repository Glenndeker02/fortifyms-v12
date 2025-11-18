import { scheduledReportsManager } from '@/lib/scheduledReports';

describe('ScheduledReportsManager', () => {
  const mockSchedule = {
    id: 'test-schedule-1',
    reportName: 'Test Report',
    frequency: 'daily' as const,
    recipients: ['test@example.com'],
    format: ['pdf' as const],
    sections: [],
    enabled: true,
  };

  afterEach(() => {
    // Clean up schedules after each test
    scheduledReportsManager.cancelSchedule(mockSchedule.id);
  });

  it('should schedule a report', () => {
    scheduledReportsManager.scheduleReport(mockSchedule);
    const activeSchedules = scheduledReportsManager.getActiveSchedules();
    expect(activeSchedules).toContain(mockSchedule.id);
  });

  it('should cancel a scheduled report', () => {
    scheduledReportsManager.scheduleReport(mockSchedule);
    scheduledReportsManager.cancelSchedule(mockSchedule.id);
    const activeSchedules = scheduledReportsManager.getActiveSchedules();
    expect(activeSchedules).not.toContain(mockSchedule.id);
  });

  it('should replace existing schedule when rescheduling', () => {
    scheduledReportsManager.scheduleReport(mockSchedule);
    scheduledReportsManager.scheduleReport({
      ...mockSchedule,
      frequency: 'weekly',
    });
    const activeSchedules = scheduledReportsManager.getActiveSchedules();
    expect(activeSchedules.length).toBe(1);
  });

  it('should return list of active schedules', () => {
    const schedule2 = { ...mockSchedule, id: 'test-schedule-2' };
    scheduledReportsManager.scheduleReport(mockSchedule);
    scheduledReportsManager.scheduleReport(schedule2);

    const activeSchedules = scheduledReportsManager.getActiveSchedules();
    expect(activeSchedules).toHaveLength(2);
    expect(activeSchedules).toContain(mockSchedule.id);
    expect(activeSchedules).toContain(schedule2.id);

    // Cleanup
    scheduledReportsManager.cancelSchedule(schedule2.id);
  });
});

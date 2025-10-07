import { MaintenanceMetrics, TimeRange } from '../types';
import { generateMaintenanceMetrics } from '../demo/generators';

const isDemoMode = () => process.env.NEXT_PUBLIC_APP_DEMO_MODE === 'true';

interface MaintenanceParams {
  plantId?: string | null;
  lineIds?: string[] | null;
  range: TimeRange['range'];
}

export async function getMttrMtbf(params: MaintenanceParams): Promise<MaintenanceMetrics[]> {
  if (isDemoMode()) return generateMaintenanceMetrics();
  try {
    return generateMaintenanceMetrics();
  } catch (err) {
    console.warn('Error fetching maintenance metrics, using demo:', err);
    return generateMaintenanceMetrics();
  }
}


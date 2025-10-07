import { Insight, PlantKpis } from '../types';

export async function getInsights(kpis: PlantKpis): Promise<Insight[]> {
  const insights: Insight[] = [];

  // Goal attainment insight
  if (kpis.goalAttainmentPct < 60) {
    insights.push({
      id: 'goal-low',
      type: 'warning',
      title: `Goal attainment at ${kpis.goalAttainmentPct}%`,
      description: 'Review changeover procedures and material staging to reduce speed variations',
      action: {
        label: 'View Line Speed',
        href: '/operations/line-speed',
      },
    });
  } else if (kpis.goalAttainmentPct >= 85) {
    insights.push({
      id: 'goal-high',
      type: 'success',
      title: `Excellent goal attainment: ${kpis.goalAttainmentPct}%`,
      description: 'Strong performance - maintain current operating procedures',
    });
  }

  // Downtime insight
  if (kpis.downtimeHours > 20) {
    insights.push({
      id: 'downtime-high',
      type: 'warning',
      title: `${kpis.downtimeHours.toFixed(1)} hours downtime`,
      description: 'Investigate root causes and implement preventive measures',
      action: {
        label: 'View Downtime Analysis',
        href: '/operations/downtime',
      },
    });
  }

  // Open requests insight
  if (kpis.openRequests > 15) {
    insights.push({
      id: 'requests-high',
      type: 'action',
      title: `${kpis.openRequests} open work requests`,
      description: 'Review backlog and prioritize high-impact items',
      action: {
        label: 'Manage Requests',
        href: '/requests',
      },
    });
  }

  // General recommendations
  insights.push({
    id: 'watchlist',
    type: 'info',
    title: 'Watchlist Items',
    description: 'Monitor weld spatter on M-101, pre-stage materials for Monday production',
  });

  return insights;
}

export function getContextualHmwTags(pathname: string): string[] {
  if (pathname.includes('line-speed') || pathname.includes('performance')) {
    return ['speed', 'performance', 'oee', 'throughput'];
  }
  if (pathname.includes('downtime')) {
    return ['downtime', 'maintenance', 'reliability'];
  }
  if (pathname.includes('quality')) {
    return ['quality', 'defects', 'fpy', 'scrap'];
  }
  return [];
}


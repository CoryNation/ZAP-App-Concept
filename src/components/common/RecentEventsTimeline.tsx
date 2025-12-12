import { Stack, Typography, Box, Chip, Divider } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

/**
 * Interface for a recent downtime event
 */
interface RecentEvent {
  /** Event start time (ISO date string) */
  start: string;
  /** Event end time (ISO date string) */
  end: string;
  /** Production line identifier */
  line: string;
  /** Downtime cause/reason */
  cause: string;
  /** Optional severity level */
  severity?: 'low' | 'medium' | 'high';
  /** Optional additional notes */
  notes?: string;
}

/**
 * Props for RecentEventsTimeline component
 */
interface RecentEventsTimelineProps {
  /** Array of recent downtime events */
  events: RecentEvent[];
  /** Maximum number of events to display (default: 15) */
  maxEvents?: number;
}

/**
 * Timeline component for displaying recent downtime events
 * 
 * Displays a vertical timeline of recent downtime events with:
 * - Color-coded severity indicators (high=red, medium=orange, low=blue)
 * - Formatted timestamps
 * - Duration calculations
 * - Line and cause information
 * 
 * Events are displayed in chronological order (most recent first) with
 * visual indicators for severity levels.
 * 
 * @param props - Component props
 * @param props.events - Array of recent downtime events
 * @param props.maxEvents - Maximum number of events to display (default: 15)
 * 
 * @example
 * ```tsx
 * <RecentEventsTimeline
 *   events={[
 *     {
 *       start: '2024-01-15T10:00:00Z',
 *       end: '2024-01-15T10:30:00Z',
 *       line: 'Line A',
 *       cause: 'Equipment Failure',
 *       severity: 'high'
 *     }
 *   ]}
 *   maxEvents={15}
 * />
 * ```
 */

const SEVERITY_COLORS = {
  high: '#d32f2f',
  medium: '#f57c00',
  low: '#1976d2',
};

export default function RecentEventsTimeline({ events, maxEvents = 15 }: RecentEventsTimelineProps) {
  const displayEvents = events.slice(0, maxEvents);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDuration = (start: string, end: string) => {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const minutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Recent Downtime Events
        </Typography>
      </Box>
      <Box sx={{ maxHeight: '400px', overflowY: 'auto' }}>
        {displayEvents.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              No events available
            </Typography>
          </Box>
        ) : (
          <Stack spacing={0} divider={<Divider />}>
            {displayEvents.map((event, idx) => {
              const severity = event.severity || 'low';
              const borderColor = SEVERITY_COLORS[severity];

              return (
                <Box
                  key={idx}
                  sx={{
                    p: 1.5,
                    borderLeft: `3px solid ${borderColor}`,
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <Stack spacing={0.75}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                        <Chip
                          label={event.line}
                          size="small"
                          color="primary"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {event.cause}
                        </Typography>
                      </Stack>
                      <Chip
                        label={getDuration(event.start, event.end)}
                        size="small"
                        variant="outlined"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          borderColor: borderColor,
                          color: borderColor,
                        }}
                      />
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AccessTimeIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        {formatTime(event.start)}
                      </Typography>
                    </Stack>
                    {event.notes && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          fontSize: '0.75rem',
                          fontStyle: 'italic',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {event.notes}
                      </Typography>
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
    </Box>
  );
}


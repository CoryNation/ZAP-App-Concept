'use client';

import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Box,
  Chip,
  Stack,
} from '@mui/material';
import { DowntimeTransition } from '@/src/lib/services/downtimeTransitionsService';

interface TransitionsListProps {
  transitions: DowntimeTransition[];
  totalTransitions: number;
  onTransitionClick?: (from: string, to: string) => void;
  selectedTransition?: { from: string; to: string } | null;
}

export default function TransitionsList({
  transitions,
  totalTransitions,
  onTransitionClick,
  selectedTransition,
}: TransitionsListProps) {
  if (transitions.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Top Transitions
          </Typography>
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No transitions found
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Top Transitions
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {totalTransitions} total transition{totalTransitions !== 1 ? 's' : ''}
            </Typography>
          </Box>

          <List dense sx={{ maxHeight: 500, overflowY: 'auto' }}>
            {transitions.slice(0, 20).map((transition, idx) => {
              const isSelected =
                selectedTransition?.from === transition.from &&
                selectedTransition?.to === transition.to;
              return (
                <ListItem
                  key={idx}
                  onClick={() => onTransitionClick?.(transition.from, transition.to)}
                  sx={{
                    cursor: onTransitionClick ? 'pointer' : 'default',
                    bgcolor: isSelected ? 'action.selected' : 'transparent',
                    borderRadius: 1,
                    mb: 0.5,
                    '&:hover': {
                      bgcolor: onTransitionClick ? 'action.hover' : 'transparent',
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
                          {transition.from}
                        </Typography>
                        <Typography variant="body2" component="span" color="text.secondary">
                          →
                        </Typography>
                        <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
                          {transition.to}
                        </Typography>
                      </Stack>
                    }
                    secondary={
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                        <Chip
                          label={`${transition.count}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Typography variant="caption" color="text.secondary">
                          {transition.percentage.toFixed(1)}%
                        </Typography>
                      </Stack>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </Stack>
      </CardContent>
    </Card>
  );
}


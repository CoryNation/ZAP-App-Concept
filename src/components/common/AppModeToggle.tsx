'use client';

import { ToggleButton, ToggleButtonGroup, Badge, Box, Tooltip } from '@mui/material';
import { useRouter, usePathname } from 'next/navigation';
import { useAppMode, AppMode } from '@/src/lib/contexts/ModeProvider';
import { modeRoute, baseRoute } from '@/src/lib/utils/modeRouter';

export default function AppModeToggle() {
  const { mode, setMode } = useAppMode();
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (_event: React.MouseEvent<HTMLElement>, newMode: AppMode | null) => {
    if (newMode !== null && newMode !== mode) {
      setMode(newMode);
      
      // Navigate to appropriate page based on mode
      if (newMode === 'prod_trials') {
        // Switch to Production Trials: go to downtime dashboard
        router.push(modeRoute('/operations/downtime', newMode));
      } else {
        // Switch to POC: go to home
        router.push('/');
      }
    }
  };

  const getModeLabel = (mode: AppMode) => {
    return mode === 'poc' ? 'Proof of Concept' : 'Production Trials';
  };

  const getModeBadgeColor = (mode: AppMode) => {
    return mode === 'poc' ? 'primary' : 'success';
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={handleChange}
        size="small"
        aria-label="app mode"
      >
        <ToggleButton value="poc" aria-label="proof of concept">
          Proof of Concept
        </ToggleButton>
        <ToggleButton value="prod_trials" aria-label="production trials">
          Production Trials
        </ToggleButton>
      </ToggleButtonGroup>
      
      <Tooltip title={`Active mode: ${getModeLabel(mode)}`}>
        <Badge
          badgeContent={mode === 'poc' ? 'POC' : 'PROD'}
          color={getModeBadgeColor(mode)}
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.65rem',
              fontWeight: 600,
              padding: '2px 6px',
            },
          }}
        >
          <Box sx={{ width: 8, height: 8 }} />
        </Badge>
      </Tooltip>
    </Box>
  );
}


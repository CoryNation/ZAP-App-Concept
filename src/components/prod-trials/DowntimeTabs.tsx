'use client';

import { ReactNode } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

interface TabPanelProps {
  children?: ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`downtime-tabpanel-${index}`}
      aria-labelledby={`downtime-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

interface DowntimeTabsProps {
  children: {
    overview: ReactNode;
    rapidRecurrence: ReactNode;
    relationshipMatrix: ReactNode;
    rawData: ReactNode;
  };
}

export default function DowntimeTabs({ children }: DowntimeTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Get tab from URL, default to 'overview'
  const tabParam = searchParams.get('tab') || 'overview';
  
  const tabMap: Record<string, number> = {
    overview: 0,
    'rapid-recurrence': 1,
    'relationship-matrix': 2,
    'raw-data': 3,
  };
  
  const reverseTabMap: Record<number, string> = {
    0: 'overview',
    1: 'rapid-recurrence',
    2: 'relationship-matrix',
    3: 'raw-data',
  };
  
  const currentTab = tabMap[tabParam] ?? 0;
  
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    const tabName = reverseTabMap[newValue] || 'overview';
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabName);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Box>
      <Tabs
        value={currentTab}
        onChange={handleTabChange}
        aria-label="downtime analysis tabs"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          mb: 2,
        }}
      >
        <Tab label="Overview" id="downtime-tab-0" aria-controls="downtime-tabpanel-0" />
        <Tab label="Rapid Recurrence" id="downtime-tab-1" aria-controls="downtime-tabpanel-1" />
        <Tab label="Relationship Matrix" id="downtime-tab-2" aria-controls="downtime-tabpanel-2" />
        <Tab label="Raw Data" id="downtime-tab-3" aria-controls="downtime-tabpanel-3" />
      </Tabs>

      <TabPanel value={currentTab} index={0}>
        {children.overview}
      </TabPanel>
      <TabPanel value={currentTab} index={1}>
        {children.rapidRecurrence}
      </TabPanel>
      <TabPanel value={currentTab} index={2}>
        {children.relationshipMatrix}
      </TabPanel>
      <TabPanel value={currentTab} index={3}>
        {children.rawData}
      </TabPanel>
    </Box>
  );
}


'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Stack, Typography, Card, CardContent, Grid, Button } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import AssessmentIcon from '@mui/icons-material/Assessment';

export default function AdminPage() {
  const router = useRouter();

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Admin Dashboard</Typography>

      <Typography variant="body2" color="text.secondary">
        Administrative tools and data management for the ZAP App
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack spacing={2} alignItems="center">
                <PeopleIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                <Typography variant="h6" align="center">
                  User Management
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center">
                  Manage users, invitations, and access permissions across factories and lines
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => router.push('/admin/users')}
                >
                  Open User Management
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack spacing={2} alignItems="center">
                <AssessmentIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                <Typography variant="h6" align="center">
                  Data Management
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center">
                  Configure factories, lines, machines, and other system data
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  disabled
                >
                  Coming Soon
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack spacing={2} alignItems="center">
                <SettingsIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                <Typography variant="h6" align="center">
                  System Settings
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center">
                  Configure global settings, integrations, and application preferences
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => router.push('/settings')}
                >
                  Open Settings
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Admin Features
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                ✅ User Management
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Full user administration with invitation system, role assignment, and access control
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                🔄 Data Management (Coming Soon)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Configure organizational structure, machines, and production lines
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                ⚙️ System Settings
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Application preferences and user settings
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                📊 Analytics (Coming Soon)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Usage analytics and system health monitoring
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Stack>
  );
}

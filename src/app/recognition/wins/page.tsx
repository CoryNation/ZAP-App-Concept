'use client';

import { useEffect, useState } from 'react';
import {
  Stack,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Link as MuiLink,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LinkIcon from '@mui/icons-material/Link';
import { listWins, createWin, Win, CreateWinInput } from '@/src/lib/services/winsService';

export default function WinsPage() {
  const [wins, setWins] = useState<Win[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateWinInput>({
    title: '',
    kpi_delta: undefined,
    evidence_url: '',
  });

  useEffect(() => {
    loadWins();
  }, []);

  const loadWins = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listWins();
      setWins(data);
    } catch (err) {
      console.error('Failed to load wins:', err);
      setError('Failed to load wins. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      title: '',
      kpi_delta: undefined,
      evidence_url: '',
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }

    setSubmitting(true);
    try {
      await createWin(formData);
      await loadWins();
      setDialogOpen(false);
    } catch (err) {
      console.error('Failed to create win:', err);
      alert('Failed to create win. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={1} alignItems="center">
          <EmojiEventsIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5">Plant Wins</Typography>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog}>
          Add Win
        </Button>
      </Stack>

      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            Celebrate team successes, safety milestones, performance improvements, and notable achievements.
            Share wins to reinforce positive behaviors and boost morale.
          </Typography>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={2}>
          {wins.map((win) => (
            <Card key={win.id} sx={{ borderLeft: '4px solid', borderColor: 'primary.main' }}>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ mb: 0.5 }}>
                      {win.title}
                    </Typography>

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(win.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Typography>
                      {win.created_by && (
                        <>
                          <Typography variant="caption" color="text.secondary">
                            •
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Posted by {win.created_by}
                          </Typography>
                        </>
                      )}
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      {win.kpi_delta !== undefined && win.kpi_delta !== null && (
                        <Chip
                          icon={<TrendingUpIcon />}
                          label={`${win.kpi_delta > 0 ? '+' : ''}${win.kpi_delta}%`}
                          size="small"
                          color={win.kpi_delta > 0 ? 'success' : 'default'}
                          variant="outlined"
                        />
                      )}
                      {win.evidence_url && (
                        <Chip
                          icon={<LinkIcon />}
                          label="Evidence"
                          size="small"
                          component={MuiLink}
                          href={win.evidence_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          clickable
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </Box>

                  <EmojiEventsIcon sx={{ color: 'warning.main', fontSize: 40 }} />
                </Stack>
              </CardContent>
            </Card>
          ))}

          {wins.length === 0 && (
            <Card>
              <CardContent>
                <Typography variant="body1" align="center" color="text.secondary">
                  No wins posted yet. Click "Add Win" to celebrate your team's achievements!
                </Typography>
              </CardContent>
            </Card>
          )}
        </Stack>
      )}

      {/* Add Win Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <EmojiEventsIcon color="primary" />
            <span>Add Plant Win</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              required
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Zero safety incidents for 90 days"
              helperText="Brief, specific description of the achievement"
            />

            <TextField
              fullWidth
              type="number"
              label="KPI Delta (%)"
              value={formData.kpi_delta ?? ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  kpi_delta: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              placeholder="e.g., 15"
              helperText="Optional: Percentage improvement in a key metric"
              inputProps={{ step: 0.1 }}
            />

            <TextField
              fullWidth
              label="Evidence URL"
              value={formData.evidence_url}
              onChange={(e) => setFormData({ ...formData, evidence_url: e.target.value })}
              placeholder="https://..."
              helperText="Optional: Link to report, photo, or supporting documentation"
            />

            <Divider />

            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="body2">
                <strong>Tips for great wins:</strong>
                <br />• Be specific about what was achieved
                <br />• Include measurable results when possible
                <br />• Give credit to the team or individuals involved
              </Typography>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
            {submitting ? 'Posting...' : 'Post Win'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

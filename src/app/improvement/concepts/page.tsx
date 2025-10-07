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
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Grid,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ZAxis,
  Label,
} from 'recharts';
import { listIdeas, createIdea, Idea, CreateIdeaInput } from '@/src/lib/services/ideasService';

const STATUS_COLORS: Record<Idea['status'], string> = {
  Draft: '#9e9e9e',
  Proposed: '#2196f3',
  Approved: '#4caf50',
  'In-Progress': '#ff9800',
  Done: '#9c27b0',
};

export default function ConceptsPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateIdeaInput>({
    title: '',
    description: '',
    impact_score: 3,
    effort_score: 3,
    status: 'Draft',
  });

  useEffect(() => {
    loadIdeas();
    
    // Check for prefill data from inspiration page
    const prefillData = sessionStorage.getItem('prefillConcept');
    if (prefillData) {
      try {
        const parsed = JSON.parse(prefillData);
        setFormData(parsed);
        setDialogOpen(true);
        sessionStorage.removeItem('prefillConcept');
      } catch (err) {
        console.error('Error parsing prefill data:', err);
      }
    }
  }, []);

  const loadIdeas = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listIdeas();
      setIdeas(data);
    } catch (err) {
      console.error('Failed to load ideas:', err);
      setError('Failed to load concepts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      title: '',
      description: '',
      impact_score: 3,
      effort_score: 3,
      status: 'Draft',
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
      await createIdea(formData);
      await loadIdeas();
      setDialogOpen(false);
    } catch (err) {
      console.error('Failed to create idea:', err);
      alert('Failed to create concept. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Transform ideas for scatter plot
  const scatterData = ideas.map((idea) => ({
    x: idea.effort_score,
    y: idea.impact_score,
    z: 100, // Size of dot
    name: idea.title,
    status: idea.status,
    color: STATUS_COLORS[idea.status],
  }));

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5">Concepts & Proposals</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog}>
          Add Concept
        </Button>
      </Stack>

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
        <>
          {/* Scatter Plot: Impact vs Effort */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    Impact vs Effort Matrix
                  </Typography>
                  <Box sx={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          dataKey="x"
                          name="Effort"
                          domain={[0, 6]}
                          ticks={[1, 2, 3, 4, 5]}
                        >
                          <Label value="Effort Score →" position="bottom" offset={20} />
                        </XAxis>
                        <YAxis
                          type="number"
                          dataKey="y"
                          name="Impact"
                          domain={[0, 6]}
                          ticks={[1, 2, 3, 4, 5]}
                        >
                          <Label value="Impact Score →" angle={-90} position="left" offset={10} />
                        </YAxis>
                        <ZAxis type="number" dataKey="z" range={[100, 400]} />
                        <Tooltip
                          cursor={{ strokeDasharray: '3 3' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <Box
                                  sx={{
                                    bgcolor: 'background.paper',
                                    p: 1.5,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                  }}
                                >
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {data.name}
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    Impact: {data.y} / Effort: {data.x}
                                  </Typography>
                                  <Chip
                                    label={data.status}
                                    size="small"
                                    sx={{ mt: 0.5, bgcolor: data.color, color: 'white' }}
                                  />
                                </Box>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend
                          verticalAlign="top"
                          height={36}
                          content={() => (
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 1 }}>
                              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                                <Chip
                                  key={status}
                                  label={status}
                                  size="small"
                                  sx={{ bgcolor: color, color: 'white' }}
                                />
                              ))}
                            </Box>
                          )}
                        />
                        <Scatter name="Concepts" data={scatterData}>
                          {scatterData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    High Impact + Low Effort = Quick Wins (top-left quadrant)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Summary Stats */}
            <Grid item xs={12} md={6}>
              <Stack spacing={2}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Status Summary
                    </Typography>
                    <Stack spacing={1}>
                      {Object.entries(STATUS_COLORS).map(([status, color]) => {
                        const count = ideas.filter((i) => i.status === status).length;
                        return (
                          <Box
                            key={status}
                            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          >
                            <Chip label={status} size="small" sx={{ bgcolor: color, color: 'white' }} />
                            <Typography variant="body2">{count}</Typography>
                          </Box>
                        );
                      })}
                    </Stack>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Quick Wins (High Impact, Low Effort)
                    </Typography>
                    {ideas
                      .filter((i) => i.impact_score >= 4 && i.effort_score <= 2)
                      .map((idea) => (
                        <Box key={idea.id} sx={{ mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {idea.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Impact: {idea.impact_score} / Effort: {idea.effort_score}
                          </Typography>
                        </Box>
                      ))}
                    {ideas.filter((i) => i.impact_score >= 4 && i.effort_score <= 2).length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No quick wins identified yet.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Stack>
            </Grid>
          </Grid>

          {/* Table */}
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                All Concepts
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="center">Impact</TableCell>
                    <TableCell align="center">Effort</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ideas.map((idea) => (
                    <TableRow key={idea.id}>
                      <TableCell sx={{ fontWeight: 600 }}>{idea.title}</TableCell>
                      <TableCell sx={{ maxWidth: 300 }}>
                        {idea.description || '—'}
                      </TableCell>
                      <TableCell align="center">{idea.impact_score}</TableCell>
                      <TableCell align="center">{idea.effort_score}</TableCell>
                      <TableCell>
                        <Chip
                          label={idea.status}
                          size="small"
                          sx={{ bgcolor: STATUS_COLORS[idea.status], color: 'white' }}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(idea.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {ideas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No concepts yet. Click "Add Concept" to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Concept Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Concept</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              required
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief, descriptive title"
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Explain the concept and expected benefits"
            />

            <TextField
              fullWidth
              select
              label="Impact Score"
              value={formData.impact_score}
              onChange={(e) => setFormData({ ...formData, impact_score: Number(e.target.value) })}
              helperText="1 = Low, 5 = High"
            >
              {[1, 2, 3, 4, 5].map((val) => (
                <MenuItem key={val} value={val}>
                  {val} - {val === 1 ? 'Low' : val === 3 ? 'Medium' : val === 5 ? 'High' : ''}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              select
              label="Effort Score"
              value={formData.effort_score}
              onChange={(e) => setFormData({ ...formData, effort_score: Number(e.target.value) })}
              helperText="1 = Low, 5 = High"
            >
              {[1, 2, 3, 4, 5].map((val) => (
                <MenuItem key={val} value={val}>
                  {val} - {val === 1 ? 'Low' : val === 3 ? 'Medium' : val === 5 ? 'High' : ''}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            >
              {Object.keys(STATUS_COLORS).map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Concept'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

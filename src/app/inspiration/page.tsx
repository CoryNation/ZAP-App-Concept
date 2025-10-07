'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Stack,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  TextField,
  MenuItem,
  Box,
} from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import AddIcon from '@mui/icons-material/Add';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import hmwData from '@/src/lib/hmw/hmw.json';
import { HmwEntry } from '@/src/lib/types';

const CATEGORY_COLORS: Record<HmwEntry['category'], string> = {
  'Decision Support': '#1976d2',
  'Operational/Quality Improvement': '#388e3c',
  'Safety & Environmental': '#d32f2f',
  'Data Systems & Measures': '#f57c00',
  'Plant Performance & Data Management': '#7b1fa2',
};

export default function InspirationPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const hmwEntries = hmwData as HmwEntry[];

  const filteredHmw = hmwEntries.filter(entry => {
    const matchesCategory = selectedCategory === 'all' || entry.category === selectedCategory;
    const matchesSearch = searchTerm === '' || 
      entry.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleCreateConcept = (hmw: HmwEntry) => {
    // Store HMW data in sessionStorage for prefilling
    sessionStorage.setItem('prefillConcept', JSON.stringify({
      title: hmw.prompt,
      description: `Inspired by: ${hmw.prompt}\n\nCategory: ${hmw.category}\nTags: ${hmw.tags.join(', ')}`,
      impact_score: 4,
      effort_score: 3,
      status: 'Draft',
    }));
    router.push('/improvement/concepts');
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} alignItems="center">
        <LightbulbIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box>
          <Typography variant="h5">How Might We... Inspiration Gallery</Typography>
          <Typography variant="body2" color="text.secondary">
            Explore improvement opportunities across decision support, operations, safety, and data systems
          </Typography>
        </Box>
      </Stack>

      {/* Filters */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            size="small"
            label="Search prompts and tags"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="e.g., downtime, quality, safety..."
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            select
            size="small"
            label="Category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <MenuItem value="all">All Categories</MenuItem>
            {Object.keys(CATEGORY_COLORS).map(cat => (
              <MenuItem key={cat} value={cat}>{cat}</MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      {/* HMW Cards Grid */}
      <Grid container spacing={2}>
        {filteredHmw.map((hmw) => (
          <Grid item xs={12} md={6} lg={4} key={hmw.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Stack spacing={1.5}>
                  <Chip
                    label={hmw.category}
                    size="small"
                    sx={{
                      bgcolor: CATEGORY_COLORS[hmw.category],
                      color: 'white',
                      fontWeight: 600,
                      alignSelf: 'flex-start',
                    }}
                  />
                  
                  <Typography variant="h6" sx={{ fontSize: '1rem', lineHeight: 1.4 }}>
                    {hmw.prompt}
                  </Typography>

                  <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                    {hmw.tags.map(tag => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                  </Stack>

                  {/* Mini viz for select cards */}
                  {hmw.id === 'hmw-012' && (
                    <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                      <Stack direction="row" spacing={0.5} alignItems="flex-end" justifyContent="space-around" sx={{ height: 40 }}>
                        {[65, 72, 68, 75, 71, 78, 74].map((val, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              width: 8,
                              height: `${(val / 80) * 100}%`,
                              bgcolor: val >= 70 ? '#388e3c' : '#f57c00',
                              borderRadius: 0.5,
                            }}
                          />
                        ))}
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, textAlign: 'center' }}>
                        Speed trend: 700 ft/min goal
                      </Typography>
                    </Box>
                  )}

                  {hmw.id === 'hmw-014' && (
                    <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                      <Stack direction="row" spacing={0.5} alignItems="flex-end" justifyContent="space-around" sx={{ height: 40 }}>
                        {[95, 96, 94, 97, 96, 98, 97].map((val, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              width: 8,
                              height: `${val}%`,
                              bgcolor: val >= 98 ? '#388e3c' : '#1976d2',
                              borderRadius: 0.5,
                            }}
                          />
                        ))}
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, textAlign: 'center' }}>
                        FPY trend: 98% target
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2 }}>
                <Button
                  fullWidth
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => handleCreateConcept(hmw)}
                >
                  Create Concept from this
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredHmw.length === 0 && (
        <Card>
          <CardContent>
            <Typography variant="body1" align="center" color="text.secondary">
              No prompts match your search. Try adjusting filters.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}


import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import { Add, Delete, Edit, Language, Publish } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../api/client';

interface Announcement {
  _id: string;
  titleML: { en: string; de: string; tr: string };
  bodyML: { en: string; de: string; tr: string };
  target: { scope: string };
  deepLink: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  createdAt: string;
}

const TabPanel: React.FC<{ children?: React.ReactNode; value: number; index: number }> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ paddingTop: 24 }}>
    {value === index && children}
  </div>
);

const Announcements: React.FC = () => {
  const queryClient = useQueryClient();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery('(max-width:600px)');
  const isLight = muiTheme.palette.mode === 'light';

  const [tabValue, setTabValue] = useState(0);
  const [langTabValue, setLangTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    titleML: { en: '', de: '', tr: '' },
    bodyML: { en: '', de: '', tr: '' },
    target: { scope: 'all' },
    deepLink: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
  });

  const surface = muiTheme.palette.background.paper;
  const border = muiTheme.palette.divider;
  const hover = alpha(muiTheme.palette.primary.main, isLight ? 0.06 : 0.16);
  const tableHeader = alpha(muiTheme.palette.text.primary, isLight ? 0.04 : 0.08);
  const accent = muiTheme.palette.secondary.main;

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      color: muiTheme.palette.text.primary,
      backgroundColor: surface,
      '& fieldset': { borderColor: border },
      '&:hover fieldset': { borderColor: accent },
      '&.Mui-focused fieldset': { borderColor: accent },
    },
    '& .MuiInputLabel-root': { color: muiTheme.palette.text.secondary },
    '& .MuiInputLabel-root.Mui-focused': { color: muiTheme.palette.primary.main },
  };

  const { data: announcements, isLoading, error } = useQuery({
    queryKey: ['admin', 'announcements'],
    queryFn: async () => {
      const response = await api.get('/admin/announcements');
      return response.data.items || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await api.post('/admin/announcements', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await api.patch(`/admin/announcements/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] });
      handleCloseDialog();
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/admin/announcements/${id}/publish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/announcements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] });
    },
  });

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAnnouncement(null);
  };

  const handleOpenCreate = () => {
    setEditingAnnouncement(null);
    setLangTabValue(0);
    setFormData({
      titleML: { en: '', de: '', tr: '' },
      bodyML: { en: '', de: '', tr: '' },
      target: { scope: 'all' },
      deepLink: '',
      status: 'draft',
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setLangTabValue(0);
    setFormData({
      titleML: announcement.titleML || { en: '', de: '', tr: '' },
      bodyML: announcement.bodyML || { en: '', de: '', tr: '' },
      target: announcement.target || { scope: 'all' },
      deepLink: announcement.deepLink || '',
      status: announcement.status || 'draft',
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.titleML.en.trim()) {
      alert('English title is required');
      return;
    }

    const payload = {
      titleML: formData.titleML,
      bodyML: formData.bodyML,
      target: formData.target,
      deepLink: formData.deepLink,
      status: formData.status,
    };

    if (editingAnnouncement) {
      updateMutation.mutate({ id: editingAnnouncement._id, data: payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const getRows = () => {
    if (tabValue === 1) return announcements?.filter((item: Announcement) => item.status === 'draft') || [];
    if (tabValue === 2) return announcements?.filter((item: Announcement) => item.status === 'published') || [];
    return announcements || [];
  };

  const getStatusChip = (status: string) => {
    const colors: Record<string, 'default' | 'success' | 'info'> = {
      draft: 'default',
      published: 'success',
      archived: 'info',
    };
    return <Chip label={status} size="small" color={colors[status] || 'default'} />;
  };

  if (isLoading) {
    return <CircularProgress sx={{ color: muiTheme.palette.primary.main }} />;
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2, backgroundColor: surface, border: `1px solid ${border}` }}>
        Error loading announcements. Please try again.
      </Alert>
    );
  }

  return (
    <Box className="page-shell">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontSize: isMobile ? '1.5rem' : '2rem' }}>
          Announcements
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate}>
          New Announcement
        </Button>
      </Box>

      <Paper sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
        <Tabs
          value={tabValue}
          onChange={(_, value) => setTabValue(value)}
          variant={isMobile ? 'scrollable' : 'fullWidth'}
          sx={{
            borderBottom: `1px solid ${border}`,
            '& .MuiTab-root': {
              color: muiTheme.palette.text.secondary,
              fontWeight: 600,
            },
            '& .Mui-selected': {
              color: muiTheme.palette.primary.main,
            },
          }}
        >
          <Tab label="All" />
          <Tab label="Drafts" />
          <Tab label="Published" />
        </Tabs>

        <TabPanel value={tabValue} index={tabValue}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor: tableHeader,
                    '& .MuiTableCell-root': {
                      color: muiTheme.palette.text.primary,
                      fontWeight: 700,
                      borderBottom: `1px solid ${border}`,
                    },
                  }}
                >
                  <TableCell>Title (EN)</TableCell>
                  <TableCell>Target</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>{tabValue === 1 ? 'Created' : 'Published'}</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getRows().map((item: Announcement) => (
                  <TableRow key={item._id} hover sx={{ '&:hover': { backgroundColor: hover } }}>
                    <TableCell>{item.titleML?.en || 'No title'}</TableCell>
                    <TableCell>
                      <Chip label={item.target?.scope || 'all'} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{getStatusChip(item.status)}</TableCell>
                    <TableCell>
                      {format(new Date(tabValue === 1 ? item.createdAt : item.publishedAt || item.createdAt), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => handleOpenEdit(item)} sx={{ '&:hover': { backgroundColor: hover } }}>
                        <Edit />
                      </IconButton>
                      {item.status === 'draft' && (
                        <IconButton
                          size="small"
                          onClick={() => publishMutation.mutate(item._id)}
                          sx={{ color: accent, '&:hover': { backgroundColor: hover } }}
                        >
                          <Publish />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => deleteMutation.mutate(item._id)}
                        sx={{ color: muiTheme.palette.error.main, '&:hover': { backgroundColor: hover } }}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {getRows().length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: muiTheme.palette.text.secondary }}>
                      No announcements found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { backgroundColor: surface, border: `1px solid ${border}` } }}
      >
        <DialogTitle>{editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Tabs
              value={langTabValue}
              onChange={(_, value) => setLangTabValue(value)}
              variant="fullWidth"
              sx={{
                borderBottom: `1px solid ${border}`,
                '& .MuiTab-root': {
                  color: muiTheme.palette.text.secondary,
                  fontWeight: 600,
                },
                '& .Mui-selected': {
                  color: muiTheme.palette.primary.main,
                },
              }}
            >
              <Tab icon={<Language />} label="English" />
              <Tab icon={<Language />} label="Deutsch" />
              <Tab icon={<Language />} label="Turkish" />
            </Tabs>

            {langTabValue === 0 && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Title (English)"
                    fullWidth
                    value={formData.titleML.en}
                    onChange={(e) => setFormData((prev) => ({ ...prev, titleML: { ...prev.titleML, en: e.target.value } }))}
                    sx={fieldSx}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Body (English)"
                    fullWidth
                    multiline
                    rows={3}
                    value={formData.bodyML.en}
                    onChange={(e) => setFormData((prev) => ({ ...prev, bodyML: { ...prev.bodyML, en: e.target.value } }))}
                    sx={fieldSx}
                  />
                </Grid>
              </Grid>
            )}

            {langTabValue === 1 && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Title (German)"
                    fullWidth
                    value={formData.titleML.de}
                    onChange={(e) => setFormData((prev) => ({ ...prev, titleML: { ...prev.titleML, de: e.target.value } }))}
                    sx={fieldSx}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Body (German)"
                    fullWidth
                    multiline
                    rows={3}
                    value={formData.bodyML.de}
                    onChange={(e) => setFormData((prev) => ({ ...prev, bodyML: { ...prev.bodyML, de: e.target.value } }))}
                    sx={fieldSx}
                  />
                </Grid>
              </Grid>
            )}

            {langTabValue === 2 && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Title (Turkish)"
                    fullWidth
                    value={formData.titleML.tr}
                    onChange={(e) => setFormData((prev) => ({ ...prev, titleML: { ...prev.titleML, tr: e.target.value } }))}
                    sx={fieldSx}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Body (Turkish)"
                    fullWidth
                    multiline
                    rows={3}
                    value={formData.bodyML.tr}
                    onChange={(e) => setFormData((prev) => ({ ...prev, bodyML: { ...prev.bodyML, tr: e.target.value } }))}
                    sx={fieldSx}
                  />
                </Grid>
              </Grid>
            )}

            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: muiTheme.palette.text.secondary }}>Target Scope</InputLabel>
                  <Select
                    value={formData.target.scope}
                    label="Target Scope"
                    onChange={(e) => setFormData((prev) => ({ ...prev, target: { ...prev.target, scope: e.target.value } }))}
                    sx={{
                      color: muiTheme.palette.text.primary,
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: border },
                    }}
                  >
                    <MenuItem value="all">All Users</MenuItem>
                    <MenuItem value="customers">Customers Only</MenuItem>
                    <MenuItem value="vendors">Vendors Only</MenuItem>
                    <MenuItem value="admins">Admins Only</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Deep Link (Optional)"
                  fullWidth
                  value={formData.deepLink}
                  onChange={(e) => setFormData((prev) => ({ ...prev, deepLink: e.target.value }))}
                  sx={fieldSx}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Card variant="outlined" sx={{ backgroundColor: alpha(muiTheme.palette.primary.main, isLight ? 0.03 : 0.08) }}>
                  <CardContent>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.status === 'published'}
                          onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.checked ? 'published' : 'draft' }))}
                        />
                      }
                      label="Publish immediately"
                    />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={createMutation.isPending || updateMutation.isPending}>
            {createMutation.isPending || updateMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Announcements;

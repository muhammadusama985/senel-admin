import React, { useState } from 'react';
import Grid from '@mui/material/Grid';
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
  Divider,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import {
  ArrowBack,
  Block,
  Business,
  Cancel,
  CheckCircle,
  Description,
  Email,
  FileDownload,
  History,
  Image,
  Info,
  LocationOn,
  Message,
  Phone,
  PictureAsPdf,
  Settings,
  Verified,
  Visibility,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ paddingTop: 24 }}>
    {value === index && children}
  </div>
);

type StatusColor = 'warning' | 'success' | 'error' | 'info' | 'default' | 'primary' | 'secondary';

interface Vendor {
  _id: string;
  storeName: string;
  email: string;
  phone: string;
  status: string;
  isVerifiedBadge: boolean;
  createdAt: string;
  reviewedAt?: string;
  reviewNote?: string;
  reviewedByAdminId?: string;
  verificationDocs?: Array<{
    _id: string;
    type: string;
    fileUrl: string;
    fileName?: string;
    mimeType?: string;
    status?: string;
    reviewNote?: string;
  }>;
  business?: {
    companyName?: string;
    taxId?: string;
    country?: string;
    city?: string;
    addressLine?: string;
    contactName?: string;
    contactPhone?: string;
  };
  permissions?: {
    canCreateProducts?: boolean;
    canReceiveOrders?: boolean;
    canRequestPayouts?: boolean;
  };
}

interface AuditLog {
  _id: string;
  action: string;
  note: string;
  createdAt: string;
  actorUserId?: {
    email: string;
  };
}

const VendorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const muiTheme = useMuiTheme();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width:600px)');
  const isLight = muiTheme.palette.mode === 'light';

  const [tabValue, setTabValue] = useState(0);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [blockDialog, setBlockDialog] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [permissionDraft, setPermissionDraft] = useState({
    canCreateProducts: true,
    canReceiveOrders: true,
    canRequestPayouts: true,
  });

  const surface = muiTheme.palette.background.paper;
  const border = muiTheme.palette.divider;
  const hover = alpha(muiTheme.palette.primary.main, isLight ? 0.06 : 0.14);
  const accent = muiTheme.palette.secondary.main;
  const panel = alpha(muiTheme.palette.primary.main, isLight ? 0.04 : 0.08);

  const fieldSx = {
    '& .MuiInputLabel-root': { color: muiTheme.palette.text.secondary },
    '& .MuiInputLabel-root.Mui-focused': { color: muiTheme.palette.primary.main },
    '& .MuiOutlinedInput-root': {
      color: muiTheme.palette.text.primary,
      backgroundColor: surface,
      '& fieldset': { borderColor: border },
      '&:hover fieldset': { borderColor: accent },
      '&.Mui-focused fieldset': { borderColor: muiTheme.palette.primary.main },
    },
  };

  const { data: vendor, isLoading, error } = useQuery<Vendor>({
    queryKey: ['admin', 'vendors', id],
    queryFn: async () => {
      const response = await api.get(`/vendors/admin/vendors/${id}`);
      return response.data.vendor;
    },
    refetchInterval: 10000,
  });

  React.useEffect(() => {
    if (vendor?.permissions) {
      setPermissionDraft({
        canCreateProducts: vendor.permissions.canCreateProducts ?? true,
        canReceiveOrders: vendor.permissions.canReceiveOrders ?? true,
        canRequestPayouts: vendor.permissions.canRequestPayouts ?? true,
      });
    }
  }, [vendor]);

  const { data: auditLogs } = useQuery<AuditLog[]>({
    queryKey: ['admin', 'vendors', id, 'audit'],
    queryFn: async () => {
      try {
        const response = await api.get(`/vendors/admin/vendors/${id}/audit`);
        return response.data.items || [];
      } catch {
        return [];
      }
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => api.post(`/vendors/admin/vendors/${id}/approve`, { note: 'Vendor approved' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendors', id] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ reason }: { reason: string }) =>
      api.post(`/vendors/admin/vendors/${id}/reject`, { note: reason }),
    onSuccess: () => {
      setRejectDialog(false);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendors', id] });
    },
  });

  const underReviewMutation = useMutation({
    mutationFn: async ({ note }: { note: string }) =>
      api.post(`/vendors/admin/vendors/${id}/under-review`, { note }),
    onSuccess: () => {
      setReviewDialog(false);
      setReviewNote('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendors', id] });
    },
  });

  const blockMutation = useMutation({
    mutationFn: async ({ reason }: { reason: string }) =>
      api.post(`/vendors/admin/vendors/${id}/block`, { note: reason }),
    onSuccess: () => {
      setBlockDialog(false);
      setBlockReason('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendors', id] });
    },
  });

  const permissionsMutation = useMutation({
    mutationFn: async () => api.patch(`/vendors/admin/vendors/${id}/permissions`, permissionDraft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendors', id] });
    },
  });

  if (isLoading) {
    return (
      <LinearProgress
        sx={{
          backgroundColor: alpha(muiTheme.palette.text.primary, isLight ? 0.08 : 0.18),
          '& .MuiLinearProgress-bar': { backgroundColor: muiTheme.palette.primary.main },
        }}
      />
    );
  }

  if (error || !vendor) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {t('vendors.errorLoading')}
      </Alert>
    );
  }

  const getStatusColor = (status: string): StatusColor => {
    const colors: Record<string, StatusColor> = {
      submitted: 'warning',
      under_review: 'info',
      approved: 'success',
      rejected: 'error',
      blocked: 'error',
      draft: 'default',
    };
    return colors[status] || 'default';
  };

  const getDocumentIcon = (mimeType?: string) => {
    if (mimeType?.includes('pdf')) return <PictureAsPdf sx={{ color: accent }} />;
    if (mimeType?.includes('image')) return <Image sx={{ color: accent }} />;
    return <Description sx={{ color: accent }} />;
  };

  return (
    <Box className="page-shell">
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <IconButton onClick={() => navigate('/vendors')} sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" sx={{ fontSize: isMobile ? '1.5rem' : '2rem', color: muiTheme.palette.text.primary, flex: 1 }}>
          {t('vendors.details')}
        </Typography>

        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {vendor.status === 'submitted' && (
            <>
              <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
                {approveMutation.isPending ? <CircularProgress size={20} color="inherit" /> : t('vendors.approve')}
              </Button>
              <Button variant="contained" color="error" startIcon={<Cancel />} onClick={() => setRejectDialog(true)}>
                {t('vendors.reject')}
              </Button>
              <Button variant="outlined" startIcon={<Info sx={{ color: accent }} />} onClick={() => setReviewDialog(true)}>
                {t('vendors.underReview')}
              </Button>
            </>
          )}

          {vendor.status === 'under_review' && (
            <>
              <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
                {approveMutation.isPending ? <CircularProgress size={20} color="inherit" /> : t('vendors.approve')}
              </Button>
              <Button variant="contained" color="error" startIcon={<Cancel />} onClick={() => setRejectDialog(true)}>
                {t('vendors.reject')}
              </Button>
            </>
          )}

          {vendor.status === 'approved' && (
            <Button variant="contained" color="warning" startIcon={<Block />} onClick={() => setBlockDialog(true)}>
              {t('vendors.block')}
            </Button>
          )}
        </Stack>
      </Box>

      <Paper sx={{ p: 2, mb: 3, backgroundColor: surface, border: `1px solid ${border}` }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="subtitle2" sx={{ color: muiTheme.palette.text.secondary }}>
              {t('vendors.status')}
            </Typography>
            <Chip label={vendor.status || 'draft'} color={getStatusColor(vendor.status || 'draft')} sx={{ mt: 0.5, textTransform: 'capitalize' }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="subtitle2" sx={{ color: muiTheme.palette.text.secondary }}>
              {t('vendors.verifiedBadge')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              {vendor.isVerifiedBadge ? (
                <>
                  <Verified sx={{ color: muiTheme.palette.success.main, mr: 1 }} />
                  <Typography sx={{ color: muiTheme.palette.text.primary }}>{t('vendors.verified')}</Typography>
                </>
              ) : (
                <Typography sx={{ color: muiTheme.palette.text.primary }}>{t('vendors.notVerified')}</Typography>
              )}
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="subtitle2" sx={{ color: muiTheme.palette.text.secondary }}>
              {t('vendors.joined')}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: muiTheme.palette.text.primary }}>
              {vendor.createdAt ? format(new Date(vendor.createdAt), 'PPP') : t('products.notAvailable')}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="subtitle2" sx={{ color: muiTheme.palette.text.secondary }}>
              {t('vendors.lastReviewed')}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: muiTheme.palette.text.primary }}>
              {vendor.reviewedAt ? format(new Date(vendor.reviewedAt), 'PPP') : t('vendors.never')}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ width: '100%', mb: 3, backgroundColor: surface, border: `1px solid ${border}` }}>
        <Tabs
          value={tabValue}
          onChange={(_event, value) => setTabValue(value)}
          variant={isMobile ? 'scrollable' : 'fullWidth'}
          scrollButtons={isMobile ? 'auto' : undefined}
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
          <Tab label={t('vendors.profile')} />
          <Tab label={t('vendors.documentsTab')} />
          <Tab label={t('vendors.auditLog')} />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ backgroundColor: panel, border: `1px solid ${border}` }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: muiTheme.palette.primary.main }}>
                    {t('vendors.storeInfo')}
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <Business sx={{ color: accent }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={t('vendors.storeName')}
                        secondary={vendor.storeName || t('products.notAvailable')}
                        primaryTypographyProps={{ sx: { color: muiTheme.palette.text.primary } }}
                        secondaryTypographyProps={{ sx: { color: muiTheme.palette.text.secondary } }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Email sx={{ color: accent }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={t('login.email')}
                        secondary={vendor.email || t('products.notAvailable')}
                        primaryTypographyProps={{ sx: { color: muiTheme.palette.text.primary } }}
                        secondaryTypographyProps={{ sx: { color: muiTheme.palette.text.secondary } }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Phone sx={{ color: accent }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={t('vendors.phone')}
                        secondary={vendor.phone || t('products.notAvailable')}
                        primaryTypographyProps={{ sx: { color: muiTheme.palette.text.primary } }}
                        secondaryTypographyProps={{ sx: { color: muiTheme.palette.text.secondary } }}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ backgroundColor: panel, border: `1px solid ${border}` }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: muiTheme.palette.primary.main }}>
                    {t('vendors.businessInfo')}
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <Business sx={{ color: accent }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={t('vendors.company')}
                        secondary={vendor.business?.companyName || t('products.notAvailable')}
                        primaryTypographyProps={{ sx: { color: muiTheme.palette.text.primary } }}
                        secondaryTypographyProps={{ sx: { color: muiTheme.palette.text.secondary } }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Info sx={{ color: accent }} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Tax ID"
                        secondary={vendor.business?.taxId || t('products.notAvailable')}
                        primaryTypographyProps={{ sx: { color: muiTheme.palette.text.primary } }}
                        secondaryTypographyProps={{ sx: { color: muiTheme.palette.text.secondary } }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <LocationOn sx={{ color: accent }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={t('vendors.address')}
                        secondary={
                          vendor.business
                            ? `${vendor.business.addressLine || ''}, ${vendor.business.city || ''}, ${vendor.business.country || ''}`
                            : t('products.notAvailable')
                        }
                        primaryTypographyProps={{ sx: { color: muiTheme.palette.text.primary } }}
                        secondaryTypographyProps={{ sx: { color: muiTheme.palette.text.secondary } }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Phone sx={{ color: accent }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={t('vendors.contact')}
                        secondary={
                          vendor.business
                            ? `${vendor.business.contactName || ''} ${vendor.business.contactPhone || ''}`
                            : t('products.notAvailable')
                        }
                        primaryTypographyProps={{ sx: { color: muiTheme.palette.text.primary } }}
                        secondaryTypographyProps={{ sx: { color: muiTheme.palette.text.secondary } }}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Card sx={{ backgroundColor: panel, border: `1px solid ${border}` }}>
                <CardContent>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
                    <Box>
                      <Typography variant="h6" gutterBottom sx={{ color: muiTheme.palette.primary.main }}>
                        {t('vendors.permissions')}
                      </Typography>
                      <Typography variant="body2" sx={{ color: muiTheme.palette.text.secondary }}>
                        {t('vendors.permissionsIntro')}
                      </Typography>
                    </Box>
                    <Button variant="contained" startIcon={<Settings />} onClick={() => permissionsMutation.mutate()} disabled={permissionsMutation.isPending}>
                      {permissionsMutation.isPending ? `${t('common.save')}...` : t('vendors.savePermissions')}
                    </Button>
                  </Stack>

                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Button
                        fullWidth
                        variant={permissionDraft.canCreateProducts ? 'contained' : 'outlined'}
                        onClick={() => setPermissionDraft((prev) => ({ ...prev, canCreateProducts: !prev.canCreateProducts }))}
                      >
                        {t('vendors.productCreation')}: {permissionDraft.canCreateProducts ? t('vendors.allowed') : t('vendors.blockedState')}
                      </Button>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Button
                        fullWidth
                        variant={permissionDraft.canReceiveOrders ? 'contained' : 'outlined'}
                        onClick={() => setPermissionDraft((prev) => ({ ...prev, canReceiveOrders: !prev.canReceiveOrders }))}
                      >
                        {t('vendors.receiveOrders')}: {permissionDraft.canReceiveOrders ? t('vendors.allowed') : t('vendors.blockedState')}
                      </Button>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Button
                        fullWidth
                        variant={permissionDraft.canRequestPayouts ? 'contained' : 'outlined'}
                        onClick={() => setPermissionDraft((prev) => ({ ...prev, canRequestPayouts: !prev.canRequestPayouts }))}
                      >
                        {t('vendors.payoutRequests')}: {permissionDraft.canRequestPayouts ? t('vendors.allowed') : t('vendors.blockedState')}
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {vendor.reviewNote && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="info" icon={<Message />} sx={{ backgroundColor: panel, border: `1px solid ${border}` }}>
                  <Typography variant="subtitle2" sx={{ color: muiTheme.palette.text.primary }}>
                    {t('vendors.reviewNote')}:
                  </Typography>
                  <Typography variant="body2" sx={{ color: muiTheme.palette.text.secondary }}>
                    {vendor.reviewNote}
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            {vendor.verificationDocs?.map((doc) => (
              <Grid size={{ xs: 12 }} key={doc._id}>
                <Card sx={{ backgroundColor: panel, border: `1px solid ${border}` }}>
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getDocumentIcon(doc.mimeType)}
                          <Box sx={{ ml: 2 }}>
                            <Typography variant="subtitle1" sx={{ color: muiTheme.palette.text.primary }}>
                              {doc.type?.replace(/_/g, ' ').toUpperCase()}
                            </Typography>
                            <Typography variant="caption" sx={{ color: muiTheme.palette.text.secondary }}>
                              {doc.fileName || t('vendors.noDocumentName')}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        {doc.reviewNote && (
                          <Typography variant="caption" sx={{ color: muiTheme.palette.text.secondary }}>
                            Note: {doc.reviewNote}
                          </Typography>
                        )}
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Tooltip title={t('vendors.view')}>
                            <IconButton size="small" onClick={() => window.open(doc.fileUrl, '_blank')}>
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('vendors.download')}>
                            <IconButton size="small" href={doc.fileUrl} download sx={{ color: accent }}>
                              <FileDownload />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {(!vendor.verificationDocs || vendor.verificationDocs.length === 0) && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="info" sx={{ backgroundColor: panel, border: `1px solid ${border}` }}>
                  {t('vendors.noDocuments')}
                </Alert>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {auditLogs && auditLogs.length > 0 ? (
            <List>
              {auditLogs.map((log) => (
                <React.Fragment key={log._id}>
                  <ListItem sx={{ '&:hover': { backgroundColor: hover } }}>
                    <ListItemIcon>
                      <History sx={{ color: accent }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={log.action} size="small" color="primary" variant="outlined" />
                          <Typography variant="body2" sx={{ color: muiTheme.palette.text.primary }}>
                            by {log.actorUserId?.email || t('vendors.system')}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="caption" display="block" sx={{ color: muiTheme.palette.text.secondary }}>
                            {log.note}
                          </Typography>
                          <Typography variant="caption" sx={{ color: muiTheme.palette.text.secondary }}>
                            {log.createdAt ? format(new Date(log.createdAt), 'PPP pp') : ''}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                  <Divider sx={{ borderColor: border }} />
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Alert severity="info" sx={{ backgroundColor: panel, border: `1px solid ${border}` }}>
              {t('vendors.noAuditLogs')}
            </Alert>
          )}
        </TabPanel>
      </Paper>

      <Dialog open={reviewDialog} onClose={() => setReviewDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: surface, border: `1px solid ${border}` } }}>
        <DialogTitle>{t('vendors.setUnderReview')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('vendors.reviewNoteLabel')}
            fullWidth
            multiline
            rows={4}
            value={reviewNote}
            onChange={(event) => setReviewNote(event.target.value)}
            placeholder={t('vendors.reviewPlaceholder')}
            sx={fieldSx}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialog(false)}>{t('common.cancel')}</Button>
          <Button onClick={() => reviewNote.trim() && underReviewMutation.mutate({ note: reviewNote })} variant="contained" disabled={!reviewNote.trim() || underReviewMutation.isPending}>
            {underReviewMutation.isPending ? <CircularProgress size={20} color="inherit" /> : t('common.confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rejectDialog} onClose={() => setRejectDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: surface, border: `1px solid ${border}` } }}>
        <DialogTitle>{t('vendors.rejectVendor')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('vendors.rejectionReason')}
            fullWidth
            multiline
            rows={3}
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder={t('vendors.rejectionPlaceholder')}
            sx={fieldSx}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog(false)}>{t('common.cancel')}</Button>
          <Button onClick={() => rejectReason.trim() && rejectMutation.mutate({ reason: rejectReason })} variant="contained" color="error" disabled={!rejectReason.trim() || rejectMutation.isPending}>
            {rejectMutation.isPending ? <CircularProgress size={20} color="inherit" /> : t('vendors.reject')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={blockDialog} onClose={() => setBlockDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: surface, border: `1px solid ${border}` } }}>
        <DialogTitle>{t('vendors.blockVendor')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('vendors.blockReason')}
            fullWidth
            multiline
            rows={3}
            value={blockReason}
            onChange={(event) => setBlockReason(event.target.value)}
            placeholder={t('vendors.blockPlaceholder')}
            sx={fieldSx}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlockDialog(false)}>{t('common.cancel')}</Button>
          <Button onClick={() => blockReason.trim() && blockMutation.mutate({ reason: blockReason })} variant="contained" color="warning" disabled={!blockReason.trim() || blockMutation.isPending}>
            {blockMutation.isPending ? <CircularProgress size={20} color="inherit" /> : t('vendors.block')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VendorDetail;

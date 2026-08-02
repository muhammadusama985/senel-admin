import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  TextField,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import { resolveMediaUrl } from '../../utils/media';

interface BulkOffer {
  _id: string;
  productSnapshot?: { title?: string; currency?: string; moq?: number };
  vendorSnapshot?: { storeName?: string };
  adminSnapshot?: { displayName?: string; email?: string };
  buyerSnapshot?: { email?: string; firstName?: string; lastName?: string; companyName?: string };
  currentQty: number;
  currentUnitPrice: number;
  currency: string;
  lastActionBy: 'buyer' | 'seller';
  validUntil: string;
  status: string;
  messages: any[];
  paymentLink?: { token?: string; usedAt?: string };
  createdAt?: string;
  variantSku?: string;
  variantAttributes?: Record<string, string>;
  managedBy?: 'vendor' | 'admin';
}

const safeDate = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString();
};

const statusColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  requested: 'info',
  countered: 'warning',
  accepted: 'success',
  rejected: 'error',
  expired: 'default',
  cancelled: 'default',
};

/**
 * Admin Bulk Offer detail page.
 *
 * Mirrors the vendor BulkOfferDetail but talks to /bulk-offers/admin/*
 * (which only acts on offers where managedBy === "admin", i.e. offers on
 * admin/platform products). Admins can:
 *   - send a counter offer (qty + unitPrice)
 *   - accept the buyer's offer (generates a payment link)
 *   - reject the offer
 *   - send a free-form message in the conversation
 *   - delete a terminal-state offer
 */
const AdminBulkOfferDetail: React.FC = () => {
  const { offerId = '' } = useParams<{ offerId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [qty, setQty] = useState<number | ''>(0);
  const [unitPrice, setUnitPrice] = useState<number | ''>(0);
  const [notes, setNotes] = useState('');
  const [validDays, setValidDays] = useState<number | ''>(7);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [counterAttachmentUrls, setCounterAttachmentUrls] = useState<string[]>([]);
  const [messageAttachmentUrls, setMessageAttachmentUrls] = useState<string[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const handleAttachmentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadingAttachment(true);
    try {
      const fd = new FormData();
      fd.append('attachment', f);
      const r = await api.post('/attachments/upload', fd);
      setter((prev) => [...prev, r.data.url]);
    } catch (err: any) {
      alert(`Upload failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (
    url: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter((prev) => prev.filter((u) => u !== url));
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'bulk-offers', offerId],
    queryFn: async () => {
      const r = await api.get<{ offer: BulkOffer }>(`/bulk-offers/admin/${offerId}`);
      const o = r.data.offer;
      setQty(o.currentQty);
      setUnitPrice(o.currentUnitPrice);
      return o;
    },
    enabled: Boolean(offerId),
  });

  const offer = data;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'bulk-offers'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'bulk-offers', offerId] });
  };

  const counterMutation = useMutation({
    mutationFn: async () =>
      api.post(`/bulk-offers/admin/${offerId}/counter`, {
        qty,
        unitPrice,
        notes,
        validDays,
        attachments: counterAttachmentUrls.map((u) => ({ url: u, filename: u.split('/').pop() })),
      }),
    onSuccess: () => {
      setNotes('');
      setCounterAttachmentUrls([]);
      refetch();
      invalidate();
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async () => api.post(`/bulk-offers/admin/${offerId}/accept`),
    onSuccess: () => {
      refetch();
      invalidate();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reasonArg: string) =>
      api.post(`/bulk-offers/admin/${offerId}/reject`, { reason: reasonArg }),
    onSuccess: () => {
      refetch();
      invalidate();
    },
  });

  const messageMutation = useMutation({
    mutationFn: async () =>
      api.post(`/bulk-offers/admin/${offerId}/messages`, {
        message,
        attachments: messageAttachmentUrls.map((u) => ({ url: u, filename: u.split('/').pop() })),
      }),
    onSuccess: () => {
      setMessage('');
      setMessageAttachmentUrls([]);
      refetch();
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/bulk-offers/admin/${offerId}`),
    onSuccess: () => {
      invalidate();
      navigate('/negotiations/bulk-offers');
    },
  });

  const mutationError = (err: any) =>
    err?.response?.data?.message || err?.message || 'Action failed';

  if (isLoading) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }
  if (error || !offer) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Alert severity="error">Failed to load offer.</Alert>
        <Button onClick={() => navigate('/negotiations/bulk-offers')} sx={{ mt: 2 }}>
          ← Back to list
        </Button>
      </Box>
    );
  }

  const TERMINAL_STATUSES = ['accepted', 'rejected', 'expired', 'cancelled'];
  const canDelete = TERMINAL_STATUSES.includes(offer.status);
  // Admin actions only apply to offers managed by admin (i.e. offers on
  // admin/platform products). Vendor offers are read-only here because
  // they are handled by the vendor in their dashboard.
  const isAdminManaged = offer.managedBy === 'admin';
  const canAct =
    isAdminManaged &&
    !TERMINAL_STATUSES.includes(offer.status) &&
    offer.lastActionBy === 'buyer';

  const handleError = (label: string) => (err: any) => {
    // surface as inline alert via toast — kept simple here
    alert(`${label}: ${mutationError(err)}`);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/negotiations/bulk-offers')}
          sx={{ mr: 1 }}
        >
          Back
        </Button>
        <Typography variant="h4" sx={{ flex: 1 }}>
          Bulk Offer
        </Typography>
        <Chip
          label={offer.status}
          color={statusColors[offer.status] || 'default'}
          size="small"
        />
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Summary
        </Typography>
        <Stack spacing={0.5}>
          <Typography>
            <strong>Product:</strong> {offer.productSnapshot?.title || '-'}
          </Typography>
          <Typography>
            <strong>Buyer:</strong>{' '}
            {offer.buyerSnapshot?.companyName || offer.buyerSnapshot?.email || '-'}
          </Typography>
          {offer.managedBy === 'admin' ? (
            <Typography>
              <strong>Handler:</strong> Admin
              {offer.adminSnapshot?.displayName ? ` (${offer.adminSnapshot.displayName})` : ''}
            </Typography>
          ) : (
            <Typography>
              <strong>Vendor:</strong> {offer.vendorSnapshot?.storeName || '-'}
            </Typography>
          )}
          {(offer.variantSku ||
            (offer.variantAttributes && Object.keys(offer.variantAttributes).length > 0)) && (
            <Typography>
              <strong>Selected option:</strong>{' '}
              {offer.variantAttributes
                ? Object.entries(offer.variantAttributes)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(' / ')
                : ''}
              {offer.variantSku ? ` (SKU: ${offer.variantSku})` : ''}
            </Typography>
          )}
          <Typography>
            <strong>Current terms:</strong> {offer.currentQty} units @ {offer.currentUnitPrice}{' '}
            {offer.currency} ={' '}
            <strong>{(offer.currentQty * offer.currentUnitPrice).toFixed(2)} {offer.currency}</strong>
          </Typography>
          <Typography>
            <strong>Last action by:</strong> {offer.lastActionBy}
          </Typography>
          <Typography>
            <strong>Valid until:</strong> {safeDate(offer.validUntil)}
          </Typography>
          <Typography>
            <strong>Created:</strong> {safeDate(offer.createdAt)}
          </Typography>
          {offer.paymentLink?.token && (
            <Typography>
              <strong>Payment link:</strong> generated {offer.paymentLink.usedAt ? '(used)' : '(open)'}
            </Typography>
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Conversation
        </Typography>
        {offer.messages?.length ? (
          <Stack spacing={1}>
            {offer.messages.map((m, idx) => (
              <Paper
                key={idx}
                variant="outlined"
                sx={{ p: 1.5, backgroundColor: 'background.default' }}
              >
                <Stack direction="row" justifyContent="space-between">
                  <Typography fontWeight={600}>
                    {m.senderName || m.senderRole || 'Sender'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {safeDate(m.createdAt)}
                  </Typography>
                </Stack>
                {m.qty != null && m.unitPrice != null && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Offered: {m.qty} units @ {m.unitPrice} {m.currency}
                  </Typography>
                )}
                {m.notes ? (
                  <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                    {m.notes}
                  </Typography>
                ) : null}
                {m.attachments && m.attachments.length > 0 && (
                  <Box
                    sx={{
                      mt: 1,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                      gap: 1,
                    }}
                  >
                    {m.attachments.map((a: any, idx: number) => {
                      const _url = resolveMediaUrl(a.url);
                      if (!_url) return null;
                      const _isImage = (a.mimeType ? a.mimeType.startsWith('image/') : true) && /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(_url);
                      return (
                        <a
                          key={idx}
                          href={_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'block',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            overflow: 'hidden',
                            background: 'background.default',
                          }}
                        >
                          {_isImage ? (
                            <img
                              src={_url}
                              alt={a.filename || a.url}
                              style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
                            />
                          ) : (
                            <Box sx={{ p: 1, fontSize: '0.85rem', wordBreak: 'break-all' }}>
                              {a.filename || a.url}
                            </Box>
                          )}
                        </a>
                      );
                    })}
                  </Box>
                )}
              </Paper>
            ))}
          </Stack>
        ) : (
          <Typography color="text.secondary">No messages yet.</Typography>
        )}
      </Paper>

      {!isAdminManaged && !TERMINAL_STATUSES.includes(offer.status) && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Alert severity="info">
            This offer is being handled by the vendor ({offer.vendorSnapshot?.storeName || '-'}).
            Use the vendor dashboard to counter / accept / reject this offer. You can only
            delete it from here.
          </Alert>
        </Paper>
      )}

      {canAct && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Your response
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <TextField
              type="number"
              label="Quantity"
              value={qty}
              onChange={(e) => setQty(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10)))}
              inputProps={{ min: 1 }}
              fullWidth
            />
            <TextField
              type="number"
              label={`Unit Price (${offer.currency})`}
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)))}
              inputProps={{ min: 0, step: 0.01 }}
              fullWidth
            />
            <TextField
              type="number"
              label="Extend validity (days)"
              value={validDays}
              onChange={(e) => setValidDays(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10)))}
              inputProps={{ min: 1, max: 90 }}
              fullWidth
            />
          </Stack>
          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            sx={{ mb: 2 }}
          />
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              Attachments (images, optional)
            </Typography>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleAttachmentUpload(e, setCounterAttachmentUrls)}
              disabled={uploadingAttachment}
            />
            {counterAttachmentUrls.length > 0 && (
              <Box
                sx={{
                  mt: 1,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: 1,
                }}
              >
                {counterAttachmentUrls.map((u) => {
                  const _url = resolveMediaUrl(u);
                  if (!_url) return null;
                  const _isImage = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(_url);
                  return (
                    <Box
                      key={u}
                      sx={{
                        position: 'relative',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        overflow: 'hidden',
                        background: 'background.default',
                      }}
                    >
                      <a href={_url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                        {_isImage ? (
                          <img
                            src={_url}
                            alt={u.split('/').pop()}
                            style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
                          />
                        ) : (
                          <Box sx={{ p: 1, fontSize: '0.8rem', wordBreak: 'break-all' }}>
                            {u.split('/').pop()}
                          </Box>
                        )}
                      </a>
                      <Button
                        size="small"
                        onClick={() => removeAttachment(u, setCounterAttachmentUrls)}
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          minWidth: 0,
                          padding: '2px 6px',
                          background: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          fontSize: '0.75rem',
                          lineHeight: 1,
                          '&:hover': { background: 'rgba(0,0,0,0.8)' },
                        }}
                      >
                        ×
                      </Button>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              variant="contained"
              disabled={counterMutation.isPending}
              onClick={() =>
                counterMutation.mutate(undefined, { onError: handleError('Counter') })
              }
            >
              Send Counter
            </Button>
            <Button
              variant="contained"
              color="success"
              disabled={acceptMutation.isPending}
              onClick={() => {
                if (window.confirm('Accept this offer? A payment link will be generated for the buyer.')) {
                  acceptMutation.mutate(undefined, { onError: handleError('Accept') });
                }
              }}
            >
              Accept
            </Button>
            <Button
              variant="outlined"
              color="error"
              disabled={rejectMutation.isPending}
              onClick={() => {
                const r = window.prompt('Reason for rejection (optional):') || '';
                setReason(r);
                rejectMutation.mutate(r, { onError: handleError('Reject') });
              }}
            >
              Reject
            </Button>
          </Stack>
          {(counterMutation.error ||
            acceptMutation.error ||
            rejectMutation.error) && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {mutationError(
                counterMutation.error ||
                  acceptMutation.error ||
                  rejectMutation.error
              )}
            </Alert>
          )}
        </Paper>
      )}

      {!canAct && !TERMINAL_STATUSES.includes(offer.status) && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Alert severity="info">
            Waiting for the buyer's response. You will be able to counter / accept / reject
            once the buyer sends a message.
          </Alert>
        </Paper>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Send a message
        </Typography>
        <TextField
          label="Message to buyer"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          multiline
          minRows={2}
          fullWidth
          sx={{ mb: 1 }}
        />
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Attachments (images, optional)
          </Typography>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleAttachmentUpload(e, setMessageAttachmentUrls)}
            disabled={uploadingAttachment}
          />
          {messageAttachmentUrls.length > 0 && (
            <Box
              sx={{
                mt: 1,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: 1,
              }}
            >
              {messageAttachmentUrls.map((u) => {
                const _url = resolveMediaUrl(u);
                if (!_url) return null;
                const _isImage = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(_url);
                return (
                  <Box
                    key={u}
                    sx={{
                      position: 'relative',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      overflow: 'hidden',
                      background: 'background.default',
                    }}
                  >
                    <a href={_url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                      {_isImage ? (
                        <img
                          src={_url}
                          alt={u.split('/').pop()}
                          style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        <Box sx={{ p: 1, fontSize: '0.8rem', wordBreak: 'break-all' }}>
                          {u.split('/').pop()}
                        </Box>
                      )}
                    </a>
                    <Button
                      size="small"
                      onClick={() => removeAttachment(u, setMessageAttachmentUrls)}
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        minWidth: 0,
                        padding: '2px 6px',
                        background: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        fontSize: '0.75rem',
                        lineHeight: 1,
                        '&:hover': { background: 'rgba(0,0,0,0.8)' },
                      }}
                    >
                      ×
                    </Button>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
        <Button
          variant="outlined"
          disabled={!isAdminManaged || (!message.trim() && messageAttachmentUrls.length === 0) || messageMutation.isPending}
          onClick={() =>
            messageMutation.mutate(undefined, { onError: handleError('Message') })
          }
        >
          Send Message
        </Button>
        {messageMutation.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {mutationError(messageMutation.error)}
          </Alert>
        )}
      </Paper>

      {canDelete && (
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography color="text.secondary">
              This offer is in a terminal state. You can permanently delete it.
            </Typography>
            <Tooltip title="Delete this offer">
              <span>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteOutlineIcon />}
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        'Delete this offer permanently? This cannot be undone.'
                      )
                    ) {
                      deleteMutation.mutate(undefined, {
                        onError: handleError('Delete'),
                      });
                    }
                  }}
                >
                  Delete Permanently
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default AdminBulkOfferDetail;
import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

interface RFQ {
  _id: string;
  productSnapshot?: { title?: string; currency?: string };
  vendorSnapshot?: { storeName?: string };
  adminSnapshot?: { displayName?: string; email?: string };
  buyerSnapshot?: { email?: string; firstName?: string; lastName?: string; companyName?: string };
  qty: number;
  specifications?: string;
  deliveryExpectations?: string;
  attachments?: any[];
  shippingAddress?: any;
  validUntil: string;
  status: string;
  messages: any[];
  quotation?: any;
  paymentLink?: { token?: string; usedAt?: string };
  createdAt?: string;
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
  quoted: 'warning',
  accepted: 'success',
  rejected: 'error',
  expired: 'default',
  cancelled: 'default',
  in_production: 'primary',
  completed: 'success',
};

/**
 * Admin Custom Production (RFQ) detail page.
 *
 * Mirrors the vendor CustomProductionDetail but talks to
 * /custom-production/admin/* (which only acts on RFQs where
 * managedBy === "admin", i.e. RFQs on admin/platform products).
 * Admins can:
 *   - send / update the quotation (unitPrice, lead time, terms, etc.)
 *   - send a free-form message in the conversation
 *   - reject the RFQ
 *   - mark the order in production (after payment)
 *   - mark production completed
 *   - delete a terminal-state RFQ
 */
const AdminCustomProductionDetail: React.FC = () => {
  const { rfqId = '' } = useParams<{ rfqId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Quotation form
  const [unitPrice, setUnitPrice] = useState<number | ''>(0);
  const [totalPrice, setTotalPrice] = useState<number | ''>(0);
  const [leadTimeDays, setLeadTimeDays] = useState<number | ''>(0);
  const [productionNotes, setProductionNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [validDays, setValidDays] = useState<number | ''>(14);
  const [quotationMessage, setQuotationMessage] = useState('');
  const [conversationMessage, setConversationMessage] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'custom-production', rfqId],
    queryFn: async () => {
      const r = await api.get<{ rfq: RFQ }>(`/custom-production/admin/${rfqId}`);
      const d = r.data.rfq;
      setUnitPrice(d.quotation?.unitPrice || 0);
      setTotalPrice(d.quotation?.totalPrice || 0);
      setLeadTimeDays(d.quotation?.leadTimeDays || 0);
      setProductionNotes(d.quotation?.productionNotes || '');
      setTermsAndConditions(d.quotation?.termsAndConditions || '');
      return d;
    },
    enabled: Boolean(rfqId),
  });

  const rfq = data;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'custom-production'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'custom-production', rfqId] });
  };

  const quotationMutation = useMutation({
    mutationFn: async () =>
      api.post(`/custom-production/admin/${rfqId}/quotation`, {
        unitPrice,
        totalPrice: totalPrice || undefined,
        leadTimeDays,
        productionNotes,
        termsAndConditions,
        validDays,
        message: quotationMessage,
      }),
    onSuccess: () => {
      setQuotationMessage('');
      refetch();
      invalidate();
    },
  });

  const messageMutation = useMutation({
    mutationFn: async () =>
      api.post(`/custom-production/admin/${rfqId}/messages`, { message: conversationMessage }),
    onSuccess: () => {
      setConversationMessage('');
      refetch();
      invalidate();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reason: string) =>
      api.post(`/custom-production/admin/${rfqId}/reject`, { reason }),
    onSuccess: () => {
      refetch();
      invalidate();
    },
  });

  const startProductionMutation = useMutation({
    mutationFn: async () => api.post(`/custom-production/admin/${rfqId}/start-production`),
    onSuccess: () => {
      refetch();
      invalidate();
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => api.post(`/custom-production/admin/${rfqId}/complete`),
    onSuccess: () => {
      refetch();
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/custom-production/admin/${rfqId}`),
    onSuccess: () => {
      invalidate();
      navigate('/negotiations/custom-production');
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
  if (error || !rfq) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Alert severity="error">Failed to load request.</Alert>
        <Button onClick={() => navigate('/negotiations/custom-production')} sx={{ mt: 2 }}>
          ← Back to list
        </Button>
      </Box>
    );
  }

  const TERMINAL_STATUSES = ['rejected', 'expired', 'cancelled', 'completed', 'accepted'];
  const isTerminal = TERMINAL_STATUSES.includes(rfq.status);
  // Admin actions only apply to RFQs managed by admin (i.e. RFQs on
  // admin/platform products). Vendor RFQs are read-only here because
  // they are handled by the vendor in their dashboard.
  const isAdminManaged = rfq.managedBy === 'admin';

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/negotiations/custom-production')}
          sx={{ mr: 1 }}
        >
          Back
        </Button>
        <Typography variant="h4" sx={{ flex: 1 }}>
          Custom Production Request
        </Typography>
        <Chip
          label={rfq.status}
          color={statusColors[rfq.status] || 'default'}
          size="small"
        />
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Request Summary
        </Typography>
        <Stack spacing={0.5}>
          <Typography>
            <strong>Product:</strong> {rfq.productSnapshot?.title || '-'}
          </Typography>
          <Typography>
            <strong>Buyer:</strong>{' '}
            {rfq.buyerSnapshot?.companyName || rfq.buyerSnapshot?.email || '-'}
          </Typography>
          {rfq.managedBy === 'admin' ? (
            <Typography>
              <strong>Handler:</strong> Admin
              {rfq.adminSnapshot?.displayName ? ` (${rfq.adminSnapshot.displayName})` : ''}
            </Typography>
          ) : (
            <Typography>
              <strong>Vendor:</strong> {rfq.vendorSnapshot?.storeName || '-'}
            </Typography>
          )}
          <Typography>
            <strong>Quantity:</strong> {rfq.qty}
          </Typography>
          <Typography>
            <strong>Valid until:</strong> {safeDate(rfq.validUntil)}
          </Typography>
          <Typography>
            <strong>Created:</strong> {safeDate(rfq.createdAt)}
          </Typography>
          {rfq.paymentLink?.token && (
            <Typography>
              <strong>Payment link:</strong>{' '}
              generated {rfq.paymentLink.usedAt ? '(used)' : '(open)'}
            </Typography>
          )}
        </Stack>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1">Specifications</Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
          {rfq.specifications}
        </Typography>

        {rfq.deliveryExpectations && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1">Delivery Expectations</Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {rfq.deliveryExpectations}
            </Typography>
          </>
        )}

        {rfq.attachments && rfq.attachments.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1">Attachments</Typography>
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
              {rfq.attachments.map((a: any, idx: number) => (
                <Typography key={idx} variant="body2">
                  <a href={a.url} target="_blank" rel="noreferrer">
                    {a.filename || a.url}
                  </a>
                </Typography>
              ))}
            </Stack>
          </>
        )}

        {rfq.shippingAddress && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1">Shipping Address</Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {[
                rfq.shippingAddress.companyName,
                rfq.shippingAddress.street,
                rfq.shippingAddress.city,
                rfq.shippingAddress.country,
              ]
                .filter(Boolean)
                .join(', ')}
            </Typography>
          </>
        )}
      </Paper>

      {rfq.quotation && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Latest Quotation
          </Typography>
          <Stack spacing={0.5}>
            <Typography>
              <strong>Unit:</strong> {rfq.quotation.unitPrice} {rfq.quotation.currency} •{' '}
              <strong>Total:</strong> {rfq.quotation.totalPrice} {rfq.quotation.currency}
            </Typography>
            <Typography>
              <strong>Lead time:</strong> {rfq.quotation.leadTimeDays} days
            </Typography>
            {rfq.quotation.productionNotes && (
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                {rfq.quotation.productionNotes}
              </Typography>
            )}
            {rfq.quotation.termsAndConditions && (
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {rfq.quotation.termsAndConditions}
              </Typography>
            )}
          </Stack>
        </Paper>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Conversation
        </Typography>
        {rfq.messages?.length ? (
          <Stack spacing={1}>
            {rfq.messages.map((m: any, idx: number) => (
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
                {m.message ? (
                  <Typography
                    variant="body2"
                    sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}
                  >
                    {m.message}
                  </Typography>
                ) : null}
              </Paper>
            ))}
          </Stack>
        ) : (
          <Typography color="text.secondary">No messages yet.</Typography>
        )}
      </Paper>

      {!isAdminManaged && !isTerminal && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Alert severity="info">
            This request is being handled by the vendor ({rfq.vendorSnapshot?.storeName || '-'}).
            Use the vendor dashboard to send the quotation, reject, or mark production. You can
            only delete it from here.
          </Alert>
        </Paper>
      )}

      {!isTerminal && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Send / Update Quotation
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <TextField
              type="number"
              label="Unit Price"
              value={unitPrice}
              onChange={(e) => {
                if (e.target.value === '') {
                  setUnitPrice('');
                  setTotalPrice('');
                  return;
                }
                const v = Math.max(0, parseFloat(e.target.value));
                setUnitPrice(v);
                setTotalPrice(Number((v * rfq.qty).toFixed(2)));
              }}
              inputProps={{ min: 0, step: 0.01 }}
              fullWidth
            />
            <TextField
              type="number"
              label="Total Price (auto)"
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)))}
              inputProps={{ min: 0, step: 0.01 }}
              fullWidth
            />
            <TextField
              type="number"
              label="Lead time (days)"
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10)))}
              inputProps={{ min: 0 }}
              fullWidth
            />
            <TextField
              type="number"
              label="Validity (days)"
              value={validDays}
              onChange={(e) =>
                setValidDays(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10)))
              }
              inputProps={{ min: 1, max: 180 }}
              fullWidth
            />
          </Stack>
          <TextField
            label="Production notes"
            value={productionNotes}
            onChange={(e) => setProductionNotes(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Terms & Conditions"
            value={termsAndConditions}
            onChange={(e) => setTermsAndConditions(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Message to buyer (optional)"
            value={quotationMessage}
            onChange={(e) => setQuotationMessage(e.target.value)}
            multiline
            minRows={2}
            fullWidth
            sx={{ mb: 2 }}
          />
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              variant="contained"
              disabled={!isAdminManaged || quotationMutation.isPending}
              onClick={() =>
                quotationMutation.mutate(undefined, { onError: (e) =>
                  alert(`Quotation: ${mutationError(e)}`) })
              }
            >
              Send Quotation
            </Button>
            <Button
              variant="outlined"
              color="error"
              disabled={!isAdminManaged || rejectMutation.isPending}
              onClick={() => {
                const r = window.prompt('Reason for rejection (optional):') || '';
                rejectMutation.mutate(r, { onError: (e) =>
                  alert(`Reject: ${mutationError(e)}`) });
              }}
            >
              Reject
            </Button>
          </Stack>
          {quotationMutation.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {mutationError(quotationMutation.error)}
            </Alert>
          )}
        </Paper>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Send a message
        </Typography>
        <TextField
          label="Message to buyer"
          value={conversationMessage}
          onChange={(e) => setConversationMessage(e.target.value)}
          multiline
          minRows={2}
          fullWidth
          sx={{ mb: 1 }}
        />
        <Button
          variant="outlined"
          disabled={!isAdminManaged || !conversationMessage.trim() || messageMutation.isPending}
          onClick={() =>
            messageMutation.mutate(undefined, { onError: (e) =>
              alert(`Message: ${mutationError(e)}`) })
          }
        >
          Send Message
        </Button>
      </Paper>

      {(rfq.status === 'accepted' || rfq.status === 'in_production') && isAdminManaged && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={1}>
            {rfq.status === 'accepted' && (
              <Button
                variant="contained"
                color="primary"
                disabled={startProductionMutation.isPending}
                onClick={() =>
                  startProductionMutation.mutate(undefined, { onError: (e) =>
                    alert(`Start production: ${mutationError(e)}`) })
                }
              >
                Start Production
              </Button>
            )}
            {rfq.status === 'in_production' && (
              <Button
                variant="contained"
                color="success"
                disabled={!isAdminManaged || completeMutation.isPending}
                onClick={() =>
                  completeMutation.mutate(undefined, { onError: (e) =>
                    alert(`Complete: ${mutationError(e)}`) })
                }
              >
                Mark Production Completed
              </Button>
            )}
          </Stack>
        </Paper>
      )}

      {isTerminal && (
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography color="text.secondary">
              This request is in a terminal state. You can permanently delete it.
            </Typography>
            <Tooltip title="Delete this request">
              <span>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteOutlineIcon />}
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        'Delete this request permanently? This cannot be undone.'
                      )
                    ) {
                      deleteMutation.mutate(undefined, {
                        onError: (e) => alert(`Delete: ${mutationError(e)}`),
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

export default AdminCustomProductionDetail;
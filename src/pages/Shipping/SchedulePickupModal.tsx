import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { DateTimePicker } from '@mui/x-date-pickers';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

interface Props {
  open: boolean;
  onClose: () => void;
  order: any;
  onSuccess: () => void;
}

const SchedulePickupModal: React.FC<Props> = ({ open, onClose, order, onSuccess }) => {
  const muiTheme = useMuiTheme();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    scheduledAt: new Date(),
    pickupWindow: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const surface = muiTheme.palette.background.paper;
  const border = muiTheme.palette.divider;
  const textPrimary = muiTheme.palette.text.primary;
  const textSecondary = muiTheme.palette.text.secondary;
  const accent = muiTheme.palette.secondary.main;

  const fieldSx = {
    '& .MuiInputLabel-root': { color: textSecondary },
    '& .MuiOutlinedInput-root': {
      color: textPrimary,
      backgroundColor: surface,
      '& fieldset': { borderColor: border },
      '&:hover fieldset': { borderColor: accent },
      '&.Mui-focused fieldset': { borderColor: accent },
    },
    '& .MuiSvgIcon-root': { color: textPrimary },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const vendorOrderId = order?._id || order?.vendorOrderId || order?.id;
      if (!vendorOrderId) {
        setError(t('shipping.cannotScheduleMissingVendorOrder'));
        setLoading(false);
        return;
      }
      await api.post(`/admin/vendor-orders/${vendorOrderId}/schedule-pickup`, {
        scheduledAt: formData.scheduledAt.toISOString(),
        pickupWindow: formData.pickupWindow,
        notes: formData.notes,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t('shipping.failedSchedulePickup'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: surface,
          color: textPrimary,
          border: `1px solid ${border}`,
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>{t('shipping.schedulePickupTitle')}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {order && (
            <Box sx={{ mb: 2, p: 2, bgcolor: muiTheme.palette.action.hover, borderRadius: 1 }}>
              <Box sx={{ fontSize: '0.9rem', color: textSecondary }}>{t('shipping.orderLabel', { value: order.vendorOrderNumber })}</Box>
              <Box sx={{ fontSize: '0.9rem', color: textPrimary, fontWeight: 500 }}>{t('shipping.vendorLabel', { value: order.vendorStoreName })}</Box>
            </Box>
          )}

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <DateTimePicker
            label={t('shipping.pickupDateTime')}
            value={formData.scheduledAt}
            onChange={(newValue) => setFormData({ ...formData, scheduledAt: newValue || new Date() })}
            sx={{ width: '100%', mb: 2, ...fieldSx }}
          />

          <TextField
            fullWidth
            label={t('shipping.pickupWindow')}
            value={formData.pickupWindow}
            onChange={(e) => setFormData({ ...formData, pickupWindow: e.target.value })}
            placeholder={t('shipping.pickupWindowPlaceholder')}
            margin="normal"
            sx={fieldSx}
          />

          <TextField
            fullWidth
            label={t('shipping.notes')}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder={t('shipping.notesPlaceholder')}
            multiline
            rows={3}
            margin="normal"
            sx={fieldSx}
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${border}`, p: 2 }}>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} color="inherit" /> : t('shipping.schedule')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default SchedulePickupModal;

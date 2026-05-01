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
  Typography,
} from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import { DateTimePicker } from '@mui/x-date-pickers';
import { useTranslation } from 'react-i18next';
import api from '../../../api/client';

interface Props {
  open: boolean;
  onClose: () => void;
  order: any;
  onSuccess: () => void;
}

const SchedulePickupDialog: React.FC<Props> = ({ open, onClose, order, onSuccess }) => {
  const muiTheme = useMuiTheme();
  const { t } = useTranslation();
  const isLight = muiTheme.palette.mode === 'light';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    scheduledAt: new Date(),
    pickupWindow: '',
    notes: '',
  });

  const surface = muiTheme.palette.background.paper;
  const border = muiTheme.palette.divider;
  const hover = alpha(muiTheme.palette.primary.main, isLight ? 0.06 : 0.14);
  const accent = muiTheme.palette.secondary.main;

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      color: muiTheme.palette.text.primary,
      backgroundColor: surface,
      '& fieldset': { borderColor: border },
      '&:hover fieldset': { borderColor: accent },
      '&.Mui-focused fieldset': { borderColor: muiTheme.palette.primary.main },
    },
    '& .MuiInputLabel-root': { color: muiTheme.palette.text.secondary },
    '& .MuiInputLabel-root.Mui-focused': { color: muiTheme.palette.primary.main },
    '& .MuiSvgIcon-root': { color: muiTheme.palette.text.secondary },
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
      setError(err.response?.data?.message || t('shipping.failedSchedulePickup'));
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
          border: `1px solid ${border}`,
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle>{t('shipping.schedulePickupTitle')}</DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          {order && (
            <Box
              sx={{
                mb: 2,
                p: 2,
                backgroundColor: alpha(muiTheme.palette.primary.main, isLight ? 0.06 : 0.12),
                borderRadius: 1.5,
              }}
            >
              <Typography variant="body2" sx={{ color: muiTheme.palette.text.secondary }}>
                {t('shipping.orderLabel', { value: order.vendorOrderNumber })}
              </Typography>
              <Typography variant="body1" sx={{ color: accent, fontWeight: 700 }}>
                {t('shipping.vendorLabel', { value: order.vendorStoreName })}
              </Typography>
            </Box>
          )}

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 2,
                backgroundColor: alpha(muiTheme.palette.error.main, isLight ? 0.08 : 0.14),
                border: `1px solid ${alpha(muiTheme.palette.error.main, 0.24)}`,
              }}
            >
              {error}
            </Alert>
          )}

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
            onChange={(event) => setFormData({ ...formData, pickupWindow: event.target.value })}
            placeholder={t('shipping.pickupWindowPlaceholder')}
            margin="normal"
            sx={fieldSx}
          />

          <TextField
            fullWidth
            label={t('shipping.notes')}
            value={formData.notes}
            onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
            placeholder={t('shipping.notesPlaceholder')}
            multiline
            rows={3}
            margin="normal"
            sx={fieldSx}
          />
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} sx={{ '&:hover': { backgroundColor: hover } }}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} color="inherit" /> : t('shipping.schedulePickup')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default SchedulePickupDialog;

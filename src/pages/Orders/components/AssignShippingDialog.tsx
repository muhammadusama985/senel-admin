import React, { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import api from '../../../api/client';

interface Props {
  open: boolean;
  onClose: () => void;
  order: any;
  onSuccess: () => void;
}

const AssignShippingDialog: React.FC<Props> = ({ open, onClose, order, onSuccess }) => {
  const muiTheme = useMuiTheme();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shippingCompanies, setShippingCompanies] = useState<any[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [formData, setFormData] = useState({
    partnerName: '',
    trackingCode: '',
  });

  const surface = muiTheme.palette.background.paper;
  const border = muiTheme.palette.divider;
  const textPrimary = muiTheme.palette.text.primary;
  const textSecondary = muiTheme.palette.text.secondary;
  const accent = muiTheme.palette.secondary.main;

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      color: textPrimary,
      backgroundColor: surface,
      '& fieldset': { borderColor: border },
      '&:hover fieldset': { borderColor: accent },
      '&.Mui-focused fieldset': { borderColor: accent },
    },
    '& .MuiInputLabel-root': { color: textSecondary },
  };

  // Fetch shipping companies when dialog opens
  useEffect(() => {
    if (open) {
      fetchShippingCompanies();
    }
  }, [open]);

  const fetchShippingCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const response = await api.get('/admin/shipping-companies?activeOnly=true');
      setShippingCompanies(response.data.shippingCompanies || []);
    } catch (err) {
      console.error('Failed to fetch shipping companies:', err);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const vendorOrderId = order?._id || order?.vendorOrderId || order?.id;
      if (!vendorOrderId) {
        setError(t('shipping.cannotAssignMissingVendorOrder'));
        setLoading(false);
        return;
      }
      await api.post(`/admin/vendor-orders/${vendorOrderId}/assign-shipping`, formData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || t('shipping.failedAssignShipping'));
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
      <DialogTitle sx={{ color: textPrimary }}>{t('shipping.assignShippingTitle')}</DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          {order && (
            <Box sx={{ mb: 2, p: 2, bgcolor: muiTheme.palette.action.hover, borderRadius: 1 }}>
              <Typography variant="body2" sx={{ color: textSecondary }}>
                {t('shipping.orderLabel', { value: order.vendorOrderNumber })}
              </Typography>
              <Typography variant="body1" sx={{ color: textPrimary, fontWeight: 600 }}>
                {t('shipping.vendorLabel', { value: order.vendorStoreName })}
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <FormControl fullWidth margin="normal" sx={fieldSx}>
            <InputLabel>{t('shipping.carrier')}</InputLabel>
            <Select
              value={formData.partnerName}
              label={t('shipping.carrier')}
              onChange={(e) => setFormData({ ...formData, partnerName: e.target.value })}
              required
              disabled={loadingCompanies}
            >
              {loadingCompanies ? (
                <MenuItem value="">
                  <CircularProgress size={20} />
                </MenuItem>
              ) : shippingCompanies.length === 0 ? (
                <MenuItem value="" disabled>
                  No shipping companies available
                </MenuItem>
              ) : (
                shippingCompanies.map((company) => (
                  <MenuItem key={company._id} value={company.name}>
                    {company.name}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label={t('shipping.trackingNumber')}
            value={formData.trackingCode}
            onChange={(e) => setFormData({ ...formData, trackingCode: e.target.value })}
            placeholder={t('shipping.trackingPlaceholder')}
            margin="normal"
            sx={fieldSx}
          />
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" variant="contained" disabled={loading || !formData.partnerName}>
            {loading ? <CircularProgress size={20} color="inherit" /> : t('shipping.assign')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AssignShippingDialog;

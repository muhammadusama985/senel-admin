import React, { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Typography } from '@mui/material';
import { Lock } from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/client';

const PasswordResetManagement: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
      const response = await api.post('/admin/change-password', data);
      return response.data;
    },
    onSuccess: () => {
      setPasswordDialogOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFormError('');
      alert(t('passwordManagement.passwordChanged', 'Password changed successfully'));
    },
    onError: (err: any) => {
      const errors = err.response?.data?.errors;
      if (errors && Array.isArray(errors)) {
        setFormError(errors.join('\n'));
      } else {
        setFormError(err.response?.data?.message || t('passwordManagement.failedToChange', 'Failed to change password'));
      }
    },
  });

  const handleChangePassword = () => {
    setFormError('');
    
    if (!currentPassword) {
      setFormError(t('passwordManagement.currentRequired', 'Current password is required'));
      return;
    }
    if (!newPassword) {
      setFormError(t('passwordManagement.newRequired', 'New password is required'));
      return;
    }
    if (!confirmPassword) {
      setFormError(t('passwordManagement.confirmRequired', 'Confirm password is required'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError(t('passwordManagement.passwordMismatch', 'New password and confirm password do not match'));
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
      confirmPassword,
    });
  };

  return (
    <Box className="page-shell" sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4">{t('passwordManagement.title', 'Password Management')}</Typography>
          <Typography variant="body1" color="text.secondary">
            {t('passwordManagement.intro', 'Manage your password and account security')}
          </Typography>
        </Box>

        <Card sx={{ maxWidth: 600 }}>
          <CardContent>
            <Stack spacing={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    backgroundColor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                  }}
                >
                  {user?.email?.charAt(0).toUpperCase() || 'A'}
                </Box>
                <Box>
                  <Typography variant="h6">{user?.email || 'Admin'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('passwordManagement.accountInfo', 'Account Information')}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 150 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('passwordManagement.email', 'Email')}
                  </Typography>
                  <Typography variant="body1">{user?.email || '-'}</Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 150 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('passwordManagement.status', 'Status')}
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'success.main' }}>
                    {user?.status || 'Active'}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 150 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('passwordManagement.role', 'Role')}
                  </Typography>
                  <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                    {user?.role || 'Admin'}
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ maxWidth: 600 }}>
          <CardContent>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Lock color="primary" />
                <Typography variant="h6">{t('passwordManagement.changePassword', 'Change Password')}</Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                {t('passwordManagement.changePasswordDesc', 'Update your password regularly to keep your account secure')}
              </Typography>

              <Button
                variant="contained"
                color="primary"
                startIcon={<Lock />}
                onClick={() => {
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setFormError('');
                  setPasswordDialogOpen(true);
                }}
                sx={{ alignSelf: 'flex-start' }}
              >
                {t('passwordManagement.changePasswordBtn', 'Change Password')}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('passwordManagement.dialogTitle', 'Change Password')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info" sx={{ mb: 1 }}>
              {t('passwordManagement.requirements', 'Password must contain:')}
              <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                <li>{t('passwordManagement.minLength', 'At least 8 characters')}</li>
                <li>{t('passwordManagement.maxLength', 'Maximum 50 characters')}</li>
                <li>{t('passwordManagement.lowercase', 'At least one lowercase letter')}</li>
                <li>{t('passwordManagement.uppercase', 'At least one uppercase letter')}</li>
                <li>{t('passwordManagement.number', 'At least one number')}</li>
                <li>{t('passwordManagement.special', 'At least one special character (!@#$%^&*(),.?":{}|<>)')}</li>
              </ul>
            </Alert>

            {formError && (
              <Alert severity="error" sx={{ whiteSpace: 'pre-line' }}>
                {formError}
              </Alert>
            )}

            <TextField
              label={t('passwordManagement.currentPassword', 'Current Password')}
              type="password"
              fullWidth
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />

            <TextField
              label={t('passwordManagement.newPassword', 'New Password')}
              type="password"
              fullWidth
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />

            <TextField
              label={t('passwordManagement.confirmPassword', 'Confirm New Password')}
              type="password"
              fullWidth
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleChangePassword}
            disabled={changePasswordMutation.isPending}
          >
            {changePasswordMutation.isPending ? t('common.saving', 'Saving...') : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PasswordResetManagement;
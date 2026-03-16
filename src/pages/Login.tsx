import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Email, Lock, Visibility, VisibilityOff } from '@mui/icons-material';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import Logo from '../components/common/Logo';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const muiTheme = useMuiTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isLight = muiTheme.palette.mode === 'light';
  const surface = muiTheme.palette.background.paper;
  const border = muiTheme.palette.divider;
  const textPrimary = muiTheme.palette.text.primary;
  const textSecondary = muiTheme.palette.text.secondary;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2,
      backgroundColor: surface,
      color: textPrimary,
      '& fieldset': { borderColor: border },
      '&:hover fieldset': { borderColor: muiTheme.palette.primary.main },
      '&.Mui-focused fieldset': {
        borderColor: muiTheme.palette.primary.main,
        borderWidth: '2px',
      },
    },
    '& .MuiInputLabel-root': {
      color: textSecondary,
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: muiTheme.palette.primary.main,
    },
    '& .MuiFormHelperText-root': {
      color: muiTheme.palette.error.main,
      marginLeft: 0,
    },
    '& input': {
      '&:-webkit-autofill': {
        WebkitBoxShadow: `0 0 0 100px ${surface} inset`,
        WebkitTextFillColor: textPrimary,
        caretColor: textPrimary,
        borderRadius: 'inherit',
      },
    },
    '& input::placeholder': {
      color: textSecondary,
      opacity: 1,
    },
  };

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', {
        email: data.email,
        password: data.password,
      });

      const { accessToken, user } = response.data;

      if (user.role !== 'admin') {
        setError('Access denied. Admin only.');
        return;
      }

      localStorage.setItem('adminToken', accessToken);
      useAuthStore.getState().setUser(user);
      navigate('/');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Invalid email or password');
      } else if (err.response?.status === 403) {
        setError('Access denied. Admin only.');
      } else if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
        setError('Cannot connect to server. Make sure backend is running.');
      } else {
        setError(err.response?.data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isLight
          ? 'linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%)'
          : 'linear-gradient(180deg, #0a1020 0%, #0d1328 100%)',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            p: { xs: 4, sm: 5 },
            borderRadius: 4,
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: surface,
            border: `1px solid ${border}`,
          }}
        >
          <Box
            sx={{
              textAlign: 'center',
              mb: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                position: 'relative',
                display: 'inline-flex',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: -14,
                  background: alpha(muiTheme.palette.primary.main, isLight ? 0.12 : 0.28),
                  borderRadius: '50%',
                  filter: 'blur(16px)',
                  zIndex: 1,
                },
              }}
            >
              <Box
                sx={{
                  borderRadius: '50%',
                  p: 1,
                  display: 'inline-flex',
                  position: 'relative',
                  zIndex: 2,
                  backgroundColor: surface,
                  border: `2px solid ${alpha(muiTheme.palette.primary.main, 0.24)}`,
                  boxShadow: isLight
                    ? '0 10px 30px rgba(15,23,42,0.08)'
                    : '0 0 20px rgba(255,255,255,0.18)',
                }}
              >
                <Logo height={150} showText={false} />
              </Box>
            </Box>
            <Typography variant="h4" sx={{ color: textPrimary, fontWeight: 700, mt: 2 }}>
              Welcome Back
            </Typography>
            <Typography variant="body2" sx={{ color: textSecondary, maxWidth: 280, mt: -1 }}>
              Sign in to access the admin dashboard
            </Typography>
          </Box>

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 2,
                backgroundColor: alpha(muiTheme.palette.error.main, isLight ? 0.08 : 0.14),
                border: `1px solid ${alpha(muiTheme.palette.error.main, 0.22)}`,
              }}
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              placeholder="admin@example.com"
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
              sx={{ mb: 3, ...fieldSx }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ color: textSecondary }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="........"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
              sx={{ mb: 4, ...fieldSx }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: textSecondary }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword((prev) => !prev)}
                      edge="end"
                      sx={{ color: textSecondary }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{
                py: 1.8,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In to Dashboard'}
            </Button>

            <Box
              sx={{
                mt: 3,
                textAlign: 'center',
                borderTop: `1px solid ${border}`,
                pt: 3,
              }}
            >
              <Typography variant="caption" sx={{ color: textSecondary }}>
                Secure admin access only
              </Typography>
            </Box>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Close as CloseIcon,
  Phone as PhoneIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { sendThreatAlert } from '../services/alertService';

interface ThreatAlertDialogProps {
  open: boolean;
  threatCount: number;
  farmName: string;
  threatType?: 'fire' | 'human' | 'animal' | null;
  timestamp: string;
  confidence: number;
  language?: 'hi' | 'mr' | 'en';
  phoneNumber?: string;
  onClose: () => void;
  onAcknowledge: () => void;
}

export const ThreatAlertDialog: React.FC<ThreatAlertDialogProps> = ({
  open,
  threatCount,
  farmName,
  threatType = 'human',
  timestamp,
  confidence,
  language = 'mr',
  phoneNumber,
  onClose,
  onAcknowledge,
}) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null);

  // Send alert when dialog opens
  useEffect(() => {
    if (open && !alertSent && phoneNumber) {
      sendAlert();
    }
  }, [open, alertSent, phoneNumber]);

  // Auto-close after 10 seconds if not acknowledged
  useEffect(() => {
    if (open && !acknowledged) {
      const timer = setTimeout(() => {
        handleClose();
      }, 10000);
      setAutoCloseTimer(timer);
      return () => clearTimeout(timer);
    }
  }, [open, acknowledged]);

  const sendAlert = async () => {
    setSending(true);
    setError(null);
    try {
      await sendThreatAlert({
        farmName,
        threatType: threatType || 'human',
        timestamp,
        confidence,
        language: language as 'hi' | 'mr' | 'en',
        phoneNumber: phoneNumber || '',
      });
      setAlertSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send alert');
      console.error('Error sending alert:', err);
    } finally {
      setSending(false);
    }
  };

  const handleAcknowledge = () => {
    setAcknowledged(true);
    onAcknowledge();
    if (autoCloseTimer) clearTimeout(autoCloseTimer);
    setTimeout(() => {
      handleClose();
    }, 1500);
  };

  const handleClose = () => {
    if (autoCloseTimer) clearTimeout(autoCloseTimer);
    setAcknowledged(false);
    setAlertSent(false);
    setSending(false);
    setError(null);
    onClose();
  };

  const getThreatLabel = (type: string | null | undefined) => {
    const labels = {
      mr: { fire: 'आग', human: 'चोर', animal: 'जनावर' },
      hi: { fire: 'आग', human: 'चोर', animal: 'जानवर' },
      en: { fire: 'Fire', human: 'Intruder', animal: 'Animal' },
    };
    return labels[language as keyof typeof labels]?.[type as keyof typeof labels.mr] || 'Unknown';
  };

  const getThreatIcon = (type: string | null | undefined) => {
    switch (type) {
      case 'fire':
        return '🔥';
      case 'human':
        return '👤';
      case 'animal':
        return '🦁';
      default:
        return '⚠️';
    }
  };

  const getThreatColor = (type: string | null | undefined) => {
    switch (type) {
      case 'fire':
        return '#ef4444';
      case 'human':
        return '#f97316';
      case 'animal':
        return '#eab308';
      default:
        return '#6366f1';
    }
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 90) return '#dc2626';
    if (conf >= 80) return '#ea580c';
    if (conf >= 70) return '#f59e0b';
    return '#eab308';
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          border: `3px solid ${getThreatColor(threatType)}`,
          boxShadow: `0 0 60px ${getThreatColor(threatType)}80, 0 0 30px ${getThreatColor(threatType)}40`,
        },
      }}
    >
      {/* Close Button */}
      <Box
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          zIndex: 1,
        }}
      >
        <Button
          onClick={handleClose}
          sx={{
            minWidth: 'auto',
            padding: '8px',
            color: '#ef4444',
            '&:hover': {
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
            },
          }}
        >
          <CloseIcon />
        </Button>
      </Box>

      {/* Dialog Title */}
      <DialogTitle
        sx={{
          textAlign: 'center',
          paddingBottom: 0,
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <WarningIcon
            sx={{
              fontSize: '2.5rem',
              color: getThreatColor(threatType),
              animation: 'pulse 1.5s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.6 },
              },
            }}
          />
          <Typography
            variant="h4"
            sx={{
              fontWeight: 'bold',
              background: `linear-gradient(135deg, ${getThreatColor(threatType)}, #fbbf24)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: 'Noto Sans Devanagari, sans-serif',
            }}
          >
            {language === 'mr' ? 'आणीबाणी!' : language === 'hi' ? 'आपातकाल!' : 'ALERT!'}
          </Typography>
          <WarningIcon
            sx={{
              fontSize: '2.5rem',
              color: getThreatColor(threatType),
              animation: 'pulse 1.5s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.6 },
              },
            }}
          />
        </Box>
      </DialogTitle>

      {/* Dialog Content */}
      <DialogContent
        sx={{
          paddingTop: 3,
          color: '#fff',
        }}
      >
        {/* Farm Name */}
        <Box
          sx={{
            background: `linear-gradient(135deg, ${getThreatColor(threatType)}20, ${getThreatColor(threatType)}10)`,
            border: `2px solid ${getThreatColor(threatType)}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontWeight: 'bold',
              color: '#fff',
              fontFamily: 'Noto Sans Devanagari, sans-serif',
              marginBottom: '8px',
            }}
          >
            {farmName}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              icon={<span>{getThreatIcon(threatType)}</span>}
              label={getThreatLabel(threatType)}
              sx={{
                backgroundColor: getThreatColor(threatType),
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '0.9rem',
              }}
            />
            <Chip
              label={`${threatCount} ${language === 'mr' ? 'धोके' : language === 'hi' ? 'खतरे' : 'Threats'}`}
              sx={{
                backgroundColor: '#ef4444',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '0.9rem',
              }}
            />
          </Box>
        </Box>

        {/* Threat Details */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          {/* Timestamp */}
          <Box
            sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'center',
            }}
          >
            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
              {language === 'mr' ? 'वेळ' : language === 'hi' ? 'समय' : 'Time'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold', marginTop: '4px' }}>
              {timestamp}
            </Typography>
          </Box>

          {/* Confidence */}
          <Box
            sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'center',
            }}
          >
            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
              {language === 'mr' ? 'विश्वास' : language === 'hi' ? 'आत्मविश्वास' : 'Confidence'}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: getConfidenceColor(confidence),
                fontWeight: 'bold',
                marginTop: '4px',
              }}
            >
              {confidence}%
            </Typography>
          </Box>
        </Box>

        {/* Confidence Progress Bar */}
        <Box sx={{ marginBottom: '16px' }}>
          <LinearProgress
            variant="determinate"
            value={confidence}
            sx={{
              height: '8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: getConfidenceColor(confidence),
                borderRadius: '4px',
              },
            }}
          />
        </Box>

        {/* Alert Status */}
        {sending && (
          <Alert
            severity="info"
            sx={{
              marginBottom: '16px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid #3b82f6',
              color: '#93c5fd',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <CircularProgress size={20} sx={{ color: '#3b82f6' }} />
            <Typography variant="body2">
              {language === 'mr'
                ? 'अलर्ट पाठवत आहे...'
                : language === 'hi'
                  ? 'अलर्ट भेज रहे हैं...'
                  : 'Sending alert...'}
            </Typography>
          </Alert>
        )}

        {alertSent && !sending && (
          <Alert
            severity="success"
            sx={{
              marginBottom: '16px',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid #22c55e',
              color: '#86efac',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <CheckCircleIcon sx={{ color: '#22c55e' }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {language === 'mr'
                  ? 'अलर्ट पाठवला गेला'
                  : language === 'hi'
                    ? 'अलर्ट भेजा गया'
                    : 'Alert sent'}
              </Typography>
              {phoneNumber && (
                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PhoneIcon sx={{ fontSize: '0.9rem' }} />
                  {phoneNumber}
                </Typography>
              )}
            </Box>
          </Alert>
        )}

        {error && (
          <Alert
            severity="error"
            sx={{
              marginBottom: '16px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
            }}
          >
            {error}
          </Alert>
        )}

        {!phoneNumber && (
          <Alert
            severity="warning"
            sx={{
              marginBottom: '16px',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid #f59e0b',
              color: '#fcd34d',
            }}
          >
            {language === 'mr'
              ? 'सेटिंग्समध्ये फोन नंबर जोडा'
              : language === 'hi'
                ? 'सेटिंग्स में फोन नंबर जोड़ें'
              : 'Add phone number in settings'}
          </Alert>
        )}

        {/* Action Prompt */}
        <Box
          sx={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center',
            marginTop: '16px',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: '#cbd5e1',
              fontFamily: 'Noto Sans Devanagari, sans-serif',
            }}
          >
            {language === 'mr'
              ? 'तातडीने कारवाई करा!'
              : language === 'hi'
                ? 'तुरंत कार्रवाई करें!'
                : 'Take action immediately!'}
          </Typography>
        </Box>
      </DialogContent>

      {/* Dialog Actions */}
      <DialogActions
        sx={{
          padding: '16px',
          gap: '12px',
        }}
      >
        <Button
          onClick={handleClose}
          variant="outlined"
          sx={{
            color: '#94a3b8',
            borderColor: '#475569',
            '&:hover': {
              backgroundColor: 'rgba(148, 163, 184, 0.1)',
              borderColor: '#94a3b8',
            },
          }}
        >
          {language === 'mr' ? 'बंद करा' : language === 'hi' ? 'बंद करें' : 'Close'}
        </Button>
        <Button
          onClick={handleAcknowledge}
          variant="contained"
          disabled={acknowledged}
          sx={{
            background: `linear-gradient(135deg, ${getThreatColor(threatType)}, #fbbf24)`,
            color: '#000',
            fontWeight: 'bold',
            '&:hover': {
              opacity: 0.9,
            },
            '&:disabled': {
              background: '#22c55e',
              color: '#fff',
            },
          }}
        >
          {acknowledged
            ? language === 'mr'
              ? '✅ ठीक आहे'
              : language === 'hi'
                ? '✅ ठीक है'
                : '✅ OK'
            : language === 'mr'
              ? '✅ मी बघतोय'
              : language === 'hi'
                ? '✅ मैं देख रहा हूँ'
                : '✅ I see'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

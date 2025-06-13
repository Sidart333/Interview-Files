// src/config/api.ts - Updated for Vite environment variables

// Determine base URL based on environment
const getBaseURL = (): string => {
  // For production, use the same domain as the frontend
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  
  // For development, use environment variable or default to empty (proxy)
  return import.meta.env.VITE_API_BASE_URL || '';
};

export const API_CONFIG = {
  baseURL: getBaseURL(),
  timeout: import.meta.env.VITE_API_TIMEOUT ? parseInt(import.meta.env.VITE_API_TIMEOUT) : 10000,
  headers: {
    'Content-Type': 'application/json',
  }
};

// API endpoints
export const API_ENDPOINTS = {
  // Test Management
  SAVE_TEST_CONFIG: '/save-test-config',
  GET_TEST_CONFIG: '/get-test-config',
  
  // Audio/Video Processing
  TRANSCRIBE: '/transcribe',
  TTS: '/tts',
  PROCESS_FRAME: '/process_frame',
  
  // Calibration
  START_TRACKING: '/start_tracking',
  ADVANCE_CALIBRATION: '/advance_calibration',
  SAVE_CALIBRATION: '/save-calibration',
  GET_CALIBRATION: '/get-calibration',
  CLEAR_SESSION: '/clear-session',
  
  // Interview
  GENERATE_QUESTIONS: '/generate-questions',
  SAVE_RESPONSES: '/save-responses',
  TAB_SWITCH: '/tab-switch',
  
  // Feedback
  SUBMIT_FEEDBACK: '/submit-feedback'
};

export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.baseURL}${endpoint}`;
};
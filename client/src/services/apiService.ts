// src/services/apiService.ts
import axios from 'axios';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';

class ApiService {
  private api = axios.create({
    baseURL: API_CONFIG.baseURL,
    timeout: API_CONFIG.timeout,
    headers: API_CONFIG.headers
  });

  // Test Management
  async saveTestConfig(data: any): Promise<{ link: string; emailSent: boolean }> {
    const response = await this.api.post(API_ENDPOINTS.SAVE_TEST_CONFIG, data);
    return response.data;
  }

  async getTestConfig(token: string): Promise<any> {
    const response = await this.api.get(`${API_ENDPOINTS.GET_TEST_CONFIG}/${token}`);
    return response.data;
  }

  // Audio Processing
  async transcribeAudio(formData: FormData): Promise<{ transcript: string }> {
    const response = await this.api.post(API_ENDPOINTS.TRANSCRIBE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async textToSpeech(text: string): Promise<Blob> {
    const response = await this.api.post(API_ENDPOINTS.TTS, { text }, {
      responseType: 'blob'
    });
    return response.data;
  }

  // Video Processing
  async processFrame(data: { image: string; candidateName: string; token: string }): Promise<any> {
    const response = await this.api.post(API_ENDPOINTS.PROCESS_FRAME, data);
    return response.data;
  }

  // Calibration
  async startTracking(token: string): Promise<any> {
    const response = await this.api.post(API_ENDPOINTS.START_TRACKING, { token });
    return response.data;
  }

  async advanceCalibration(data: { image: string; token: string }): Promise<any> {
    const response = await this.api.post(API_ENDPOINTS.ADVANCE_CALIBRATION, data);
    return response.data;
  }

  async saveCalibration(data: { token: string; calibration_data: any }): Promise<any> {
    const response = await this.api.post(API_ENDPOINTS.SAVE_CALIBRATION, data);
    return response.data;
  }

  async getCalibration(token: string): Promise<any> {
    const response = await this.api.post(API_ENDPOINTS.GET_CALIBRATION, { token });
    return response.data;
  }

  async clearSession(token: string): Promise<any> {
    const response = await this.api.post(API_ENDPOINTS.CLEAR_SESSION, { token });
    return response.data;
  }

  // Interview
  async generateQuestions(data: { token: string }): Promise<{ questions: string[]; prompt: string }> {
    const response = await this.api.post(API_ENDPOINTS.GENERATE_QUESTIONS, data);
    return response.data;
  }

  async saveResponses(data: any): Promise<{ success: boolean; filePath: string }> {
    const response = await this.api.post(API_ENDPOINTS.SAVE_RESPONSES, data);
    return response.data;
  }

  async logTabSwitch(data: { candidateName: string; tabSwitchCount: number }): Promise<{
    message: string;
    tab_switch_count: number;
    is_terminated: boolean;
  }>{
    const response = await this.api.post(API_ENDPOINTS.TAB_SWITCH, data);
    return response.data;
  }

  // Feedback
  async submitFeedback(data: { rating: number; comment: string }): Promise<any> {
    const response = await this.api.post(API_ENDPOINTS.SUBMIT_FEEDBACK, data);
    return response.data;
  }
}

export default new ApiService();
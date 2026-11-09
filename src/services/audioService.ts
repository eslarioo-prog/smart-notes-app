/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Audio Studio & Voice Recorder Service
 * Microphones, Live Waveform Analyser, Speech-to-Text Dictation & Playback
 */

export interface AudioRecordingResult {
  blob: Blob;
  base64: string;
  duration: number; // in seconds
  url: string;
  transcript: string;
}

class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private recordedChunks: Blob[] = [];
  private startTime = 0;
  private recognition: any = null;
  private isRecording = false;

  public async startRecording(language: 'ar' | 'en' = 'ar'): Promise<void> {
    if (this.isRecording) return;
    this.recordedChunks = [];

    // 1. Get Microphone stream
    this.audioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // 2. Set up Web Audio Analyser for live waveforms
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.audioStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);
    }

    // 3. MediaRecorder
    let mimeType = 'audio/webm';
    if (!MediaRecorder.isTypeSupported('audio/webm')) {
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else {
        mimeType = '';
      }
    }

    this.mediaRecorder = mimeType
      ? new MediaRecorder(this.audioStream, { mimeType })
      : new MediaRecorder(this.audioStream);

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.startTime = Date.now();
    this.mediaRecorder.start(200); // Collect slice every 200ms
    this.isRecording = true;
  }

  public getWaveformData(): Uint8Array {
    if (!this.analyser) {
      return new Uint8Array(16);
    }
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  public async stopRecording(): Promise<AudioRecordingResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('No active recording session'));
        return;
      }

      const duration = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));

      this.mediaRecorder.onstop = async () => {
        try {
          const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
          const blob = new Blob(this.recordedChunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const base64 = await this.blobToBase64(blob);

          this.cleanup();
          this.isRecording = false;

          resolve({
            blob,
            base64,
            duration,
            url,
            transcript: '',
          });
        } catch (err) {
          this.cleanup();
          this.isRecording = false;
          reject(err);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  public cancelRecording() {
    if (this.mediaRecorder && this.isRecording) {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
    this.cleanup();
    this.isRecording = false;
  }

  private cleanup() {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
    this.analyser = null;
    this.mediaRecorder = null;
  }

  public startLiveDictation(
    language: 'ar' | 'en' = 'ar',
    onResult: (text: string, isFinal: boolean) => void,
    onError?: (error: any) => void
  ): () => void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (onError) onError('SpeechRecognition API is not supported in this browser');
      return () => {};
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = language === 'ar' ? 'ar-SA' : 'en-US';

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript + ' ';
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        onResult(finalTranscript || interimTranscript, !!finalTranscript);
      };

      this.recognition.onerror = (e: any) => {
        console.warn('Speech recognition warning/error:', e);
        if (onError) onError(e);
      };

      this.recognition.start();

      return () => {
        try {
          if (this.recognition) {
            this.recognition.stop();
            this.recognition = null;
          }
        } catch {}
      };
    } catch (e) {
      if (onError) onError(e);
      return () => {};
    }
  }

  public stopLiveDictation() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }
  }

  public blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  public formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

export const audioService = new AudioService();

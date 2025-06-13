  import React, { useState, useRef } from "react";
  import { Button, Space, Card, message, Spin } from "antd";
  import WaveformVisualizer from "./WaveformVisualizer";
  import apiService from "../services/apiService";

  interface ChatboxMicRecorderProps {
    onAnswer: (answer: string) => void;
  }

  const ChatboxMicRecorder: React.FC<ChatboxMicRecorderProps> = ({
    onAnswer,
  }) => {
    const [messageApi, contextHolder] = message.useMessage();
    const [recording, setRecording] = useState(false);
    const [audioURL, setAudioURL] = useState<string | null>(null);
    const [finalTranscript, setFinalTranscript] = useState<string>("");
    const [retryCount, setRetryCount] = useState(0);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [loadingTranscript, setLoadingTranscript] = useState(false); // <-- NEW
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

    const startRecording = async () => {
      if (retryCount >= 1 && audioURL) {
        messageApi.open({ type: "error", content: "No more retries allowed." });
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioStream(stream);

        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunks.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunks.current.push(e.data);
          }
        };

        recorder.onstop = async () => {
          const blob = new Blob(audioChunks.current, { type: "audio/webm" });
          const url = URL.createObjectURL(blob);
          setAudioURL(url);

          // Start loading state
          setLoadingTranscript(true);
          setFinalTranscript(""); // Clear previous result

          try {
            const formData = new FormData();
            formData.append("audio", blob, "answer.webm");
            const res = await apiService.transcribeAudio(formData);
            setFinalTranscript(res.transcript);
          } catch (err) {
            messageApi.open({
              type: "error",
              content: "Failed to transcribe audio.",
            });
          }
          setLoadingTranscript(false);
        };

        recorder.start();
        setRecording(true);
      } catch (err) {
        console.error("Mic error:", err);
        messageApi.open({
          type: "error",
          content: "Microphone access denied or not available.",
        });
      }
    };

    const stopRecording = () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setRecording(false);
        if (audioStream) {
          audioStream.getTracks().forEach((track) => track.stop());
        }
      }
    };

    const handleSave = () => {
      if (!finalTranscript.trim()) {
        messageApi.open({
          type: "warning",
          content: "Please record an answer before saving",
        });
        return;
      }

      onAnswer(finalTranscript);
      setHasAnswered(true);
      messageApi.open({
        type: "success",
        content: "Answer saved successfully!",
      });
    };

    const handleClearResponse = () => {
      if (retryCount >= 1) {
        message.warning(
          "You've already used your retry. Only one retry is allowed."
        );
        return;
      }

      setFinalTranscript("");
      setAudioURL(null);
      setRetryCount((prev) => prev + 1);
      setHasAnswered(false);
      messageApi.open({
        type: "info",
        content: `Answer cleared. You have ${1 - retryCount} retry remaining.`,
      });
    };

    return (
      <>
        {contextHolder}
        <div className="chatBox">
          <Card title="Your Answer">
            {/* Waveform only while recording */}
            {recording && (
              <div
                style={{ width: "100%", overflowX: "hidden", marginBottom: 16 }}
              >
                <WaveformVisualizer stream={audioStream!} isActive={recording} />
              </div>
            )}

            {/* Audio player */}
            {audioURL && (
              <div style={{ marginBottom: 16 }}>
                <audio
                  controls
                  src={audioURL}
                  style={{ width: "100%", outline: "none" }}
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}

            {/* Transcript */}
            {loadingTranscript ? (
              <Spin style={{ margin: "10px 0" }} tip="Transcribing answer..." />
            ) : (
              finalTranscript && (
                <div style={{ marginBottom: 16, textAlign: "left" }}>
                  <strong>Answer:</strong> {finalTranscript}
                </div>
              )
            )}

            {/* 2) Buttons */}
            <Space>
              {!recording && !hasAnswered && (
                <Button
                  type="primary"
                  onClick={startRecording}
                  disabled={recording}
                >
                  🎙️ Start Recording
                </Button>
              )}
              {recording && (
                <Button danger onClick={stopRecording}>
                  ⏹️ Stop Recording
                </Button>
              )}
              {audioURL && !hasAnswered && (
                <>
                  <Button type="primary" onClick={handleSave}>
                    💾 Save Answer
                  </Button>
                  <Button
                    onClick={handleClearResponse}
                    disabled={retryCount >= 1}
                  >
                    🗑️ Clear Response
                  </Button>
                </>
              )}
            </Space>

            {/* Retry/Saved indicators */}
            {retryCount > 0 && !hasAnswered && (
              <div style={{ marginTop: 10, color: "#ff4d4f" }}>
                Retries remaining: {1 - retryCount}
              </div>
            )}
            {hasAnswered && (
              <div style={{ marginTop: 10, color: "#52c41a" }}>
                ✓ Answer saved
              </div>
            )}
          </Card>
        </div>
      </>
    );
  };

  export default ChatboxMicRecorder;

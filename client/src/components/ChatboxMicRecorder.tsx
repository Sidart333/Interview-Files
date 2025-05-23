import React, { useState, useRef, useEffect } from "react";
import { Button, Space, Card, List, message } from "antd";
import WaveformVisualizer from "./WaveformVisualizer";

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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
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

      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognitionRef.current = recognition;

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join("");
        setFinalTranscript(transcript);
      };

      recognition.start();
      recorder.start();
      setRecording(true);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        recognition.stop();
        // Don't automatically save the answer
        // onAnswer(finalTranscript);
      };
    } catch (err) {
      console.error("Mic error:", err);
      messageApi.open({
        type: "error",
        content: "Microphone access denied or not available.",
      });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
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
          {/* 1) Conditionally render waveform + transcript */}
          {(recording || finalTranscript) && (
            <>
              {/* Waveform only while recording */}
              {recording && (
                <div
                  style={{
                    width: "100%",
                    overflowX: "hidden",
                    marginBottom: 16,
                  }}
                >
                  <WaveformVisualizer
                    stream={audioStream!}
                    isActive={recording}
                  />
                </div>
              )}

              {/* Transcript after any speech (or live interim if you prefer) */}
              {finalTranscript && (
                <div style={{ marginBottom: 16, textAlign: "left" }}>
                  <strong>Answer:</strong> {finalTranscript}
                </div>
              )}
            </>
          )}
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

          {/* 2) Buttons stay here */}
          <Space>
            {!recording && !hasAnswered && (
              <Button
                type="primary"
                onClick={startRecording}
                disabled={recording} // ← only while recording
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

          {/* rest of your retry/saved indicators */}
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

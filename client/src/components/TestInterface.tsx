import React, { useState, useEffect, useRef } from "react";
import {
  Layout,
  Typography,
  Card,
  Spin,
  Button,
  Space,
  Alert,
  Divider,
} from "antd";
import { FullscreenExitOutlined } from "@ant-design/icons";
import ChatboxMicRecorder from "./ChatboxMicRecorder";
import QuestionReader from "./QuestionReader";
import axios from "axios";
import { ProgressHeader } from "./ProgressHeader";
import { useNavigate } from "react-router-dom";
import {
  AudioOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  RightCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";

interface WarningData {
  multiple_faces?: boolean;
  head_alert?: string;
  eye_lr_alert?: string;
  eye_ud_alert?: string;
  eye_oc_alert?: string;
}

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;

const TestInterface: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [showCentralWarning, setShowCentralWarning] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [questionAnswerHistory, setQuestionAnswerHistory] = useState<any[]>([]);
  const [isReadyForNextQuestion, setIsReadyForNextQuestion] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  const [showScreenWarning, setShowScreenWarning] = useState(false);
  const [prompt, setPrompt] = useState<string>("");

  const navigate = useNavigate();

  // Only used for demo, pass as props/context in real app
  const candidateDetails = {
    name: "Aditya",
    role: "AI ML ",
    experience: "1",
    numQuestions: 3,
  };


  
  useEffect(() => {
    // Automatically request fullscreen on mount
    function launchFullscreen(element: any) {
      if (element.requestFullscreen) element.requestFullscreen();
      else if (element.mozRequestFullScreen) element.mozRequestFullScreen();
      else if (element.webkitRequestFullscreen)
        element.webkitRequestFullscreen();
      else if (element.msRequestFullscreen) element.msRequestFullscreen();
    }
    launchFullscreen(document.documentElement);

    // Helper: check fullscreen & window size
    function checkScreen() {
      const fullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Show warning if NOT fullscreen or screen is minimized
      if (!fullscreen || w < 1024 || h < 700) {
        setShowScreenWarning(true);
      } else {
        setShowScreenWarning(false);
      }
    }

    checkScreen();
    window.addEventListener("resize", checkScreen);
    document.addEventListener("fullscreenchange", checkScreen);
    document.addEventListener("webkitfullscreenchange", checkScreen); // Safari
    document.addEventListener("mozfullscreenchange", checkScreen);
    document.addEventListener("MSFullscreenChange", checkScreen);

    return () => {
      window.removeEventListener("resize", checkScreen);
      document.removeEventListener("fullscreenchange", checkScreen);
      document.removeEventListener("webkitfullscreenchange", checkScreen);
      document.removeEventListener("mozfullscreenchange", checkScreen);
      document.removeEventListener("MSFullscreenChange", checkScreen);
    };
  }, []);
  

  // Camera startup
  useEffect(() => {
    let stream: MediaStream;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        setWarning("Failed to access the camera.");
      }
    };
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Frame capture + warning logic (single interval)
  useEffect(() => {
    let warningTimer: NodeJS.Timeout | null = null;
    let lastWarningType = "";

    const captureAndSendFrame = async () => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Image = canvas.toDataURL("image/jpeg", 0.8);
        try {
          const res = await axios.post(
            "http://localhost:5000/process_frame",
            { image: base64Image },
            { headers: { "Content-Type": "application/json" } }
          );
          const data: WarningData = res.data as WarningData;
          let warningMsg = "";
          let detectedType = "";

          if (data.multiple_faces) {
            warningMsg += "⚠️ More than one face detected. ";
            detectedType = "multiple_faces";
          }
          if (data.head_alert && data.head_alert.includes("ALERT")) {
            warningMsg += "⚠️ Head Movement Alert. ";
            detectedType = "head";
          }
          if (data.eye_lr_alert && data.eye_lr_alert.includes("ALERT")) {
            warningMsg += "⚠️ Suspicious Eye (LR) Movement. ";
            detectedType = "eye_lr";
          }
          if (data.eye_ud_alert && data.eye_ud_alert.includes("ALERT")) {
            warningMsg += "⚠️ Suspicious Eye (UD) Movement. ";
            detectedType = "eye_ud";
          }
          if (data.eye_oc_alert && data.eye_oc_alert.includes("ALERT")) {
            warningMsg += "⚠️ Eyes Closed Alert. ";
            detectedType = "eye_oc";
          }

          if (warningMsg) {
            setWarning(warningMsg);

            // Show central warning after 5s of continuous detection
            if (lastWarningType !== detectedType) {
              lastWarningType = detectedType;
              setShowCentralWarning(false);
              if (warningTimer) clearTimeout(warningTimer);
              warningTimer = setTimeout(() => {
                setShowCentralWarning(true);
                setTimeout(() => setShowCentralWarning(false), 2000);
              }, 2000);
            }
          } else {
            setWarning(null);
            setShowCentralWarning(false);
            if (warningTimer) clearTimeout(warningTimer);
            lastWarningType = "";
          }
        } catch {
          setWarning("Connection lost. Check your network.");
        }
      }
    };

    const interval = setInterval(captureAndSendFrame, 1000);
    return () => {
      clearInterval(interval);
      if (warningTimer) clearTimeout(warningTimer);
    };
  }, []);

  // Interview question fetch
  useEffect(() => {
    const fetchQuestions = async () => {
      setIsLoading(true);
      try {
        const res = await axios.post<{
          questions: string[];
          prompt: string;
        }>("http://localhost:5000/generate-questions", candidateDetails, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        const { questions: fetchedQs, prompt: fetchedPrompt } = res.data;
        if (fetchedQs?.length) {
          setQuestions(fetchedQs);
          setPrompt(fetchedPrompt);
          setQuestionsLoaded(true);
        } else {
          setWarning("No questions returned from API.");
        }
      } catch {
        setWarning("Failed to fetch interview questions.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuestions();
    // eslint-disable-next-line
  }, []);

  const resetInterview = () => {
    setInterviewComplete(false);
    setCurrentIndex(0);
    setQuestionAnswerHistory([]);
    setIsReadyForNextQuestion(false);
    setQuestionsLoaded(false);
    setPrompt("");
  };

  const handleAnswerSubmission = (answerText: string) => {
    const currentQuestion = questions[currentIndex];
    const qaPair = { question: currentQuestion, answer: answerText };
    setQuestionAnswerHistory((prev) => [...prev, qaPair]);
    setIsReadyForNextQuestion(true);
  };

  const handleNextQuestion = () => {
    if (!isReadyForNextQuestion) {
      setWarning("Please complete the current question first.");
      return;
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsReadyForNextQuestion(false);
      return;
    }

    setInterviewComplete(true);
    saveInterviewResponses().finally(() => {
      navigate("/feedback");
    });
  };

  const saveInterviewResponses = async () => {
    setIsSaving(true);
    try {
      interface SaveResponsesResponse {
        success: boolean;
        filePath: string;
      }

      const res = await axios.post<SaveResponsesResponse>(
        "http://localhost:5000/save-responses",
        {
          candidateName: candidateDetails.name,
          role: candidateDetails.role,
          experience: candidateDetails.experience,
          prompt,
          responses: questionAnswerHistory,
        }
      );

      if (!res.data.success) {
        setWarning("Failed to save interview responses");
      }
      // (You can show a success notification here if you wish)
    } catch {
      setWarning("Failed to save interview responses to file");
    } finally {
      setIsSaving(false);
    }
  };

  const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

  return (
    <Layout style={{ minHeight: "100vh", position: "relative" }}>
      {/* Header */}
      <Header
        style={{
          background: "linear-gradient(to right, #1890ff, #096dd9)",
          padding: "0 24px",
          position: "sticky",
          top: 0,
          zIndex: 1000,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <CameraOutlined
            style={{ color: "white", fontSize: 24, marginRight: 12 }}
          />
          <Title level={3} style={{ margin: 0, color: "white" }}>
            AI Interview Assistant
          </Title>
        </div>
        <Text style={{ color: "white" }}>{candidateDetails.name}</Text>
      </Header>

      {/* Warning Alert */}
      {warning && (
        <div
          style={{
            position: "fixed",
            top: 80,
            right: 30,
            zIndex: 9999,
            width: 340,
            maxWidth: "90vw",
          }}
        >
          {showCentralWarning && (
            <div
              style={{
                position: "fixed",
                top: 40,
                left: 0,
                width: "100vw",
                height: "0",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
                zIndex: 20000,
                pointerEvents: "none",
              }}
            >
              <span
                style={{
                  color: "#d0021b",
                  fontWeight: "bold",
                  fontSize: "48px",
                  background: "rgba(255,255,255,0.95)",
                  padding: "20px 56px",
                  borderRadius: "20px",
                  border: "4px solid #d0021b",
                  boxShadow: "0 0 30px rgba(208,2,27,0.10)",
                  letterSpacing: "2px",
                  marginTop: 0,
                }}
              >
                WARNING
              </span>
            </div>
          )}

          <Alert
            message={warning}
            type="warning"
            showIcon
            banner
            style={{
              borderRadius: 8,
              fontWeight: 500,
              fontSize: 16,
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}
          />
        </div>
      )}

      {/* Progress Bar - Fixed at far left */}
      <div
        style={{
          position: "fixed",
          left: 160,
          top: 300,
          bottom: 0,
          width: "80px",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: "24px",
        }}
      >
        <ProgressHeader currentStep={2} />
      </div>

      {/* Camera View - Left side with margins */}
      <div
        style={{
          position: "fixed",
          left: "100px",
          top: "100px",
          zIndex: 100,
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          style={{
            width: 200,
            height: 150,
            background: "#222",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        />
      </div>

      {/* Main Content Area - Centered */}
      <Content
        style={{
          padding: "24px",
          marginLeft: "80px",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          minHeight: "calc(100vh - 64px - 70px)",
        }}
      >
        <div
          style={{
            maxWidth: "800px",
            width: "100%",
            marginTop: "32px",
          }}
        >
          <Card
            title={
              <Space>
                <AudioOutlined />
                <span>Interview Questions</span>
              </Space>
            }
            style={{ borderRadius: 8 }}
            bordered={false}
            className="interview-card"
          >
            {isLoading ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: 40,
                }}
              >
                <Spin indicator={antIcon} />
                <Text style={{ marginTop: 16 }}>
                  Preparing your interview questions...
                </Text>
              </div>
            ) : questions.length > 0 && !interviewComplete ? (
              <>
                <Card
                  type="inner"
                  style={{
                    marginBottom: 16,
                    borderRadius: 8,
                    borderLeft: "4px solid #1890ff",
                  }}
                >
                  <Title level={4} style={{ color: "#1890ff" }}>
                    Question {currentIndex + 1}
                  </Title>
                  <Paragraph style={{ fontSize: 16 }}>
                    {questions[currentIndex]}
                  </Paragraph>
                  <div style={{ margin: "16px 0" }}>
                    <QuestionReader
                      question={questions[currentIndex] as string}
                    />
                  </div>
                </Card>

                <Divider orientation="left">Your Response</Divider>

                <ChatboxMicRecorder
                  key={`question-${currentIndex}`}
                  onAnswer={handleAnswerSubmission}
                />
              </>
            ) : (
              interviewComplete && (
                <div style={{ textAlign: "center", padding: 24 }}>
                  <CheckCircleOutlined
                    style={{
                      fontSize: 48,
                      color: "#52c41a",
                      marginBottom: 16,
                    }}
                  />
                  <Title level={3}>Interview Complete!</Title>
                  <Paragraph>Thank you for completing all questions.</Paragraph>
                  {isSaving && (
                    <div style={{ marginTop: 24 }}>
                      <Spin tip="Processing your interview responses..." />
                    </div>
                  )}
                </div>
              )
            )}

            <div style={{ textAlign: "center", marginTop: 24 }}>
              {!isLoading && questions.length > 0 && !interviewComplete && (
                <Button
                  type="primary"
                  onClick={handleNextQuestion}
                  size="large"
                  icon={<RightCircleOutlined />}
                  disabled={!isReadyForNextQuestion}
                  style={{
                    height: 45,
                    borderRadius: 8,
                    width: "100%",
                    maxWidth: 300,
                    background: isReadyForNextQuestion
                      ? "linear-gradient(to right, #1890ff, #096dd9)"
                      : "#f5f5f5",
                    border: "none",
                    boxShadow: isReadyForNextQuestion
                      ? "0 4px 12px rgba(24, 144, 255, 0.3)"
                      : "none",
                  }}
                >
                  {currentIndex < questions.length - 1
                    ? "Next Question"
                    : "Finish Interview"}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </Content>

      <Footer
        style={{
          textAlign: "center",
          background: "#f0f2f5",
          marginLeft: "80px",
        }}
      >
        <Text type="secondary">
          AI Interview Assistant © {new Date().getFullYear()}
        </Text>
      </Footer>
    </Layout>
  );
};

export default TestInterface;

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
import ChatboxMicRecorder from "./ChatboxMicRecorder";
import QuestionReader from "./QuestionReader";
import apiService from "../services/apiService";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import {
  AudioOutlined,
  CheckCircleOutlined,
  RightCircleOutlined,
  LoadingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import WarningOverlay from "./WarningOverlay";

interface WarningData {
  multiple_faces?: boolean;
  head_alert?: string;
  eye_lr_alert?: string;
  eye_ud_alert?: string;
  eye_oc_alert?: string;
}

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const TestInterface: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  // ✅ CRITICAL FIX: Early return if no token
  if (!token) {
    return (
      <Layout
        style={{
          height: "100vh",
          background: "#f5f7fa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Card style={{ textAlign: "center", padding: "40px" }}>
          <Title level={3} style={{ color: "#ff4d4f" }}>
            Invalid Test Link
          </Title>
          <Text
            style={{ color: "#666", display: "block", marginBottom: "24px" }}
          >
            The test link appears to be invalid or expired.
          </Text>
          <Button type="primary" size="large" onClick={() => navigate("/")}>
            Go Home
          </Button>
        </Card>
      </Layout>
    );
  }

  const [mainWarning, setMainWarning] = useState<string | null>(null);
  const [candidateData, setCandidateData] = useState<any>(null);
  const [showWarningOverlay, setShowWarningOverlay] = useState(false);
  const [isTestTerminated, setIsTestTerminated] = useState(false);
  const [loadingCandidate, setLoadingCandidate] = useState(true);
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [questionAnswerHistory, setQuestionAnswerHistory] = useState<any[]>([]);
  const [isReadyForNextQuestion, setIsReadyForNextQuestion] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  const [prompt, setPrompt] = useState<string>("");
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [tabOutWarning, setTabOutWarning] = useState(false);
  const tabOutTimestamp = useRef<number | null>(null);
  const [userActionWarning, setUserActionWarning] = useState<string | null>(
    null
  );

  // Fetch candidate data from token
  useEffect(() => {
    if (!token) return;

    const fetchCandidateData = async () => {
      try {
        setLoadingCandidate(true);
        const data = await apiService.getTestConfig(token);
        setCandidateData(data);

        // Trigger fullscreen mode once data is loaded
        setTimeout(() => {
          enterFullscreen();
        }, 500);
      } catch (error) {
        console.error("Error fetching candidate data:", error);
        setUserActionWarning("Failed to load candidate data");
      } finally {
        setLoadingCandidate(false);
      }
    };

    fetchCandidateData();
  }, [token]);

  // Enable tab switching prevention
  const preventTabSwitch = () => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for forbidden key combinations
      const isForbidden =
        (e.altKey && e.key === "Tab") || // Alt+Tab
        (e.metaKey && e.key === "v") ||
        (e.ctrlKey && e.key === "Tab") || // Ctrl+Tab
        (e.ctrlKey && e.shiftKey && e.key === "Tab") || // Ctrl+Shift+Tab
        (e.ctrlKey && (e.key === "w" || e.key === "W")) || // Ctrl+W
        (e.ctrlKey && (e.key === "t" || e.key === "T")) || // Ctrl+T
        (e.ctrlKey && (e.key === "n" || e.key === "N")) || // Ctrl+N
        (e.ctrlKey && (e.key === "r" || e.key === "R")) || // Ctrl+R
        e.key === "F5"; // F5 refresh

      if (isForbidden) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        // Clear any existing warning first, then show new one
        setUserActionWarning(null);
        setTimeout(() => {
          setUserActionWarning("⚠️ This action is disabled during the test!");
          setTimeout(() => setUserActionWarning(null), 2000);
        }, 10);

        return false;
      }
    };

    // Add listener with capture=true to catch events early
    document.addEventListener("keydown", handleKeyDown, {
      capture: true,
      passive: false,
    });
    window.addEventListener("keydown", handleKeyDown, {
      capture: true,
      passive: false,
    });

    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  };
  

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F11') {
        event.preventDefault();
        event.stopPropagation();

        setUserActionWarning('F11 key is disabled during the test for security reasons.');

        setTimeout(() => {
          setUserActionWarning(null);
        }, 3000);
        
        return false;
      }
    }
    document.addEventListener("keydown", handleKeyDown, true)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [])

  // Enable tab switching prevention
  useEffect(() => {
    if (!candidateData) return;

    const cleanup = preventTabSwitch();

    // Show initial warning
    setUserActionWarning(
      "🔒 Tab switching is disabled during this test for security."
    );
    const timer = setTimeout(() => setUserActionWarning(null), 3000);

    return () => {
      cleanup();
      clearTimeout(timer);
      setUserActionWarning(null);
    };
  }, [candidateData]);

  // Simple fullscreen trigger function
  const enterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        await (document.documentElement as any).webkitRequestFullscreen();
      } else if ((document.documentElement as any).msRequestFullscreen) {
        await (document.documentElement as any).msRequestFullscreen();
      }
      console.log("Entered fullscreen mode");
    } catch (error) {
      console.error("Failed to enter fullscreen:", error);
    }
  };


  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        tabOutTimestamp.current = Date.now();
        setTabOutWarning(true);
      }
      if (document.visibilityState === "visible") {
        setTabOutWarning(false);

        if (tabOutTimestamp.current) {
          const now = Date.now();
          const secondsAway = (now - tabOutTimestamp.current) / 1000;
          tabOutTimestamp.current = null;
          if (secondsAway > 2) {
            setTabSwitchCount((prev) => {
              const newCount = prev + 1;
              if (candidateData && candidateData?.name) {
                // Call the enhanced API
                apiService
                  .logTabSwitch({
                    candidateName: candidateData.name,
                    tabSwitchCount: newCount,
                  })
                  .then((response) => {
                    // Check if test should be terminated
                    if (response.is_terminated) {
                      setIsTestTerminated(true);
                      setTimeout(() => {
                        navigate("/test-terminated");
                      }, 2000);
                    } else {
                      // Show warning overlay for 1st and 2nd warnings
                      setShowWarningOverlay(true);
                    }
                  })
                  .catch((error) => {
                    console.error("Error handling tab switch:", error);
                  });
              }
              return newCount;
            });
          }
        }
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [candidateData]);

  // Camera startup
  useEffect(() => {
    if (!candidateData) return;
    let stream: MediaStream;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        setUserActionWarning("Failed to access the camera.");
      }
    };
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [candidateData]);

  // Main proctoring warning logic
  useEffect(() => {
    if (!candidateData || !token) return;

    let warningTimeout: NodeJS.Timeout | null = null;

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
          const data: WarningData = await apiService.processFrame({
            image: base64Image,
            candidateName: candidateData.name,
            token: token,
          });

          const anyWarning =
            data.multiple_faces ||
            (data.head_alert && data.head_alert.includes("ALERT")) ||
            (data.eye_lr_alert && data.eye_lr_alert.includes("ALERT")) ||
            (data.eye_ud_alert && data.eye_ud_alert.includes("ALERT")) ||
            (data.eye_oc_alert && data.eye_oc_alert.includes("ALERT"));

          if (anyWarning) {
            setMainWarning("WARNING");
          } else {
            setMainWarning(null);
          }
        } catch {
          setUserActionWarning("Connection lost. Check your network.");
        }
      }
    };

    const interval = setInterval(captureAndSendFrame, 200);

    return () => {
      clearInterval(interval);
      if (warningTimeout) clearTimeout(warningTimeout);
    };
  }, [candidateData, token]);

  // Interview question fetch
  useEffect(() => {
    if (!candidateData) return;
    setIsLoading(true);

    const fetchQuestions = async () => {
      try {
        const res = await apiService.generateQuestions({
          token: token!,
        });
        const { questions: fetchedQs, prompt: fetchedPrompt } = res;
        if (fetchedQs?.length) {
          setQuestions(fetchedQs);
          setPrompt(fetchedPrompt);
          setQuestionsLoaded(true);
        } else {
          setUserActionWarning("No questions returned from API.");
        }
      } catch (error) {
        setUserActionWarning("Failed to fetch interview questions.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [candidateData]);

  const handleAnswerSubmission = (answerText: string) => {
    const currentQuestion = questions[currentIndex];
    const qaPair = { question: currentQuestion, answer: answerText };
    setQuestionAnswerHistory((prev) => [...prev, qaPair]);
    setIsReadyForNextQuestion(true);
  };

  const handleNextQuestion = () => {
    if (!isReadyForNextQuestion) {
      setUserActionWarning("Please complete the current question first.");
      return;
    }
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsReadyForNextQuestion(false);
      setUserActionWarning(null);
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
      const res = await apiService.saveResponses({
        candidateName: candidateData?.name,
        role: candidateData?.role,
        experience: candidateData?.experience || "",
        prompt,
        responses: questionAnswerHistory,
      });
      if (!res.success) {
        setUserActionWarning("Failed to save interview responses");
      }
    } catch {
      setUserActionWarning("Failed to save interview responses to file");
    } finally {
      setIsSaving(false);
    }
  };

  const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

  // Loading state
  if (loadingCandidate) {
    return (
      <Layout
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f7fa",
        }}
      >
        <Spin size="large" tip="Loading test data..." />
      </Layout>
    );
  }

  // Error state
  if (!candidateData) {
    return (
      <Layout
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f7fa",
        }}
      >
        <Card style={{ textAlign: "center", padding: "40px" }}>
          <Title level={3} style={{ color: "#ff4d4f" }}>
            Test Not Found
          </Title>
          <Text
            style={{ color: "#666", display: "block", marginBottom: "24px" }}
          >
            The test link appears to be invalid or expired.
          </Text>
          <Button type="primary" size="large" onClick={() => navigate("/")}>
            Go Home
          </Button>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout
      style={{ height: "100vh", background: "#f5f7fa", overflow: "hidden" }}
    >
      {/* Progress Header */}
      <div
        style={{
          background: "#fff",
          padding: "16px 24px",
          borderBottom: "1px solid #f0f0f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "#52c41a",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              ✓
            </div>
            <Text style={{ color: "#52c41a" }}>Credentials</Text>
          </div>

          <div
            style={{ width: "40px", height: "2px", background: "#52c41a" }}
          ></div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "#52c41a",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              ✓
            </div>
            <Text style={{ color: "#52c41a" }}>Calibration</Text>
          </div>

          <div
            style={{ width: "40px", height: "2px", background: "#1E88E5" }}
          ></div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "#1E88E5",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              3
            </div>
            <Text style={{ color: "#1E88E5", fontWeight: "500" }}>
              Interview
            </Text>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              background: "#1E88E5",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <UserOutlined style={{ color: "#fff", fontSize: "14px" }} />
          </div>
          <Text style={{ color: "#262626", fontWeight: "500" }}>
            {candidateData?.name}
          </Text>
        </div>
      </div>

      {/* Warning Messages */}
      {tabOutWarning && (
        <div
          style={{
            position: "fixed",
            top: 80,
            left: 30,
            zIndex: 10000,
            width: 340,
            maxWidth: "90vw",
          }}
        >
          <Alert
            message="⚠️ Warning: You have left the test tab. Please return immediately!"
            type="error"
            showIcon
            banner
            style={{ marginBottom: 12 }}
          />
        </div>
      )}

      {userActionWarning ? (
        <div
          style={{
            position: "fixed",
            top: 80,
            right: 30,
            zIndex: 10000,
            width: 340,
            maxWidth: "90vw",
          }}
        >
          <Alert
            message={userActionWarning}
            type="error"
            showIcon
            banner
            style={{ marginBottom: 12 }}
          />
        </div>
      ) : mainWarning ? (
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
          <Alert message={mainWarning} type="warning" showIcon banner />
        </div>
      ) : null}

      {/* Camera View - EXACT same size and position */}
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

      {/* Main Content Area */}
      <Content
        style={{
          padding: "24px",
          marginLeft: "80px",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          height: "calc(100vh - 65px)",
          overflow: "auto",
        }}
      >
        <div style={{ maxWidth: "800px", width: "100%", marginTop: "32px" }}>
          <Card
            title={
              <Space>
                <AudioOutlined style={{ color: "#1E88E5" }} />
                <span style={{ color: "#262626", fontWeight: "500" }}>
                  Interview Questions - {candidateData?.role}
                </span>
              </Space>
            }
            style={{
              borderRadius: "8px",
              boxShadow:
                "0 1px 2px 0 rgba(0,0,0,0.03), 0 1px 6px -1px rgba(0,0,0,0.02), 0 2px 4px 0 rgba(0,0,0,0.02)",
              border: "1px solid #f0f0f0",
              background: "#fff",
            }}
            bordered={false}
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
                <Text style={{ marginTop: 16, color: "#8c8c8c" }}>
                  Preparing your interview questions for {candidateData?.role}
                  ...
                </Text>
              </div>
            ) : questions.length > 0 && !interviewComplete ? (
              <>
                <Card
                  type="inner"
                  style={{
                    marginBottom: 16,
                    borderRadius: 8,
                    borderLeft: "4px solid #1E88E5",
                    background: "#fafafa",
                  }}
                >
                  <Title
                    level={4}
                    style={{ color: "#1E88E5", margin: "0 0 12px 0" }}
                  >
                    Question {currentIndex + 1} of {questions.length}
                  </Title>
                  <Paragraph
                    style={{
                      fontSize: 16,
                      color: "#262626",
                      lineHeight: "1.6",
                    }}
                  >
                    {questions[currentIndex]}
                  </Paragraph>
                  <div style={{ margin: "16px 0" }}>
                    <QuestionReader
                      question={questions[currentIndex] as string}
                    />
                  </div>
                </Card>

                <Divider
                  orientation="left"
                  style={{ color: "#262626", fontWeight: "500" }}
                >
                  Your Response
                </Divider>

                <ChatboxMicRecorder
                  key={`questions-${currentIndex}`}
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
                  <Title level={3} style={{ color: "#262626" }}>
                    Interview Complete!
                  </Title>
                  <Paragraph style={{ color: "#8c8c8c" }}>
                    Thank you for completing all questions.
                  </Paragraph>
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
                    height: 48,
                    borderRadius: 8,
                    width: "100%",
                    maxWidth: 300,
                    background: isReadyForNextQuestion ? "#1E88E5" : "#f5f5f5",
                    borderColor: isReadyForNextQuestion ? "#1E88E5" : "#d9d9d9",
                    color: isReadyForNextQuestion ? "#fff" : "#bfbfbf",
                    fontSize: "16px",
                    fontWeight: "500",
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
      <WarningOverlay
        tabSwitchCount={tabSwitchCount}
        isVisible={showWarningOverlay}
        onDismiss={() => setShowWarningOverlay(false)}
      />
    </Layout>
  );
};

export default TestInterface;

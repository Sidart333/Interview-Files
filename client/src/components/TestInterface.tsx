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
  Form,
  Input,
} from "antd";
// import { FullscreenExitOutlined } from "@ant-design/icons";
import ChatboxMicRecorder from "./ChatboxMicRecorder";
import QuestionReader from "./QuestionReader";
import axios from "axios";
import { ProgressHeader } from "./ProgressHeader";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
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
  const { token } = useParams<{ token: string }>();


  const [mainWarning, setMainWarning] = useState<string | null>(null);


  const [userInfo, setUserInfo] = useState<{
    name: string;
    role: string;
  } | null>(null);
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

  const navigate = useNavigate();

  // Only used for demo, pass as props/context in real app
  // const candidateDetails = {
  //   name: "Virendra",
  //   role: "software developer",
  //   experience: "3",
  //   numQuestions: 3,
  // };

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
              if (userInfo && userInfo.name) {
                axios.post(
                  " https://680d-103-159-68-90.ngrok-free.app/tab-switch",
                  {
                    candidateName: userInfo.name,
                    tabSwitchCount: newCount,
                  }
                );
              }
              return newCount;
            })
          }
        }
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [userInfo])


  // Camera startup
  useEffect(() => {
    if (!userInfo) return; // Do not start camera until user info entered!
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
  }, [userInfo]);
  

  // ---- Main proctoring warning logic (SINGLE generic warning) ----
  useEffect(() => {
    if (!userInfo) return; // Don't start proctoring until user info is entered

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
          const res = await axios.post(
            " https://680d-103-159-68-90.ngrok-free.app/process_frame",
            {
              image: base64Image,
              candidateName: userInfo.name,
              token: token,
            },
            { headers: { "Content-Type": "application/json" } }
          );
          const data: WarningData = res.data as WarningData;

          // Simple: if any type of warning is present, show "WARNING" (no details)
          const anyWarning =
            data.multiple_faces ||
            (data.head_alert && data.head_alert.includes("ALERT")) ||
            (data.eye_lr_alert && data.eye_lr_alert.includes("ALERT")) ||
            (data.eye_ud_alert && data.eye_ud_alert.includes("ALERT")) ||
            (data.eye_oc_alert && data.eye_oc_alert.includes("ALERT"));

          if (anyWarning) {
            setMainWarning("WARNING"); // Show only main "WARNING"
          } else {
            setMainWarning(null); // Hide when no warning
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
  }, [userInfo]);

  // Interview question fetch -- only when userInfo is set!
  useEffect(() => {
    if (!userInfo) return;
    setIsLoading(true);
    axios
      .post<{ questions: string[]; prompt: string }>(
        " https://680d-103-159-68-90.ngrok-free.app/generate-questions",
        {
          name: userInfo.name,
          role: userInfo.role, // You can add more fields if you want
          numQuestions: 3,
        },
        { headers: { "Content-Type": "application/json" } }
      )
      .then((res) => {
        const { questions: fetchedQs, prompt: fetchedPrompt } = res.data;
        if (fetchedQs?.length) {
          setQuestions(fetchedQs);
          setPrompt(fetchedPrompt);
          setQuestionsLoaded(true);
        } else {
          setUserActionWarning("No questions returned from API.");
        }
      })
      .catch(() => {
        setUserActionWarning("Failed to fetch interview questions.");
      })
      .then(() => {
        setIsLoading(false);
      });
  }, [userInfo]);

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
      interface SaveResponsesResponse {
        success: boolean;
        filePath: string;
      }
      // Use userInfo instead of candidateDetails for saving
      const res = await axios.post<SaveResponsesResponse>(
        " https://680d-103-159-68-90.ngrok-free.app/save-responses",
        {
          candidateName: userInfo?.name,
          role: userInfo?.role,
          experience: "",
          prompt,
          responses: questionAnswerHistory,
        }
      );
      if (!res.data.success) {
        setUserActionWarning("Failed to save interview responses");
      }
    } catch {
      setUserActionWarning("Failed to save interview responses to file");
    } finally {
      setIsSaving(false);
    }
  };

  const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

  // === 🟢 User entry form ===
  if (!userInfo) {
    return (
      <Layout style={{ minHeight: "100vh", position: "relative" }}>
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
        </Header>
        <Content
          style={{
            minHeight: "calc(100vh - 70px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "#f0f2f5",
          }}
        >
          <Card style={{ width: 400 }}>
            <Title level={3} style={{ textAlign: "center" }}>
              Enter Your Details
            </Title>
            <Form layout="vertical" onFinish={(values) => setUserInfo(values)}>
              <Form.Item
                label="Full Name"
                name="name"
                rules={[{ required: true, message: "Enter your name!" }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                label="Role/Job"
                name="role"
                rules={[{ required: true, message: "Enter role/job!" }]}
              >
                <Input />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={isLoading}
                >
                  Continue
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Content>
        <Footer
          style={{
            textAlign: "center",
            background: "#f0f2f5",
          }}
        >
          <Text type="secondary">
            AI Interview Assistant © {new Date().getFullYear()}
          </Text>
        </Footer>
      </Layout>
    );
  }

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
        <Text style={{ color: "white" }}>{userInfo?.name}</Text>
        {/* <Text style={{ color: "white" }}>{candidateDetails.name}</Text> */}
      </Header>

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
          <Alert message="⚠️ Warning: You have left the test tab. Please return immediately!"
            type="error"
            showIcon
            banner
          style={{ marginBottom: 12}}/>
        </div>
      )}
      {/* ---- Main (single) Warning Message ---- */}
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
        <div style={{ maxWidth: "800px", width: "100%", marginTop: "32px" }}>
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

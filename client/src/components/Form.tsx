// import React, { useState, useEffect } from "react";
// import {
//   Layout,
//   Typography,
//   Row,
//   Col,
//   Card,
//   Spin,
//   Button,
//   message,
//   Space,
//   Divider,
// } from "antd";
// import Webcam from "react-webcam";
// import ChatboxMicRecorder from "./ChatboxMicRecorder";
// import QuestionReader from "./QuestionReader";
// import axios from "axios";
// import { ProgressHeader } from "./ProgressHeader";
// import { useNavigate } from "react-router-dom";
// import {
//   AudioOutlined,
//   CameraOutlined,
//   CheckCircleOutlined,
//   RightCircleOutlined,
//   LoadingOutlined,
//   SoundOutlined,
// } from "@ant-design/icons";

// const { Header, Content, Footer } = Layout;
// const { Title, Text, Paragraph } = Typography;

// const TestInterface: React.FC = () => {
//   // This state is newly added to store the AI-generated prompt returned from the backend.
//   const [prompt, setPrompt] = useState<string>("");
//   const [messageApi, contextHolder] = message.useMessage();
//   const [questions, setQuestions] = useState<string[]>([]);
//   const [currentIndex, setCurrentIndex] = useState<number>(0);
//   const [questionAnswerHistory, setQuestionAnswerHistory] = useState<any[]>([]);
//   const [isReadyForNextQuestion, setIsReadyForNextQuestion] = useState(false);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isSaving, setIsSaving] = useState(false);
//   const [interviewComplete, setInterviewComplete] = useState(false);
//   const [questionsLoaded, setQuestionsLoaded] = useState(false);
//   const [cameraActive, setCameraActive] = useState(true);

//   const candidateDetails = {
//     name: "Abhinav Vyas",
//     role: "Deep Learning",
//     experience: "Fresher",
//     numQuestions: 3,
//   };

//   const resetInterview = () => {
//     setInterviewComplete(false);
//     setCurrentIndex(0);
//     setQuestionAnswerHistory([]);
//     setIsReadyForNextQuestion(false);
//     setQuestionsLoaded(false);
//     setPrompt("");
//   };

//   useEffect(() => {
//     resetInterview();
//     const fetchQuestions = async () => {
//       console.log("Fetching questions...");
//       setIsLoading(true);
//       try {
//         const res = await axios.post<{
//           questions: string[];
//           prompt: string;
//         }>("http://localhost:5000/generate-questions", candidateDetails);
//         console.log("API response:", res.data);

//         const { questions: fetchedQs, prompt: fetchedPrompt } = res.data;
//         if (fetchedQs?.length) {
//           setQuestions(fetchedQs);
//           setPrompt(fetchedPrompt);
//           setQuestionsLoaded(true);
//           // messageApi.open({
//           //   type: "success",
//           //   content: `Generated ${fetchedQs.length} questions`,
//           // });
//         } else {
//           messageApi.error("No questions returned from API");
//         }
//       } catch (error) {
//         console.error("Error fetching questions:", error);
//         messageApi.open({
//           type: "error",
//           content: "Failed to fetch interview questions.",
//         });
//       } finally {
//         setIsLoading(false);
//       }
//     };
//     fetchQuestions();
//   }, []);

//   const handleAnswerSubmission = (answerText: string) => {
//     const currentQuestion = questions[currentIndex];
//     const qaPair = { question: currentQuestion, answer: answerText };
//     setQuestionAnswerHistory((prev) => [...prev, qaPair]);
//     setIsReadyForNextQuestion(true);
//     messageApi.open({
//       type: "success",
//       content: "Answer recorded successfully!",
//     });
//   };

//   const navigate = useNavigate();

//   const handleNextQuestion = () => {
//     if (!isReadyForNextQuestion) {
//       messageApi.warning({
//         content: "Please complete the current question first.",
//       });
//       return;
//     }

//     if (currentIndex < questions.length - 1) {
//       setCurrentIndex((prev) => prev + 1);
//       setIsReadyForNextQuestion(false);
//       return;
//     }

//     setInterviewComplete(true);
//     messageApi.success({
//       content: "Interview Complete! All questions answered.",
//     });
//     console.log("Final QA JSON:", questionAnswerHistory);
//     saveInterviewResponses().finally(() => {
//       navigate("/feedback");
//     });
//   };

//   const saveInterviewResponses = async () => {
//     setIsSaving(true);
//     try {
//       interface SaveResponsesResponse {
//         success: boolean;
//         filePath: string;
//       }

//       // console.log("Saving responses:", questionAnswerHistory);

//       const res = await axios.post<SaveResponsesResponse>(
//         "http://localhost:5000/save-responses",
//         {
//           candidateName: candidateDetails.name,
//           role: candidateDetails.role,
//           experience: candidateDetails.experience,
//           prompt, // included prompt
//           responses: questionAnswerHistory,
//         }
//       );

//       if (res.data.success) {
//         messageApi.success({
//           content: `Interview responses saved to file: ${res.data.filePath}`,
//         });
//       } else {
//         messageApi.error({ content: "Failed to save interview responses" });
//       }
//     } catch (error) {
//       console.error("Error saving responses:", error);
//       messageApi.error({
//         content: "Failed to save interview responses to file",
//       });
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   const toggleCamera = () => {
//     setCameraActive(!cameraActive);
//   };

//   const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

//   return (
//     <Layout style={{ minHeight: "100vh" }}>
//       {contextHolder}
//       <Header
//         style={{
//           background: "linear-gradient(to right, #1890ff, #096dd9)",
//           padding: "0 24px",
//           position: "sticky",
//           top: 0,
//           zIndex: 1,
//           width: "100%",
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "space-between",
//         }}
//       >
//         <div style={{ display: "flex", alignItems: "center" }}>
//           <CameraOutlined
//             style={{ color: "white", fontSize: 24, marginRight: 12 }}
//           />
//           <Title level={3} style={{ margin: 0, color: "white" }}>
//             AI Interview Assistant
//           </Title>
//         </div>
//         <Text style={{ color: "white" }}>{candidateDetails.name}</Text>
//       </Header>

//       <div
//         style={{
//           width: "100%",
//           maxWidth: "800px",
//           margin: "auto",
//           padding: "16px",
//         }}
//       >
//         <ProgressHeader currentStep={2} />
//       </div>

//       <Content style={{ padding: "0 24px 24px" }}>
//         <Row gutter={[24, 24]}>
//           <Col xs={24} md={12}>
//             <Card
//               title={
//                 <Space>
//                   <CameraOutlined />
//                   <span>Camera View</span>
//                 </Space>
//               }
//               extra={
//                 <Button
//                   type="text"
//                   icon={
//                     cameraActive ? (
//                       <CheckCircleOutlined style={{ color: "green" }} />
//                     ) : (
//                       <LoadingOutlined />
//                     )
//                   }
//                   onClick={toggleCamera}
//                 >
//                   {cameraActive ? "Active" : "Inactive"}
//                 </Button>
//               }
//               style={{ borderRadius: 8, height: "100%" }}
//               bordered={false}
//               className="interview-card"
//             >
//               {cameraActive ? (
//                 <Webcam
//                   audio={false}
//                   screenshotFormat="image/jpeg"
//                   style={{
//                     width: "50%",
//                     borderRadius: 8,
//                     boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
//                   }}
//                 />
//               ) : (
//                 <div
//                   style={{
//                     height: 300,
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                     background: "#f5f5f5",
//                     borderRadius: 8,
//                   }}
//                 >
//                   <Text type="secondary">Camera is turned off</Text>
//                 </div>
//               )}
//             </Card>
//           </Col>

//           <Col xs={24} md={12}>
//             <Card
//               title={
//                 <Space>
//                   <AudioOutlined />
//                   <span>Interview Questions</span>
//                 </Space>
//               }
//               style={{ borderRadius: 8, height: "100%" }}
//               bordered={false}
//               className="interview-card"
//             >
//               {isLoading ? (
//                 <div
//                   style={{
//                     display: "flex",
//                     flexDirection: "column",
//                     alignItems: "center",
//                     padding: 40,
//                   }}
//                 >
//                   <Spin indicator={antIcon} />
//                   <Text style={{ marginTop: 16 }}>
//                     Preparing your interview questions...
//                   </Text>
//                 </div>
//               ) : questions.length > 0 && !interviewComplete ? (
//                 <>
//                   <Card
//                     type="inner"
//                     style={{
//                       marginBottom: 16,
//                       borderRadius: 8,
//                       borderLeft: "4px solid #1890ff",
//                     }}
//                   >
//                     <Title level={4} style={{ color: "#1890ff" }}>
//                       Question {currentIndex + 1}
//                     </Title>
//                     <Paragraph style={{ fontSize: 16 }}>
//                       {questions[currentIndex]}
//                     </Paragraph>
//                     <div style={{ margin: "16px 0" }}>
//                       <Button
//                         type="default"
//                         icon={<SoundOutlined />}
//                         size="small"
//                       >
//                         <QuestionReader
//                           question={questions[currentIndex] as string}
//                         />
//                       </Button>
//                     </div>
//                   </Card>

//                   <Divider orientation="left">Your Response</Divider>

//                   <ChatboxMicRecorder
//                     key={`question-${currentIndex}`}
//                     onAnswer={handleAnswerSubmission}
//                   />
//                 </>
//               ) : (
//                 interviewComplete && (
//                   <div style={{ textAlign: "center", padding: 24 }}>
//                     <CheckCircleOutlined
//                       style={{
//                         fontSize: 48,
//                         color: "#52c41a",
//                         marginBottom: 16,
//                       }}
//                     />
//                     <Title level={3}>Interview Complete!</Title>
//                     <Paragraph>
//                       Thank you for completing all questions.
//                     </Paragraph>
//                     {isSaving && (
//                       <div style={{ marginTop: 24 }}>
//                         <Spin tip="Processing your interview responses..." />
//                       </div>
//                     )}
//                   </div>
//                 )
//               )}

//               <div style={{ textAlign: "center", marginTop: 24 }}>
//                 {!isLoading && questions.length > 0 && !interviewComplete && (
//                   <Button
//                     type="primary"
//                     onClick={handleNextQuestion}
//                     size="large"
//                     icon={<RightCircleOutlined />}
//                     disabled={!isReadyForNextQuestion}
//                     style={{
//                       height: 45,
//                       borderRadius: 8,
//                       width: "100%",
//                       maxWidth: 300,
//                       background: isReadyForNextQuestion
//                         ? "linear-gradient(to right, #1890ff, #096dd9)"
//                         : "#f5f5f5",
//                       border: "none",
//                       boxShadow: isReadyForNextQuestion
//                         ? "0 4px 12px rgba(24, 144, 255, 0.3)"
//                         : "none",
//                     }}
//                   >
//                     {currentIndex < questions.length - 1
//                       ? "Next Question"
//                       : "Finish Interview"}
//                   </Button>
//                 )}
//               </div>
//             </Card>
//           </Col>
//         </Row>
//       </Content>

//       <Footer style={{ textAlign: "center", background: "#f0f2f5" }}>
//         <Text type="secondary">
//           AI Interview Assistant © {new Date().getFullYear()}
//         </Text>
//       </Footer>
//     </Layout>
//   );
// };

// export default TestInterface;






import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Layout,
  Typography,
  Button,
  Row,
  Col,
  Spin,
  message,
  Card,
  Space,
  Progress,
  theme,
  Badge,
} from "antd";
import {
  VideoCameraOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  InfoCircleOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  CameraOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { ProgressHeader } from "./ProgressHeader";

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;
const { useToken } = theme;

const HeadCalibration = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationComplete, setCalibrationComplete] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [currentInstruction, setCurrentInstruction] = useState("");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const navigate = useNavigate();
  const { token: themeToken } = useToken();

  // Directions mapped to step indices
  const stepDirections = [
    { text: "CENTER", icon: null },
    { text: "LEFT", icon: <ArrowLeftOutlined /> },
    { text: "RIGHT", icon: <ArrowRightOutlined /> },
    { text: "TOP", icon: <ArrowUpOutlined /> },
    { text: "BOTTOM", icon: <ArrowDownOutlined /> },
  ];

  useEffect(() => {
    let mounted = true;
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (!mounted) return;
        streamRef.current = stream;
        setIsLoading(false);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().then(() => {
            // Initialize overlay canvas after video is playing
            initializeOverlayCanvas();
          });
        }
      })
      .catch(() => {
        message.error("Failed to access the webcam");
      });
    return () => {
      mounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Initialize overlay canvas with the same dimensions as the video
  const initializeOverlayCanvas = () => {
    if (!videoRef.current || !overlayCanvasRef.current) return;

    const updateCanvasDimensions = () => {
      if (!videoRef.current || !overlayCanvasRef.current) return;

      const video = videoRef.current;
      const canvas = overlayCanvasRef.current;

      // Get the computed style of the video element
      const videoStyles = window.getComputedStyle(video);
      const videoWidth = parseInt(videoStyles.width);
      const videoHeight = parseInt(videoStyles.height);

      // Set canvas dimensions to match the video display size
      canvas.width = videoWidth;
      canvas.height = videoHeight;

      // Draw current instruction on the canvas
      drawInstructionOverlay();
    };

    // Initial update and setup resize listener
    updateCanvasDimensions();
    window.addEventListener("resize", updateCanvasDimensions);

    // Clean up
    return () => {
      window.removeEventListener("resize", updateCanvasDimensions);
    };
  };

  // Draw the instruction overlay on the canvas
  const drawInstructionOverlay = () => {
    if (!overlayCanvasRef.current || !isCalibrating) return;

    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentStepIndex < stepDirections.length) {
      const direction = stepDirections[currentStepIndex];

      // Draw semi-transparent background for better text visibility
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, canvas.height - 60, canvas.width, 60);

      // Draw direction
      ctx.fillStyle = "#fff";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        `Look ${direction.text}`,
        canvas.width / 2,
        canvas.height - 30
      );

      // Draw direction indicator based on the current step
      ctx.strokeStyle = themeToken.colorPrimary;
      ctx.lineWidth = 3;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const arrowSize = Math.min(canvas.width, canvas.height) / 6;

      // Draw directional indicator based on step
      switch (currentStepIndex) {
        case 0: // CENTER
          ctx.beginPath();
          ctx.arc(centerX, centerY, arrowSize / 2, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
          ctx.fillStyle = themeToken.colorPrimary;
          ctx.fill();
          break;

        case 1: // LEFT
          ctx.beginPath();
          ctx.moveTo(centerX + arrowSize / 2, centerY);
          ctx.lineTo(centerX - arrowSize / 2, centerY);
          ctx.lineTo(centerX - arrowSize / 4, centerY - arrowSize / 4);
          ctx.moveTo(centerX - arrowSize / 2, centerY);
          ctx.lineTo(centerX - arrowSize / 4, centerY + arrowSize / 4);
          ctx.stroke();
          break;

        case 2: // RIGHT
          ctx.beginPath();
          ctx.moveTo(centerX - arrowSize / 2, centerY);
          ctx.lineTo(centerX + arrowSize / 2, centerY);
          ctx.lineTo(centerX + arrowSize / 4, centerY - arrowSize / 4);
          ctx.moveTo(centerX + arrowSize / 2, centerY);
          ctx.lineTo(centerX + arrowSize / 4, centerY + arrowSize / 4);
          ctx.stroke();
          break;

        case 3: // TOP/UP
          ctx.beginPath();
          ctx.moveTo(centerX, centerY + arrowSize / 2);
          ctx.lineTo(centerX, centerY - arrowSize / 2);
          ctx.lineTo(centerX - arrowSize / 4, centerY - arrowSize / 4);
          ctx.moveTo(centerX, centerY - arrowSize / 2);
          ctx.lineTo(centerX + arrowSize / 4, centerY - arrowSize / 4);
          ctx.stroke();
          break;

        case 4: // BOTTOM/DOWN
          ctx.beginPath();
          ctx.moveTo(centerX, centerY - arrowSize / 2);
          ctx.lineTo(centerX, centerY + arrowSize / 2);
          ctx.lineTo(centerX - arrowSize / 4, centerY + arrowSize / 4);
          ctx.moveTo(centerX, centerY + arrowSize / 2);
          ctx.lineTo(centerX + arrowSize / 4, centerY + arrowSize / 4);
          ctx.stroke();
          break;
      }
    }

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(drawInstructionOverlay);
  };

  useEffect(() => {
    // Update overlay when calibration status or step changes
    if (isCalibrating) {
      drawInstructionOverlay();
    } else if (overlayCanvasRef.current) {
      // Clear the canvas when not calibrating
      const ctx = overlayCanvasRef.current.getContext("2d");
      if (ctx)
        ctx.clearRect(
          0,
          0,
          overlayCanvasRef.current.width,
          overlayCanvasRef.current.height
        );

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [isCalibrating, currentStepIndex, currentInstruction]);

  const startCalibration = async () => {
    setIsCalibrating(true);
    setCalibrationProgress(0);
    setCalibrationComplete(false);
    setCurrentStepIndex(0);
    setCurrentInstruction("");
    try {
      const res = await axios.post("http://localhost:5000/start_tracking");
      setCurrentStepIndex(res.data.current_step || 0);
      setTotalSteps(res.data.total_steps || 0);
      setCurrentInstruction(
        res.data.steps?.[0] ||
          res.data.instruction ||
          "Follow the instructions."
      );
      message.info(
        "Calibration started. Follow the instructions and capture an image for each position."
      );
    } catch (err) {
      setIsCalibrating(false);
      message.error("Failed to start calibration");
    }
  };

  const captureFrame = async () => {
    console.log("capturing frame...");
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const loadingMsg = message.loading("Capturing and processing image...", 0);
    const base64Image = canvas.toDataURL("image/jpeg", 0.8);

    try {
      const res = await axios.post(
        "http://localhost:5000/advance_calibration",
        {
          image: base64Image,
        }
      );
      loadingMsg();

      if (res.data.status === "calibration_complete") {
        setCalibrationProgress(100);
        setCalibrationComplete(true);
        setIsCalibrating(false);
        setCurrentInstruction("");
        message.success("Calibration completed!");
      } else if (res.data.status === "calibration_in_progress") {
        setCurrentStepIndex(res.data.current_step);
        setTotalSteps(res.data.total_steps || totalSteps);
        setCalibrationProgress(
          Math.round(
            ((res.data.current_step || 0) / (res.data.total_steps || 1)) * 100
          )
        );
        setCurrentInstruction(
          (res.data.steps && res.data.steps[res.data.current_step]) ||
            res.data.instruction ||
            `Step ${res.data.current_step}`
        );
        message.success("Position captured!");
      } else if (res.data.status === "error") {
        message.error(res.data.message || "Calibration error");
      }
    } catch (err) {
      loadingMsg();
      message.error("Failed to upload the captured frame");
    }
  };

  const restartCalibration = () => {
    setIsCalibrating(false);
    setCalibrationComplete(false);
    setCalibrationProgress(0);
    setCurrentStepIndex(0);
    setCurrentInstruction("");
    setTotalSteps(0);
    message.info("Calibration reset. You can start again.");
  };

  const completeCalibration = () => {
    navigate("/test/:token/interview");
  };

  // UI for camera and calibration status
  const renderCameraStatus = () => {
    if (isLoading) {
      return (
        <div
          style={{
            height: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            background: "rgba(0,0,0,0.02)",
            borderRadius: 8,
          }}
        >
          <Spin size="large" />
          <Text style={{ marginTop: 16 }}>Initializing Camera...</Text>
        </div>
      );
    }
    if (isCalibrating) {
      return (
        <div>
          <div style={{ marginBottom: 16, textAlign: "center" }}>
            <Progress
              percent={calibrationProgress}
              status={calibrationProgress < 100 ? "active" : "success"}
            />
          </div>
          <Paragraph style={{ textAlign: "center", marginBottom: 16 }}>
            <Badge
              status="processing"
              text={
                <Text strong>
                  Calibration in progress... Please follow the instructions
                </Text>
              }
            />
          </Paragraph>
          <div
            style={{
              display: "flex",
              gap: "16px",
              justifyContent: "center",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Button
              type="primary"
              icon={<CameraOutlined />}
              onClick={captureFrame}
              size="large"
              style={{
                marginBottom: "16px",
                width: "200px",
                height: "40px",
              }}
            >
              Next ({currentStepIndex + 1}/{stepDirections.length})
            </Button>
            <div style={{ display: "flex", gap: "16px" }}>
              <Button icon={<ReloadOutlined />} onClick={restartCalibration}>
                Cancel
              </Button>
            </div>
          </div>
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <Text strong style={{ fontSize: 18 }}>
              {currentStepIndex < stepDirections.length ? (
                <Space>
                  {stepDirections[currentStepIndex].icon}
                  {`Look ${stepDirections[currentStepIndex].text}`}
                </Space>
              ) : (
                currentInstruction
              )}
            </Text>
          </div>
        </div>
      );
    }
    return (
      <div style={{ textAlign: "center" }}>
        {calibrationComplete ? (
          <div style={{ marginTop: 16 }}>
            <Badge
              status="success"
              text={
                <Text
                  strong
                  style={{
                    fontSize: 16,
                    color: "#52c41a",
                  }}
                >
                  Calibration Successfully Completed!
                </Text>
              }
            />
          </div>
        ) : (
          <>
            <Paragraph>
              <Text>
                Please start the calibration process when you're ready
              </Text>
            </Paragraph>
            <Button
              type="primary"
              size="large"
              block
              icon={<PlayCircleOutlined />}
              onClick={startCalibration}
              disabled={calibrationComplete}
              style={{
                height: 45,
                marginTop: 16,
                borderRadius: 8,
              }}
            >
              Start Calibration
            </Button>
          </>
        )}
      </div>
    );
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f7fa" }}>
      <Header
        style={{
          background: "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)",
          padding: "12px 24px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ paddingTop: "250px" }}>
          <ProgressHeader currentStep={1} />
        </div>

        <Row align="middle" justify="center">
          <Col>
            <Space align="center">
              <VideoCameraOutlined style={{ color: "#fff", fontSize: 24 }} />
              <Title level={3} style={{ color: "#fff", margin: 0 }}>
                Head Movement Calibration
              </Title>
            </Space>
          </Col>
        </Row>
      </Header>

      <Content
        style={{
          padding: "0 24px",
          position: "relative",
          paddingBottom: "80px",
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <Row gutter={[24, 24]}>
          <Col xs={24} md={16}>
            <Card
              title={
                <Space>
                  <VideoCameraOutlined
                    style={{ color: themeToken.colorPrimary }}
                  />
                  <span>Your Camera Feed</span>
                </Space>
              }
              style={{
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                borderRadius: "12px",
                overflow: "hidden",
                border: "none",
              }}
              bodyStyle={{ padding: 0 }}
            >
              <div style={{ padding: "20px", textAlign: "center" }}>
                <div
                  style={{
                    position: "relative",
                    marginBottom: "20px",
                    borderRadius: 8,
                    overflow: "hidden",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      maxHeight: "400px",
                      objectFit: "cover",
                      background: "#000",
                    }}
                  />
                  <canvas
                    ref={overlayCanvasRef}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      pointerEvents: "none", // Make sure clicks pass through to buttons below
                    }}
                  />
                </div>
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={480}
                  style={{ display: "none" }}
                />
                {renderCameraStatus()}
              </div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              title={
                <Space>
                  <PlayCircleOutlined
                    style={{ color: themeToken.colorPrimary }}
                  />
                  <span>Instruction Video</span>
                </Space>
              }
              style={{
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                borderRadius: "12px",
                overflow: "hidden",
                border: "none",
                height: "",
              }}
              bodyStyle={{ padding: "16px", height: "calc(100% - 57px)" }}
            >
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    borderRadius: 8,
                    overflow: "hidden",
                    flexGrow: 1,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    marginBottom: 16,
                  }}
                >
                  <video
                    width="100%"
                    height="100%"
                    controls
                    autoPlay
                    loop
                    style={{ objectFit: "cover", background: "#000" }}
                  >
                    <source
                      src="head-movement-instruction.mp4"
                      type="video/mp4"
                    />
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div
                  style={{
                    backgroundColor: "#f6f8fa",
                    padding: "12px",
                    borderRadius: 8,
                    textAlign: "center",
                  }}
                >
                  <Space>
                    <InfoCircleOutlined
                      style={{ color: themeToken.colorPrimary }}
                    />
                    <Text strong>
                      Follow these exact movements to calibrate properly
                    </Text>
                  </Space>
                </div>
              </div>
            </Card>
          </Col>
          {/* Moved the Calibration Instructions card outside the column layout and set xs={24} to span full width */}
          <Col xs={24}>
            <Card
              title={
                <Space>
                  <InfoCircleOutlined
                    style={{ color: themeToken.colorPrimary }}
                  />
                  <span>Calibration Instructions</span>
                </Space>
              }
              style={{
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                borderRadius: "12px",
                overflow: "hidden",
                border: "none",
              }}
            >
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={12}>
                  <Card
                    type="inner"
                    title={
                      <Space>
                        <div
                          style={{
                            backgroundColor: themeToken.colorPrimary,
                            color: "#fff",
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          1
                        </div>
                        <span>Position Yourself</span>
                      </Space>
                    }
                    style={{
                      borderRadius: 8,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      height: "100%",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                        }}
                      >
                        <CheckCircleOutlined
                          style={{
                            color: themeToken.colorPrimary,
                            marginTop: 4,
                          }}
                        />
                        <Text>Sit approximately 2 feet from your camera</Text>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                        }}
                      >
                        <CheckCircleOutlined
                          style={{
                            color: themeToken.colorPrimary,
                            marginTop: 4,
                          }}
                        />
                        <Text>Ensure your face is clearly visible</Text>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                        }}
                      >
                        <CheckCircleOutlined
                          style={{
                            color: themeToken.colorPrimary,
                            marginTop: 4,
                          }}
                        />
                        <Text>
                          Remove any obstructions (hats, glasses, etc.)
                        </Text>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card
                    type="inner"
                    title={
                      <Space>
                        <div
                          style={{
                            backgroundColor: themeToken.colorPrimary,
                            color: "#fff",
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          2
                        </div>
                        <span>Movement Sequence</span>
                      </Space>
                    }
                    style={{
                      borderRadius: 8,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      height: "100%",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      {stepDirections.map((direction, index) => (
                        <div
                          key={index}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                          }}
                        >
                          {direction.icon || (
                            <ArrowRightOutlined
                              style={{
                                color: themeToken.colorPrimary,
                                marginTop: 4,
                              }}
                            />
                          )}
                          <Text>Look {direction.text} and click "Next"</Text>
                        </div>
                      ))}
                    </div>
                  </Card>
                </Col>
              </Row>
              {calibrationComplete && (
                <div
                  style={{
                    marginTop: 24,
                    padding: 16,
                    background: "rgba(82, 196, 26, 0.1)",
                    borderRadius: 8,
                    border: "1px solid rgba(82, 196, 26, 0.2)",
                  }}
                >
                  <Row align="middle" justify="space-between">
                    <Col xs={24} sm={12}>
                      <Space>
                        <CheckCircleOutlined
                          style={{ color: "#52c41a", fontSize: 20 }}
                        />
                        <Text strong style={{ fontSize: 16 }}>
                          Calibration completed successfully!
                        </Text>
                      </Space>
                    </Col>
                    <Col
                      xs={24}
                      sm={12}
                      style={{ textAlign: "right", marginTop: 16 }}
                    >
                      <Space>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={restartCalibration}
                        >
                          Restart
                        </Button>
                        <Button
                          type="primary"
                          icon={<ArrowRightOutlined />}
                          onClick={completeCalibration}
                          style={{
                            background: "#52c41a",
                            borderColor: "#52c41a",
                          }}
                        >
                          Proceed to Test
                        </Button>
                      </Space>
                    </Col>
                  </Row>
                </div>
              )}
              {isCalibrating && (
                <div
                  style={{
                    marginTop: 24,
                    padding: 16,
                    background: "rgba(24, 144, 255, 0.1)",
                    borderRadius: 8,
                    border: "1px solid rgba(24, 144, 255, 0.2)",
                  }}
                >
                  <Space>
                    <ExclamationCircleOutlined
                      style={{ color: themeToken.colorPrimary }}
                    />
                    <Text>
                      <Text strong>Important:</Text> Keep your head within the
                      camera frame during the entire calibration process.
                    </Text>
                  </Space>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default HeadCalibration;
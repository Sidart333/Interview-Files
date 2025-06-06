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
import { useNavigate, useParams } from "react-router-dom";
import { ProgressHeader } from "./ProgressHeader";
import EdgeDots from "./EdgeDots";

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;
const { useToken } = theme;

const CAMERA_URL = "http://localhost:5000";


type CalibrationResponse = {
  status: string;
  current_step?: number;
  total_steps?: number;
  steps?: string[];
  instruction?: string;
  message?: string;
  calibration_data?: {
    calibrated?: boolean;
    [key: string]: any;
  };
};

const stepDirections = [
  { text: "CENTER", icon: null },
  { text: "LEFT", icon: <ArrowLeftOutlined /> },
  { text: "RIGHT", icon: <ArrowRightOutlined /> },
  { text: "TOP", icon: <ArrowUpOutlined /> },
  { text: "BOTTOM", icon: <ArrowDownOutlined /> },
];

const calibrationStepToDot = [
  null, // 0: CENTER (not an edge dot)
  1, // 1: LEFT  -> EdgeDots[1]
  2, // 2: RIGHT -> EdgeDots[2]
  0, // 3: TOP   -> EdgeDots[0]
  3, // 4: BOTTOM-> EdgeDots[3]
];

const HeadCalibration = () => {
  const { token } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationComplete, setCalibrationComplete] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [currentInstruction, setCurrentInstruction] = useState("");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const navigate = useNavigate();
  const params = useParams();
  const { token: themeToken } = useToken();

  // Fetch session-based calibration on mount
  useEffect(() => {
    const fetchCalibration = async () => {
      if (!token) return;
      try {
        const res = await axios.post<CalibrationResponse>(`${CAMERA_URL}/get-calibration`, {
          token,
        });
        if (res.data.calibration_data?.calibrated) {
          setCalibrationComplete(true);
          message.success("Calibration already completed for this session.");
        }
      } catch {
        // No calibration session exists, proceed as normal
        setCalibrationComplete(false)
      }
    };
    fetchCalibration();
  }, [token]);

  // Video initialization
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
          videoRef.current.play();
        }
      })
      .catch(() => message.error("Failed to access the webcam"));
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  // Overlay canvas sizing (matches video)
  useEffect(() => {
    const handleResize = () => {
      if (videoRef.current && overlayCanvasRef.current) {
        const video = videoRef.current;
        const canvas = overlayCanvasRef.current;
        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;
        drawInstructionOverlay();
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize(); // initial sync
    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line
  }, [isCalibrating, currentStepIndex]);

  // Redraw overlay on calibration or step changes
  useEffect(() => {
    drawInstructionOverlay();
    return () => {
      if (overlayCanvasRef.current) {
        const ctx = overlayCanvasRef.current.getContext("2d");
        if (ctx)
          ctx.clearRect(
            0,
            0,
            overlayCanvasRef.current.width,
            overlayCanvasRef.current.height
          );
      }
    };
    // eslint-disable-next-line
  }, [isCalibrating, currentStepIndex]);

  const drawInstructionOverlay = () => {
    if (!overlayCanvasRef.current || !isCalibrating) return;
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentStepIndex < stepDirections.length) {
      const direction = stepDirections[currentStepIndex];

      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, canvas.height - 60, canvas.width, 60);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        `Look ${direction?.text ?? ""}`,
        canvas.width / 2,
        canvas.height - 30
      );

      ctx.strokeStyle = themeToken.colorPrimary;
      ctx.lineWidth = 3;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const arrowSize = Math.min(canvas.width, canvas.height) / 6;

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
        case 3: // TOP
          ctx.beginPath();
          ctx.moveTo(centerX, centerY + arrowSize / 2);
          ctx.lineTo(centerX, centerY - arrowSize / 2);
          ctx.lineTo(centerX - arrowSize / 4, centerY - arrowSize / 4);
          ctx.moveTo(centerX, centerY - arrowSize / 2);
          ctx.lineTo(centerX + arrowSize / 4, centerY - arrowSize / 4);
          ctx.stroke();
          break;
        case 4: // BOTTOM
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
  };

  // Start calibration
  const startCalibration = async () => {
    setIsCalibrating(true);
    setCalibrationProgress(0);
    setCalibrationComplete(false);
    setCurrentStepIndex(0);
    setCurrentInstruction("");
    try {
      if (token) {
        await axios.post<CalibrationResponse>(`${CAMERA_URL}/clear-session`, { token }); // clear any old session
      }
      const res = await axios.post(
        `${CAMERA_URL}/start_tracking`,
        {
          token,
          name: candidateName,
        },
        { headers: { "Content-Type": "application/json" } }
      );
      const data = res.data as CalibrationResponse;
      setCurrentStepIndex(data.current_step || 0);
      setCurrentInstruction(
        data.steps?.[0] ||
          data.instruction ||
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

  // Capture frame & send for calibration
  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const loadingMsg = message.loading("Capturing and processing image...", 0);
    const base64Image = canvas.toDataURL("image/jpeg", 0.8);

    try {
      const res = await axios.post<CalibrationResponse>(`${CAMERA_URL}/advance_calibration`, {
        image: base64Image,
        token,
      });
      loadingMsg();
      if (res.data.status === "calibration_complete") {
        setCalibrationProgress(100);
        setCalibrationComplete(true);
        setIsCalibrating(false);
        setCurrentInstruction("");
        message.success("Calibration completed!");

        // Save session-based calibration
        if (token) {
          try {
            await axios.post(`${CAMERA_URL}/save-calibration`, {
              token,
              calibration_data: res.data.calibration_data, // you can expand this object
            });
            message.success("Calibration session saved!");
          } catch {
            message.error("Failed to save calibration session.");
          }
        }
      } else if (res.data.status === "calibration_in_progress") {
        setCurrentStepIndex(res.data.current_step || 0);
        setCalibrationProgress(
          Math.round(
            ((res.data.current_step || 0) / stepDirections.length) * 100
          )
        );
        setCurrentInstruction(
          (res.data.steps && res.data.steps[res.data.current_step || 0]) ||
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

  // Restart calibration and clear session
  const restartCalibration = async () => {
    setIsCalibrating(false);
    setCalibrationComplete(false);
    setCalibrationProgress(0);
    setCurrentStepIndex(0);
    setCurrentInstruction("");
    message.info("Calibration reset. You can start again.");

    if (token) {
      try {
        await axios.post(`${CAMERA_URL}/clear-session`, { token });
        message.info("Calibration session cleared!");
      } catch {
        message.warning("Failed to clear calibration session.");
      }
    }
  };

  // Proceed to test (replace :token with real token if using router param)
  const completeCalibration = () => {
    if (params.token) {
      navigate(`/test/${params.token}/interview`);
    } else {
      navigate("/test/:token/interview");
    }
  };

  // UI for camera and calibration status (YOUR ORIGINAL CODE REMAINS UNCHANGED BELOW)
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
                  {stepDirections[currentStepIndex]?.icon}
                  {stepDirections[currentStepIndex]
                    ? `Look ${stepDirections[currentStepIndex].text}`
                    : ""}
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
      <EdgeDots
        active={
          currentStepIndex === 0
            ? -1
            : calibrationStepToDot[currentStepIndex] ?? undefined
        }
      />

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
                      pointerEvents: "none",
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

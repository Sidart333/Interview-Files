import { useState, useEffect, useRef } from "react";
import apiService from "../services/apiService"; // ← Add this import
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
  Badge,
} from "antd";
import {
  VideoCameraOutlined,
  PlayCircleOutlined,
  InfoCircleOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
  CameraOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import EdgeDots from "./EdgeDots";

const { Content } = Layout;
const { Title, Text } = Typography;

// type CalibrationResponse = {
//   status: string;
//   current_step?: number;
//   total_steps?: number;
//   steps?: string[];
//   instruction?: string;
//   message?: string;
//   calibration_data?: {
//     calibrated?: boolean;
//     [key: string]: any;
//   };
// };

const stepDirections = [
  { text: "CENTER", icon: null },
  { text: "LEFT", icon: <ArrowLeftOutlined /> },
  { text: "RIGHT", icon: <ArrowRightOutlined /> },
  { text: "TOP", icon: <ArrowUpOutlined /> },
  { text: "BOTTOM", icon: <ArrowDownOutlined /> },
];

const calibrationStepToDot = [null, 1, 2, 0, 3];

const HeadCalibration = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const params = useParams();

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

  // Fetch session-based calibration on mount
  useEffect(() => {
    const fetchCalibration = async () => {
      if (!token) return;
      try {
        const calibrationData = await apiService.getCalibration(token);
        if (calibrationData.calibration_data?.calibrated) {
          setCalibrationComplete(true);
          message.success("Calibration already completed for this session.");
        }
      } catch {
        setCalibrationComplete(false);
      }
    };
    fetchCalibration();
  }, [token]);

  // Video initialization
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeCamera = () => {
      console.log("Starting camera initialization...");

      // Set a timeout to show error if camera doesn't load in 10 seconds
      timeoutId = setTimeout(() => {
        if (mounted && isLoading) {
          console.error("Camera initialization timeout");
          message.error(
            "Camera initialization timed out. Please check permissions and try again."
          );
          setIsLoading(false);
        }
      }, 10000);

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("getUserMedia not supported");
        message.error("Camera not supported in this browser");
        setIsLoading(false);
        return;
      }

      console.log("Requesting camera access...");

      navigator.mediaDevices
        .getUserMedia({
          video: {
            width: 640,
            height: 480,
          },
        })
        .then((stream) => {
          console.log("✅ Camera access granted!");
          console.log("Stream:", stream);
          console.log("Video tracks:", stream.getVideoTracks());

          if (!mounted) {
            console.log("Component unmounted, cleaning up stream");
            stream.getTracks().forEach((track) => track.stop());
            return;
          }

          streamRef.current = stream;

          if (videoRef.current) {
            console.log("Setting video source...");
            videoRef.current.srcObject = stream;

            // Force the video to load and play
            videoRef.current.load();

            videoRef.current.addEventListener("loadedmetadata", () => {
              console.log("Video metadata loaded");
              console.log(
                "Video dimensions:",
                videoRef.current?.videoWidth,
                "x",
                videoRef.current?.videoHeight
              );

              if (videoRef.current) {
                videoRef.current
                  .play()
                  .then(() => {
                    console.log("✅ Video is now playing!");
                    clearTimeout(timeoutId);
                    setIsLoading(false);
                  })
                  .catch((err) => {
                    console.error("❌ Video play failed:", err);
                    message.error("Failed to play video: " + err.message);
                    setIsLoading(false);
                  });
              }
            });

            videoRef.current.addEventListener("error", (e) => {
              console.error("❌ Video element error:", e);
              message.error("Video element error");
              setIsLoading(false);
            });
          } else {
            console.error("❌ Video ref is null");
            setIsLoading(false);
          }
        })
        .catch((err) => {
          console.error("❌ getUserMedia failed:", err);
          clearTimeout(timeoutId);

          let errorMessage = "Camera access failed: ";
          switch (err.name) {
            case "NotAllowedError":
              errorMessage +=
                "Permission denied. Please allow camera access and refresh.";
              break;
            case "NotFoundError":
              errorMessage += "No camera found on this device.";
              break;
            case "NotReadableError":
              errorMessage += "Camera is being used by another application.";
              break;
            case "OverconstrainedError":
              errorMessage += "Camera constraints not supported.";
              break;
            default:
              errorMessage += err.message;
          }

          message.error(errorMessage);
          setIsLoading(false);
        });
    };

    // Start camera initialization
    initializeCamera();

    return () => {
      console.log("Cleaning up camera resources...");
      mounted = false;
      clearTimeout(timeoutId);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          console.log("Stopping track:", track.kind);
          track.stop();
        });
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isLoading]);

  // Overlay canvas sizing
  useEffect(() => {
    const handleResize = () => {
      if (videoRef.current && overlayCanvasRef.current) {
        const video = videoRef.current;
        const canvas = overlayCanvasRef.current;
        const rect = video.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        canvas.style.width = rect.width + "px";
        canvas.style.height = rect.height + "px";
        drawInstructionOverlay();
      }
    };

    const video = videoRef.current;
    if (video) {
      video.addEventListener("loadedmetadata", handleResize);
      video.addEventListener("resize", handleResize);
    }

    window.addEventListener("resize", handleResize);

    // Initial call with delay to ensure video is loaded
    setTimeout(handleResize, 100);

    return () => {
      if (video) {
        video.removeEventListener("loadedmetadata", handleResize);
        video.removeEventListener("resize", handleResize);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, [isCalibrating, currentStepIndex, isLoading]);

  // Redraw overlay on changes
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

      ctx.strokeStyle = "#1E88E5";
      ctx.lineWidth = 3;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const arrowSize = Math.min(canvas.width, canvas.height) / 6;

      switch (currentStepIndex) {
        case 0:
          ctx.beginPath();
          ctx.arc(centerX, centerY, arrowSize / 2, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
          ctx.fillStyle = "#1E88E5";
          ctx.fill();
          break;
        case 1:
          ctx.beginPath();
          ctx.moveTo(centerX + arrowSize / 2, centerY);
          ctx.lineTo(centerX - arrowSize / 2, centerY);
          ctx.lineTo(centerX - arrowSize / 4, centerY - arrowSize / 4);
          ctx.moveTo(centerX - arrowSize / 2, centerY);
          ctx.lineTo(centerX - arrowSize / 4, centerY + arrowSize / 4);
          ctx.stroke();
          break;
        case 2:
          ctx.beginPath();
          ctx.moveTo(centerX - arrowSize / 2, centerY);
          ctx.lineTo(centerX + arrowSize / 2, centerY);
          ctx.lineTo(centerX + arrowSize / 4, centerY - arrowSize / 4);
          ctx.moveTo(centerX + arrowSize / 2, centerY);
          ctx.lineTo(centerX + arrowSize / 4, centerY + arrowSize / 4);
          ctx.stroke();
          break;
        case 3:
          ctx.beginPath();
          ctx.moveTo(centerX, centerY + arrowSize / 2);
          ctx.lineTo(centerX, centerY - arrowSize / 2);
          ctx.lineTo(centerX - arrowSize / 4, centerY - arrowSize / 4);
          ctx.moveTo(centerX, centerY - arrowSize / 2);
          ctx.lineTo(centerX + arrowSize / 4, centerY - arrowSize / 4);
          ctx.stroke();
          break;
        case 4:
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

  const startCalibration = async () => {
    setIsCalibrating(true);
    setCalibrationProgress(0);
    setCalibrationComplete(false);
    setCurrentStepIndex(0);
    setCurrentInstruction("");
    try {
      if (token) {
        await apiService.clearSession(token);
      }
      const data = await apiService.startTracking(token!);
      setCurrentStepIndex(data.current_step || 0);
      setCurrentInstruction(
        data.steps?.[0] || data.instruction || "Follow the instructions."
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
    if (!videoRef.current || !canvasRef.current || !streamRef.current) {
      message.error("Camera not properly initialized");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      message.error("Cannot access canvas context");
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const loadingMsg = message.loading("Capturing and processing image...", 0);
    const base64Image = canvas.toDataURL("image/jpeg", 0.8);

    try {
      const res = await apiService.advanceCalibration({
        image: base64Image,
        token: token!,
      });

      loadingMsg();

      if (res.status === "calibration_complete") {
        setCalibrationProgress(100);
        setCalibrationComplete(true);
        setIsCalibrating(false);
        setCurrentInstruction("");
        message.success("Calibration completed!");

        if (token) {
          try {
            await apiService.saveCalibration({
              token,
              calibration_data: res.calibration_data,
            });
            message.success("Calibration session saved!");
          } catch {
            message.error("Failed to save calibration session.");
          }
        }
      } else if (res.status === "calibration_in_progress") {
        const newStep = res.current_step || 0;
        setCurrentStepIndex(newStep);
        setCalibrationProgress(
          Math.round((newStep / stepDirections.length) * 100)
        );
        setCurrentInstruction(
          (res.steps && res.steps[newStep]) ||
            res.instruction ||
            `Step ${newStep + 1}`
        );
        message.success("Position captured! Move to next position.");
      } else if (res.status === "error") {
        message.error(res.message || "Calibration error");
      }
    } catch (err) {
      loadingMsg();
      console.error("Capture error:", err);
      message.error("Failed to upload the captured frame");
    }
  };

  const restartCalibration = async () => {
    setIsCalibrating(false);
    setCalibrationComplete(false);
    setCalibrationProgress(0);
    setCurrentStepIndex(0);
    setCurrentInstruction("");
    message.info("Calibration reset. You can start again.");

    if (token) {
      try {
        await apiService.clearSession(token);
        message.info("Calibration session cleared!");
      } catch {
        message.warning("Failed to clear calibration session.");
      }
    }
  };

  const completeCalibration = () => {
    if (params.token) {
      navigate(`/test/${params.token}/interview`);
    } else {
      navigate("/test/:token/interview");
    }
  };

  return (
    <Layout
      style={{ height: "100vh", background: "#f5f7fa", overflow: "hidden" }}
    >
      <EdgeDots
        active={
          currentStepIndex === 0
            ? -1
            : calibrationStepToDot[currentStepIndex] ?? undefined
        }
      />

      {/* Progress Header */}
      <div
        style={{
          background: "#fff",
          padding: "16px 24px",
          borderBottom: "1px solid #f0f0f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "#f5f5f5",
                color: "#bfbfbf",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              1
            </div>
            <Text style={{ color: "#bfbfbf" }}>Credentials</Text>
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
              2
            </div>
            <Text style={{ color: "#1E88E5", fontWeight: "500" }}>
              Calibration
            </Text>
          </div>

          <div
            style={{ width: "40px", height: "2px", background: "#e8e8e8" }}
          ></div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "#f5f5f5",
                color: "#bfbfbf",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              3
            </div>
            <Text style={{ color: "#bfbfbf" }}>Interview</Text>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 65px)" }}>
        {/* Left Sidebar */}
        <div
          style={{
            background: "#1E88E5",
            padding: "20px",
            width: "300px",
            height: "100%",
            color: "#fff",
            overflow: "auto",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                background: "rgba(255,255,255,0.15)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px auto",
              }}
            >
              <VideoCameraOutlined
                style={{ fontSize: "24px", color: "#fff" }}
              />
            </div>
            <Title level={5} style={{ color: "#fff", margin: "0 0 8px 0" }}>
              Head Movement Calibration
            </Title>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <SafetyOutlined
                style={{ fontSize: "16px", marginRight: "8px" }}
              />
              <Text
                style={{ color: "#fff", fontSize: "14px", fontWeight: "500" }}
              >
                Current Step
              </Text>
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.1)",
                borderRadius: "6px",
                padding: "12px",
              }}
            >
              <Text
                style={{ color: "#fff", fontSize: "13px", fontWeight: "500" }}
              >
                {isCalibrating
                  ? `${currentStepIndex + 1}/5: Look ${
                      stepDirections[currentStepIndex]?.text || ""
                    }`
                  : calibrationComplete
                  ? "Calibration Complete"
                  : "Ready to Start"}
              </Text>
              <Progress
                percent={calibrationProgress}
                showInfo={false}
                strokeColor="#fff"
                trailColor="rgba(255,255,255,0.2)"
                size="small"
                style={{ marginTop: "8px" }}
              />
            </div>
          </div>

          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <InfoCircleOutlined
                style={{ fontSize: "16px", marginRight: "8px" }}
              />
              <Text
                style={{ color: "#fff", fontSize: "14px", fontWeight: "500" }}
              >
                Instructions
              </Text>
            </div>

            <div
              style={{
                fontSize: "12px",
                color: "rgba(255,255,255,0.9)",
                lineHeight: "1.6",
              }}
            >
              <div style={{ marginBottom: "12px" }}>
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "500",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  1. Position Setup:
                </Text>
                • Sit 2 feet from camera
                <br />
                • Face clearly visible
                <br />• Remove obstructions
              </div>

              <div style={{ marginBottom: "12px" }}>
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "500",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  2. Movement Sequence:
                </Text>
                {stepDirections.map((direction, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      margin: "4px 0",
                    }}
                  >
                    <span
                      style={{
                        color:
                          currentStepIndex === index
                            ? "#4ade80"
                            : "rgba(255,255,255,0.7)",
                      }}
                    >
                      {index + 1}. Look {direction.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Content
          style={{
            padding: "20px",
            background: "#f5f7fa",
            height: "100%",
            overflow: "auto",
          }}
        >
          <Row gutter={[16, 16]} style={{ height: "100%" }}>
            <Col xs={24} lg={14}>
              <Card
                title={
                  <Space>
                    <VideoCameraOutlined style={{ color: "#1E88E5" }} />
                    <span>Camera Feed</span>
                  </Space>
                }
                style={{
                  borderRadius: "8px",
                  boxShadow:
                    "0 1px 2px 0 rgba(0,0,0,0.03), 0 1px 6px -1px rgba(0,0,0,0.02), 0 2px 4px 0 rgba(0,0,0,0.02)",
                  border: "1px solid #f0f0f0",
                  background: "#fff",
                  height: "100%",
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
                      position: "relative",
                      borderRadius: "6px",
                      overflow: "hidden",
                      marginBottom: "16px",
                      height: "500px",
                    }}
                  >
                    {isLoading ? (
                      <div
                        style={{
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "column",
                          background: "#f8f9fa",
                          border: "2px dashed #d9d9d9",
                        }}
                      >
                        <Spin size="large" />
                        <Text style={{ marginTop: "16px", color: "#666" }}>
                          Initializing Camera...
                        </Text>
                        <Text
                          style={{
                            marginTop: "8px",
                            fontSize: "12px",
                            color: "#999",
                          }}
                        >
                          Please allow camera permissions if prompted
                        </Text>
                      </div>
                    ) : streamRef.current ? (
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          height: "100%",
                        }}
                      >
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          controls={false}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            background: "#000",
                            display: "block",
                            transform: "scaleX(-1)", // Mirror the video like a selfie camera
                          }}
                          onLoadedData={() => {
                            console.log("Video data loaded");
                            if (videoRef.current) {
                              console.log(
                                "Video ready state:",
                                videoRef.current.readyState
                              );
                              console.log(
                                "Video dimensions:",
                                videoRef.current.videoWidth,
                                "x",
                                videoRef.current.videoHeight
                              );
                            }
                          }}
                          onCanPlay={() => {
                            console.log("Video can play");
                            if (videoRef.current && videoRef.current.paused) {
                              videoRef.current.play().catch(console.error);
                            }
                          }}
                          onPlay={() => {
                            console.log("Video started playing");
                            console.log(
                              "Current time:",
                              videoRef.current?.currentTime
                            );
                          }}
                          onTimeUpdate={() => {
                            // This will log periodically if video is actually playing
                            if (
                              videoRef.current?.currentTime &&
                              videoRef.current.currentTime > 0
                            ) {
                              console.log(
                                "Video is actively playing, time:",
                                videoRef.current.currentTime
                              );
                            }
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
                            zIndex: 1,
                          }}
                        />

                        {/* Debug info overlay */}
                        <div
                          style={{
                            position: "absolute",
                            top: "10px",
                            left: "10px",
                            background: "rgba(0,0,0,0.7)",
                            color: "white",
                            padding: "5px",
                            fontSize: "12px",
                            borderRadius: "3px",
                            zIndex: 2,
                          }}
                        >
                          Stream: {streamRef.current ? "Active" : "None"}
                          <br />
                          Tracks: {streamRef.current?.getTracks().length || 0}
                          <br />
                          Video: {videoRef.current?.videoWidth || 0}x
                          {videoRef.current?.videoHeight || 0}
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "column",
                          background: "#ffebee",
                          border: "2px dashed #f44336",
                          color: "#d32f2f",
                        }}
                      >
                        <VideoCameraOutlined
                          style={{ fontSize: "48px", marginBottom: "16px" }}
                        />
                        <Text style={{ color: "#d32f2f", fontWeight: "bold" }}>
                          Camera Not Available
                        </Text>
                        <Text
                          style={{
                            fontSize: "12px",
                            color: "#666",
                            textAlign: "center",
                            marginTop: "8px",
                          }}
                        >
                          Please check browser permissions
                          <br />
                          or try refreshing the page
                        </Text>
                        <Button
                          size="small"
                          onClick={() => window.location.reload()}
                          style={{ marginTop: "12px" }}
                        >
                          Refresh Page
                        </Button>
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: "center" }}>
                    {!isCalibrating && !calibrationComplete && (
                      <Button
                        type="primary"
                        size="large"
                        icon={<PlayCircleOutlined />}
                        onClick={startCalibration}
                        style={{
                          height: "44px",
                          borderRadius: "6px",
                          background: "#1E88E5",
                          border: "none",
                          fontSize: "15px",
                          fontWeight: "500",
                        }}
                      >
                        Start Calibration
                      </Button>
                    )}

                    {isCalibrating && (
                      <Space size="middle">
                        <Button
                          type="primary"
                          icon={<CameraOutlined />}
                          onClick={captureFrame}
                          size="large"
                          style={{
                            height: "44px",
                            borderRadius: "6px",
                            background: "#1E88E5",
                            border: "none",
                          }}
                        >
                          Capture ({currentStepIndex + 1}/
                          {stepDirections.length})
                        </Button>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={restartCalibration}
                          size="large"
                          style={{ height: "44px", borderRadius: "6px" }}
                        >
                          Cancel
                        </Button>
                      </Space>
                    )}

                    {calibrationComplete && (
                      <Space size="middle">
                        <Badge status="success" text="Calibration Complete!" />
                        <Button
                          type="primary"
                          icon={<ArrowRightOutlined />}
                          onClick={completeCalibration}
                          size="large"
                          style={{
                            height: "44px",
                            borderRadius: "6px",
                            background: "#52c41a",
                            border: "none",
                          }}
                        >
                          Proceed to Test
                        </Button>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={restartCalibration}
                          size="large"
                          style={{ height: "44px", borderRadius: "6px" }}
                        >
                          Restart
                        </Button>
                      </Space>
                    )}
                  </div>
                </div>

                <canvas
                  ref={canvasRef}
                  width={640}
                  height={480}
                  style={{ display: "none" }}
                />
              </Card>
            </Col>

            <Col xs={24} lg={10}>
              <Card
                title={
                  <Space>
                    <PlayCircleOutlined style={{ color: "#1E88E5" }} />
                    <span>Demo Video</span>
                  </Space>
                }
                style={{
                  borderRadius: "8px",
                  boxShadow:
                    "0 1px 2px 0 rgba(0,0,0,0.03), 0 1px 6px -1px rgba(0,0,0,0.02), 0 2px 4px 0 rgba(0,0,0,0.02)",
                  border: "1px solid #f0f0f0",
                  background: "#fff",
                  height: "100%",
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
                      borderRadius: "6px",
                      overflow: "hidden",
                      height: "200px",
                      marginBottom: "12px",
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
                      background: "#f8f9fa",
                      padding: "12px",
                      borderRadius: "6px",
                      textAlign: "center",
                    }}
                  >
                    <Space>
                      <InfoCircleOutlined style={{ color: "#1E88E5" }} />
                      <Text style={{ fontSize: "13px", fontWeight: "500" }}>
                        Follow these exact movements for proper calibration
                      </Text>
                    </Space>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </Content>
      </div>
    </Layout>
  );
};

export default HeadCalibration;

import React from "react";
import { Progress, Typography } from "antd";
import { WarningOutlined, StopOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface WarningOverlayProps {
  tabSwitchCount: number;
  isVisible: boolean;
  onDismiss: () => void;
}

const WarningOverlay: React.FC<WarningOverlayProps> = ({
  tabSwitchCount,
  isVisible,
  onDismiss,
}) => {
  if (!isVisible || tabSwitchCount === 0) return null;

  const getWarningConfig = () => {
    switch (tabSwitchCount) {
      case 1:
        return {
          title: "First Warning - Tab Switch Detected",
          message:
            "You switched tabs during the test. Please stay focused on the interview window.",
          color: "#faad14",
          icon: <WarningOutlined />,
        };
      case 2:
        return {
          title: "Second Warning - Final Notice",
          message:
            "This is your final warning. One more tab switch will terminate your test immediately.",
          color: "#ff4d4f",
          icon: <StopOutlined />,
        };
      default:
        return {
          title: "Test Will Be Terminated",
          message:
            "You have exceeded the maximum number of tab switches allowed.",
          color: "#ff4d4f",
          icon: <StopOutlined />,
        };
    }
  };

  const config = getWarningConfig();
  const progressPercent = (tabSwitchCount / 3) * 100;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "12px",
          padding: "40px",
          maxWidth: "500px",
          width: "90%",
          textAlign: "center",
          border: `3px solid ${config.color}`,
        }}
      >
        <div
          style={{
            fontSize: "60px",
            color: config.color,
            marginBottom: "20px",
          }}
        >
          {config.icon}
        </div>

        <Title level={2} style={{ color: config.color, marginBottom: "16px" }}>
          {config.title}
        </Title>

        <Text
          style={{ fontSize: "16px", display: "block", marginBottom: "24px" }}
        >
          {config.message}
        </Text>

        <div style={{ marginBottom: "24px" }}>
          <Text strong style={{ display: "block", marginBottom: "8px" }}>
            Tab Switches: {tabSwitchCount}/3
          </Text>
          <Progress
            percent={progressPercent}
            strokeColor={config.color}
            trailColor="#f0f0f0"
            size="small"
          />
        </div>

        <button
          onClick={onDismiss}
          style={{
            backgroundColor: config.color,
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          I Understand - Continue Test
        </button>
      </div>
    </div>
  );
};

export default WarningOverlay;

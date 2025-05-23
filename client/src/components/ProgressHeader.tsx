import React, { useEffect, useState } from "react";
import { Steps, Typography, message } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";

const { Step } = Steps;
const { Text, Title } = Typography;

const stepTitles = ["Credentials", "Calibration", "Interview"];

interface ProgressHeaderProps {
  currentStep: number;
}

export const ProgressHeader: React.FC<ProgressHeaderProps> = ({
  currentStep,
}) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [previousStep, setPreviousStep] = useState(currentStep);

  useEffect(() => {
    if (currentStep > previousStep && currentStep > 0) {
      messageApi.open({
        key: "progress-toast",
        type: "success",
        content: `You have completed ${stepTitles[currentStep - 1]}.`,
        duration: 2,
      });
      setPreviousStep(currentStep);
    }
  }, [currentStep, messageApi, previousStep]);

  const items = stepTitles.map((title, idx) => ({
    title: (
      <span
        style={{
          fontWeight: idx === currentStep ? "bold" : "normal",
          color:
            idx < currentStep
              ? "#52c41a"
              : idx === currentStep
              ? "#1677ff"
              : "#aaa",
          fontSize: 16,
        }}
      >
        {title}
      </span>
    ),
    icon:
      idx < currentStep ? (
        <CheckCircleOutlined style={{ color: "#52c41a" }} />
      ) : undefined,
  }));

  return (
    <div
      style={{
        width: 230,
        minHeight: 340,
        background:
          "linear-gradient(135deg, #e3ecfc 0%, #f8fafc 100%)",
        boxShadow: "0 6px 36px 0 rgba(35, 68, 101, 0.10)",
        borderRadius: 18,
        padding: "38px 22px 24px 28px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        position: "relative",
      }}
    >
      {contextHolder}
      <Title level={5} style={{ color: "#1a263a", marginBottom: 26, fontWeight: 700 }}>
        Progress
      </Title>
      <Steps
        direction="vertical"
        current={currentStep}
        items={items}
        style={{
          background: "none",
          marginBottom: 20,
        }}
        progressDot={false}
      />
      <div
        style={{
          marginTop: 16,
          fontSize: 15,
          fontWeight: 500,
          color:
            currentStep === stepTitles.length - 1
              ? "#52c41a"
              : "#1677ff",
        }}
      >
        {currentStep === 0 ? (
          <span>Please complete the first step</span>
        ) : currentStep === stepTitles.length - 1 ? (
          <span>All steps completed!</span>
        ) : (
          <span>
            Step {currentStep} of {stepTitles.length - 1} completed
          </span>
        )}
      </div>
    </div>
  );
};

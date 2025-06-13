import React from "react";
import { Result, Button, Card, Typography } from "antd";
import { CloseCircleOutlined, HomeOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Paragraph, Text } = Typography;

const TestTerminated: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <Card
        style={{
          maxWidth: "600px",
          width: "100%",
          borderRadius: "12px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
          border: "none",
        }}
        bodyStyle={{ padding: "40px" }}
      >
        <Result
          icon={<CloseCircleOutlined style={{ color: "#ff4d4f" }} />}
          title={
            <span
              style={{ color: "#262626", fontSize: "28px", fontWeight: "bold" }}
            >
              Test Session Terminated
            </span>
          }
          subTitle={
            <div>
              <Paragraph
                style={{
                  fontSize: "16px",
                  color: "#8c8c8c",
                  marginBottom: "24px",
                }}
              >
                Your test session has been automatically terminated for security
                reasons.
              </Paragraph>

              <div
                style={{
                  background: "#fff2f0",
                  border: "1px solid #ffccc7",
                  borderRadius: "8px",
                  padding: "20px",
                  marginBottom: "24px",
                  textAlign: "left",
                }}
              >
                <Text
                  strong
                  style={{
                    color: "#cf1322",
                    display: "block",
                    marginBottom: "12px",
                  }}
                >
                  📱 Reason for Termination:
                </Text>
                <Text style={{ color: "#8c8c8c" }}>
                  You switched browser tabs or left the test window{" "}
                  <strong>3 times</strong>. This violates our test integrity
                  policy designed to ensure fair assessment for all candidates.
                </Text>
              </div>

              <div
                style={{
                  background: "#f6ffed",
                  border: "1px solid #b7eb8f",
                  borderRadius: "8px",
                  padding: "20px",
                  textAlign: "left",
                }}
              >
                <Text
                  strong
                  style={{
                    color: "#389e0d",
                    display: "block",
                    marginBottom: "12px",
                  }}
                >
                  🔄 What's Next?
                </Text>
                <ul
                  style={{ margin: 0, paddingLeft: "20px", color: "#8c8c8c" }}
                >
                  <li>Contact our HR team to discuss a potential re-attempt</li>
                  <li>
                    Explain any technical issues that may have caused tab
                    switches
                  </li>
                  <li>
                    Ensure a quiet, distraction-free environment for future
                    tests
                  </li>
                  <li>Use a stable internet connection and updated browser</li>
                </ul>
              </div>
            </div>
          }
          extra={[
            <Button
              key="home"
              type="primary"
              icon={<HomeOutlined />}
              size="large"
              onClick={() => navigate("/")}
              style={{
                height: "48px",
                borderRadius: "6px",
                fontSize: "16px",
                fontWeight: "500",
                background: "#1E88E5",
                borderColor: "#1E88E5",
              }}
            >
              Return to Home
            </Button>,
          ]}
        />
      </Card>
    </div>
  );
};

export default TestTerminated;

// UserEntryForm.tsx
import React, { useState } from "react";
import {
  Layout,
  Typography,
  Form,
  Input,
  Checkbox,
  Button,
  Card,
  Space,
  Divider,
  message,
} from "antd";
import { useNavigate } from "react-router-dom";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  BookOutlined,
  CheckCircleOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import apiService from "../services/apiService"; // ✅ FIXED: Moved import to proper location

const { Content } = Layout;
const { Title, Text } = Typography;

const guidelines = [
  "Do not refresh the page during the test.",
  "Keep your face visible to the camera at all times.",
  "Speak clearly and avoid background noise.",
  "Make sure you have a stable and fast internet connection.",
  "Log in using the credentials you have been provided.",
];

interface UserEntryFormProps {
  token: string;
  candidate: any;
}

const UserEntryForm: React.FC<UserEntryFormProps> = ({ token, candidate }) => {
  const [form] = Form.useForm();
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // ✅ FIXED: Proper async function and syntax
  const onFinish = async (values: any) => {
    setSubmitting(true);
    const fullData = { ...candidate, ...values, token };

    try {
      // ✅ FIXED: Proper async/await syntax, no .then() needed
      await apiService.saveTestConfig(fullData);
      message.success("Details successfully submitted!");
      console.log("Navigating to:", `/calibration/${token}`);
      navigate(`/calibration/${token}`, { replace: true });
    } catch (error) {
      message.error("Failed to submit details. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    height: "100vh",
    background: "#f5f7fa",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    overflow: "hidden",
  };

  const cardStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: "950px",
    height: "calc(100vh - 40px)",
    maxHeight: "700px",
    margin: "0 auto",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    border: "1px solid #e8e8e8",
    overflow: "hidden",
  };

  const sidebarStyle: React.CSSProperties = {
    background: "#1E88E5",
    padding: "24px 20px",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    color: "#fff",
    overflow: "auto",
  };

  const formSectionStyle: React.CSSProperties = {
    background: "#fff",
    padding: "32px",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    overflow: "auto",
  };

  const inputStyle: React.CSSProperties = {
    height: "44px",
    borderRadius: "6px",
    border: "1px solid #d9d9d9",
  };

  const buttonStyle: React.CSSProperties = {
    height: "48px",
    borderRadius: "6px",
    background: "#1E88E5",
    border: "none",
    fontSize: "16px",
    fontWeight: "500",
  };

  // ✅ FIXED: Added return statement for the JSX
  return (
    <Layout style={containerStyle}>
      <Content
        style={{
          width: "100%",
          maxWidth: "1000px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Card style={cardStyle} bodyStyle={{ padding: 0 }}>
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
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
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
                  1
                </div>
                <Text style={{ color: "#1E88E5", fontWeight: "500" }}>
                  Credentials
                </Text>
              </div>

              <div
                style={{
                  width: "40px",
                  height: "2px",
                  background: "#e8e8e8",
                }}
              ></div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
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
                  2
                </div>
                <Text style={{ color: "#bfbfbf" }}>Calibration</Text>
              </div>

              <div
                style={{
                  width: "40px",
                  height: "2px",
                  background: "#e8e8e8",
                }}
              ></div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
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

          <div style={{ display: "flex", height: "calc(100% - 65px)" }}>
            {/* Left Sidebar - Guidelines */}
            <div style={{ ...sidebarStyle, width: "320px" }}>
              {/* User Info Section */}
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    background: "rgba(255,255,255,0.15)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px auto",
                  }}
                >
                  <UserOutlined style={{ fontSize: "32px", color: "#fff" }} />
                </div>
                <Title
                  level={4}
                  style={{
                    color: "#fff",
                    margin: "0 0 8px 0",
                    fontWeight: "600",
                  }}
                >
                  {candidate.name}
                </Title>
                <Text
                  style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px" }}
                >
                  {candidate.email}
                </Text>
              </div>

              <Divider
                style={{
                  borderColor: "rgba(255,255,255,0.2)",
                  margin: "20px 0",
                }}
              />

              {/* Progress Section */}
              <div style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <SafetyOutlined
                    style={{ fontSize: "18px", marginRight: "8px" }}
                  />
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: "16px",
                      fontWeight: "500",
                    }}
                  >
                    Current Step
                  </Text>
                </div>
                <div
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    padding: "12px 16px",
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    1. Confirm Your Details
                  </Text>
                  <div
                    style={{
                      background: "rgba(255,255,255,0.2)",
                      height: "4px",
                      borderRadius: "2px",
                      marginTop: "8px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        background: "#fff",
                        height: "100%",
                        width: "33%",
                        borderRadius: "2px",
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <Divider
                style={{
                  borderColor: "rgba(255,255,255,0.2)",
                  margin: "20px 0",
                }}
              />

              {/* Guidelines Section */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "20px",
                  }}
                >
                  <BookOutlined
                    style={{ fontSize: "18px", marginRight: "8px" }}
                  />
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: "16px",
                      fontWeight: "500",
                    }}
                  >
                    Test Guidelines
                  </Text>
                </div>

                <Space direction="vertical" size={16} style={{ width: "100%" }}>
                  {guidelines.map((text, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        padding: "8px 0",
                      }}
                    >
                      <CheckCircleOutlined
                        style={{
                          color: "#4ade80",
                          marginTop: "2px",
                          fontSize: "16px",
                          flexShrink: 0,
                        }}
                      />
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.9)",
                          fontSize: "13px",
                          lineHeight: "1.5",
                        }}
                      >
                        {text}
                      </Text>
                    </div>
                  ))}
                </Space>
              </div>
            </div>

            {/* Right Section - Form */}
            <div style={{ ...formSectionStyle, flex: 1 }}>
              <div
                style={{ maxWidth: "400px", margin: "0 auto", width: "100%" }}
              >
                <div style={{ textAlign: "center", marginBottom: "32px" }}>
                  <Title
                    level={2}
                    style={{
                      color: "#262626",
                      marginBottom: "8px",
                      fontWeight: "600",
                    }}
                  >
                    Confirm Your Details
                  </Title>
                  <Text style={{ color: "#8c8c8c", fontSize: "15px" }}>
                    Please verify your information before proceeding to the test
                  </Text>
                </div>

                <Form
                  form={form}
                  layout="vertical"
                  onFinish={onFinish}
                  initialValues={{
                    name: candidate.name,
                    email: candidate.email,
                    phone: candidate.phone,
                  }}
                  autoComplete="off"
                  style={{ width: "100%" }}
                >
                  <Form.Item
                    label={
                      <span style={{ fontWeight: "500", color: "#262626" }}>
                        Full Name
                      </span>
                    }
                    name="name"
                    rules={[
                      { required: true, message: "Please enter your name!" },
                    ]}
                  >
                    <Input
                      prefix={<UserOutlined style={{ color: "#bfbfbf" }} />}
                      placeholder="Enter your full name"
                      style={inputStyle}
                    />
                  </Form.Item>

                  <Form.Item
                    label={
                      <span style={{ fontWeight: "500", color: "#262626" }}>
                        Email Address
                      </span>
                    }
                    name="email"
                    rules={[
                      {
                        required: true,
                        type: "email",
                        message: "Please enter a valid email!",
                      },
                    ]}
                  >
                    <Input
                      prefix={<MailOutlined style={{ color: "#bfbfbf" }} />}
                      placeholder="Enter your email"
                      style={inputStyle}
                    />
                  </Form.Item>

                  <Form.Item
                    label={
                      <span style={{ fontWeight: "500", color: "#262626" }}>
                        Phone Number
                      </span>
                    }
                    name="phone"
                    rules={[
                      {
                        required: true,
                        message: "Please enter your phone number!",
                      },
                      { pattern: /^[0-9]+$/, message: "Only numbers allowed" },
                      {
                        min: 10,
                        message: "Phone number must be at least 10 digits long",
                      },
                    ]}
                  >
                    <Input
                      prefix={<PhoneOutlined style={{ color: "#bfbfbf" }} />}
                      maxLength={10}
                      placeholder="Enter your phone number"
                      style={inputStyle}
                    />
                  </Form.Item>

                  <Form.Item style={{ marginTop: "24px" }}>
                    <div
                      style={{
                        background: "#f8f9fa",
                        border: "1px solid #e9ecef",
                        borderRadius: "6px",
                        padding: "16px",
                      }}
                    >
                      <Checkbox
                        checked={agree}
                        onChange={(e) => setAgree(e.target.checked)}
                        style={{ alignItems: "flex-start" }}
                      >
                        <Text style={{ fontWeight: "500", color: "#262626" }}>
                          I have read and agree to the test guidelines mentioned
                          above
                        </Text>
                      </Checkbox>
                    </div>
                  </Form.Item>

                  <Form.Item style={{ marginTop: "32px", marginBottom: 0 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      disabled={!agree}
                      block
                      loading={submitting}
                      style={buttonStyle}
                    >
                      {submitting ? "Submitting..." : "Submit & Continue"}
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            </div>
          </div>
        </Card>
      </Content>
    </Layout>
  );
};

export default UserEntryForm;

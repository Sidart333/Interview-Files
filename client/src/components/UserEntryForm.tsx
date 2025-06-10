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
  Avatar,
  message,
  theme,
} from "antd";
import { useNavigate } from "react-router-dom";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  BookOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { ProgressHeader } from "./ProgressHeader";
import bgImage from "../assets/ttp_logo.svg";

const { Content } = Layout;
const { Title, Text } = Typography;
const { useToken } = theme;

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
  const { token: themeToken } = useToken();

  const onFinish = (values: any) => {
    setSubmitting(true);
    const fullData = { ...candidate, ...values, token };
    // Make sure your backend expects token in payload!
    // (If not, you can just do { ...candidate, ...values })
    axios
      .post(
        " https://680d-103-159-68-90.ngrok-free.app/save-test-config",
        fullData
      )
      .then(() => {
        message.success("Details successfully submitted!");
        console.log("Navigating to:", `/calibration/${token}`);
        navigate(`/calibration/${token}`, { replace: true });
      })
      .catch(() => {
        message.error("Failed to submit details. Please try again later.");
        setSubmitting(false);
      });
  };

  return (
    <Layout
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#f5f7fa 0%, #e9ecef 100%)",
        justifyContent: "center",
        alignItems: "center",
        display: "flex",
      }}
    >
      <Content style={{ width: "100%", maxWidth: 920 }}>
        <Card
          style={{
            fontFamily: "'Poppins', Arial, sans-serif",
            width: 1024,
            margin: "60px auto",
            borderRadius: 20,
            boxShadow: "0 8px 40px 0 rgba(0,0,0,0.10)",
            display: "flex",
            flexDirection: "row",
            overflow: "hidden",
            padding: 0,
          }}
          bodyStyle={{
            display: "flex",
            flexDirection: "row",
            padding: 0,
            background: "none",
            minHeight: 540,
          }}
        >
          <ProgressHeader currentStep={0} />
          {/* Left Side: Guidelines */}
          <div
            style={{
              background: "linear-gradient(135deg,#001529 0%, #003a70 100%)",
              color: "#fff",
              width: 260,
              padding: "32px 24px 24px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              borderRight: "1px solid #eaeaea",
            }}
          >
            <Avatar
              size={56}
              style={{
                backgroundColor: themeToken.colorPrimary,
                marginBottom: 12,
                boxShadow: "0 2px 8px rgba(0,0,0,0.13)",
              }}
              icon={<UserOutlined />}
            />
            <div style={{ marginBottom: 6, fontSize: 18, fontWeight: 600 }}>
              {candidate.name}
            </div>
            <Text style={{ color: "#e0e0e0", fontSize: 13 }}>
              {candidate.email}
            </Text>
            <Divider
              style={{
                borderColor: "rgba(255,255,255,0.14)",
                margin: "28px 0 18px 0",
              }}
            />
            <Title
              level={5}
              style={{ color: "#fff", marginBottom: 12, letterSpacing: 1 }}
            >
              Test Progress
            </Title>
            <Divider
              style={{
                borderColor: "rgba(255,255,255,0.11)",
                margin: "6px 0 18px 0",
              }}
            />
            <Title
              level={5}
              style={{
                color: "#fff",
                marginBottom: 14,
                fontWeight: 600,
                fontSize: 17,
                letterSpacing: 0.2,
              }}
            >
              <BookOutlined style={{ marginRight: 8 }} />
              Guidelines
            </Title>
            <div style={{ width: "100%" }}>
              <Space direction="vertical" size={18} style={{ width: "100%" }}>
                {guidelines.map((text, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <CheckCircleOutlined
                      style={{
                        color: "#52c41a",
                        marginTop: 3,
                        fontSize: 18,
                      }}
                    />
                    <Text style={{ color: "#fff", fontSize: 15 }}>{text}</Text>
                  </div>
                ))}
              </Space>
            </div>
          </div>

          {/* Right Side: Form */}
          <div
            style={{
              flex: 1,
              background: "#fff",
              padding: "40px 40px 32px 40px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              minWidth: 540,
              minHeight: 540,
              backgroundImage: `url(${bgImage})`,
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              borderTopRightRadius: 20,
              borderBottomRightRadius: 20,
            }}
          >
            <Title level={3} style={{ marginBottom: 16, color: "#222" }}>
              Confirm Your Details
            </Title>
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
              style={{ width: "100%", maxWidth: 350 }}
            >
              <Form.Item
                label="Full Name"
                name="name"
                rules={[{ required: true, message: "Please enter your name!" }]}
                labelCol={{ style: { color: "#000", fontWeight: "bold" } }}
              >
                <Input
                  prefix={<UserOutlined style={{ color: "#4096ff" }} />}
                  size="large"
                  placeholder="Enter your full name"
                />
              </Form.Item>
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  {
                    required: true,
                    type: "email",
                    message: "Please enter a valid email!",
                  },
                ]}
                labelCol={{ style: { color: "#000", fontWeight: "bold" } }}
              >
                <Input
                  prefix={<MailOutlined style={{ color: "#4096ff" }} />}
                  size="large"
                  placeholder="Enter your email"
                />
              </Form.Item>
              <Form.Item
                label="Phone"
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
                labelCol={{ style: { color: "#000", fontWeight: "bold" } }}
              >
                <Input
                  prefix={<PhoneOutlined style={{ color: "#4096ff" }} />}
                  maxLength={10}
                  size="large"
                  placeholder="Enter your phone number"
                />
              </Form.Item>
              <Form.Item>
                <Checkbox
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                >
                  <Text strong>
                    I have read and agree to the above guidelines
                  </Text>
                </Checkbox>
              </Form.Item>
              <Form.Item style={{ marginTop: 20 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  disabled={!agree}
                  block
                  loading={submitting}
                  size="large"
                  style={{
                    height: 48,
                    borderRadius: 8,
                    fontSize: 17,
                    fontWeight: 500,
                  }}
                >
                  {submitting ? "Submitting..." : "Submit & Continue"}
                </Button>
              </Form.Item>
            </Form>
          </div>
        </Card>
      </Content>
    </Layout>
  );
};

export default UserEntryForm;

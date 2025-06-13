import React, { useState } from "react";
import {
  Layout,
  Typography,
  Form,
  Input,
  Button,
  Select,
  Card,
  Alert,
  message,
  Space,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  TrophyOutlined,
  BulbOutlined,
  NumberOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  LinkOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import apiService from "../services/apiService";

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

// interface SaveTestConfigResponse {
//   link: string;
//   emailSent: boolean;
// }

const AdminForm: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setError(null);
    setGeneratedLink(null);
    setLoading(true);

    try {
      // Add default duration if not provided
      const formData = {
        ...values,
        duration: values.duration || 60, // Default 60 minutes
      };

      const { link, emailSent } = await apiService.saveTestConfig(formData);

      setGeneratedLink(link);

      if (emailSent) {
        message.success("Test link generated and sent to candidate's email.");
      } else {
        message.warning("Link generated, but email could not be sent.");
      }

      setTimeout(() => {
        form.resetFields();
        setGeneratedLink(null);
        message.info("Form cleared. Ready for next candidate.")
      }, 10000)
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to save. Please check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const sidebarStyle: React.CSSProperties = {
    background: "#1E88E5",
    padding: "0",
    height: "100vh",
  };

  const headerStyle: React.CSSProperties = {
    background: "#fff",
    padding: "0 24px",
    boxShadow: "0 1px 4px rgba(0,21,41,.08)",
    borderBottom: "1px solid #f0f0f0",
  };

  const contentStyle: React.CSSProperties = {
    padding: "24px",
    background: "#f5f7fa",
    height: "calc(100vh - 64px)",
    overflow: "auto",
  };

  const cardStyle: React.CSSProperties = {
    borderRadius: "8px",
    boxShadow:
      "0 1px 2px 0 rgba(0,0,0,0.03), 0 1px 6px -1px rgba(0,0,0,0.02), 0 2px 4px 0 rgba(0,0,0,0.02)",
    border: "1px solid #f0f0f0",
    background: "#fff",
  };

  const buttonStyle: React.CSSProperties = {
    height: "40px",
    borderRadius: "6px",
    background: "#1E88E5",
    border: "none",
    fontSize: "14px",
    fontWeight: "500",
  };

  return (
    <Layout style={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
      <Sider width={280} style={sidebarStyle}>
        {/* Logo Section */}
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              background: "#fff",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "12px",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                background: "#1E88E5",
                borderRadius: "4px",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "16px",
                  height: "16px",
                  background: "#fff",
                  borderRadius: "2px",
                }}
              ></div>
            </div>
          </div>
          <Text style={{ color: "#fff", fontSize: "16px", fontWeight: "600" }}>
            TTP
          </Text>
        </div>

        {/* Page Title */}
        <div style={{ padding: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 0",
              color: "#fff",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              marginBottom: "20px",
            }}
          >
            <PlusOutlined style={{ fontSize: "18px", marginRight: "12px" }} />
            <span style={{ fontSize: "16px", fontWeight: "500" }}>
              Create Interview Test
            </span>
          </div>
        </div>

        {/* Tips Section */}
        <div
          style={{
            margin: "20px",
            padding: "16px",
            background: "rgba(255,255,255,0.1)",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <BulbOutlined style={{ color: "#fff", marginRight: "8px" }} />
            <Text
              style={{ color: "#fff", fontSize: "14px", fontWeight: "500" }}
            >
              Best Practices
            </Text>
          </div>

          <div
            style={{
              fontSize: "12px",
              color: "rgba(255,255,255,0.8)",
              lineHeight: "1.5",
            }}
          >
            • Choose appropriate job domain
            <br />
            • Verify candidate contact details
            <br />
            • Review before sending link
            <br />• Match difficulty to experience
          </div>
        </div>
      </Sider>

      <Layout>
        <Header style={headerStyle}>
          <div
            style={{ display: "flex", alignItems: "center", height: "64px" }}
          >
            <Title
              level={4}
              style={{ margin: 0, color: "#262626", fontWeight: "600" }}
            >
              Welcome, Admin
            </Title>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#8c8c8c", fontSize: "14px" }}>
                Create Interview Test
              </Text>
            </div>
          </div>
        </Header>

        <Content style={contentStyle}>
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            {error && (
              <Alert
                message="Error"
                description={error}
                type="error"
                showIcon
                closable
                style={{ marginBottom: "24px", borderRadius: "6px" }}
              />
            )}

            <Card
              title={
                <div style={{ display: "flex", alignItems: "center" }}>
                  <UserOutlined
                    style={{
                      fontSize: "16px",
                      color: "#1E88E5",
                      marginRight: "8px",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "16px",
                      fontWeight: "500",
                      color: "#262626",
                    }}
                  >
                    Candidate Information
                  </span>
                </div>
              }
              style={cardStyle}
              headStyle={{
                borderBottom: "1px solid #f0f0f0",
                background: "#fafafa",
              }}
              bodyStyle={{ padding: "24px" }}
            >
              <Form form={form} layout="vertical" onFinish={onFinish}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <Form.Item
                    label={
                      <span style={{ fontWeight: "500", color: "#262626" }}>
                        Candidate Name
                      </span>
                    }
                    name="name"
                    rules={[
                      {
                        required: true,
                        message: "Please enter candidate name",
                      },
                    ]}
                  >
                    <Input
                      prefix={<UserOutlined style={{ color: "#bfbfbf" }} />}
                      placeholder="Enter candidate's full name"
                      style={{
                        height: "40px",
                        borderRadius: "6px",
                        border: "1px solid #d9d9d9",
                      }}
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
                      { required: true, message: "Please enter email" },
                      { type: "email", message: "Please enter valid email" },
                    ]}
                  >
                    <Input
                      prefix={<MailOutlined style={{ color: "#bfbfbf" }} />}
                      placeholder="Enter email address"
                      style={{
                        height: "40px",
                        borderRadius: "6px",
                        border: "1px solid #d9d9d9",
                      }}
                    />
                  </Form.Item>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <Form.Item
                    label={
                      <span style={{ fontWeight: "500", color: "#262626" }}>
                        Phone Number
                      </span>
                    }
                    name="phone"
                    rules={[
                      { required: true, message: "Please enter phone number" },
                      {
                        pattern: /^[0-9]{10}$/,
                        message: "Phone number must be exactly 10 digits",
                      },
                    ]}
                  >
                    <Input
                      prefix={<PhoneOutlined style={{ color: "#bfbfbf" }} />}
                      maxLength={10}
                      placeholder="Enter 10-digit phone number"
                      style={{
                        height: "40px",
                        borderRadius: "6px",
                        border: "1px solid #d9d9d9",
                      }}
                    />
                  </Form.Item>

                  <Form.Item
                    label={
                      <span style={{ fontWeight: "500", color: "#262626" }}>
                        Experience Level
                      </span>
                    }
                    name="experience"
                    rules={[
                      {
                        required: true,
                        message: "Please select experience level",
                      },
                    ]}
                  >
                    <Select
                      placeholder="Select experience level"
                      style={{ height: "40px" }}
                      suffixIcon={
                        <TrophyOutlined style={{ color: "#bfbfbf" }} />
                      }
                    >
                      <Select.Option value="fresher">Fresher</Select.Option>
                      <Select.Option value="1-2 years">1-2 years</Select.Option>
                      <Select.Option value="3+ years">3+ years</Select.Option>
                    </Select>
                  </Form.Item>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <Form.Item
                    label={
                      <span style={{ fontWeight: "500", color: "#262626" }}>
                        Role / Subject
                      </span>
                    }
                    name="role"
                    rules={[{ required: true, message: "Please select role" }]}
                  >
                    <Select
                      placeholder="Choose job domain"
                      style={{ height: "40px" }}
                    >
                      <Select.Option value="web-dev">
                        Web Development
                      </Select.Option>
                      <Select.Option value="ai-ml">AI / ML</Select.Option>
                      <Select.Option value="marketing">
                        Sales & Marketing
                      </Select.Option>
                      <Select.Option value="HR">HR Recruiter</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    label={
                      <span style={{ fontWeight: "500", color: "#262626" }}>
                        Difficulty Level
                      </span>
                    }
                    name="difficulty"
                    rules={[
                      {
                        required: true,
                        message: "Please select difficulty level",
                      },
                    ]}
                  >
                    <Select
                      placeholder="Select difficulty level"
                      style={{ height: "40px" }}
                    >
                      <Select.Option value="easy">Easy</Select.Option>
                      <Select.Option value="medium">Medium</Select.Option>
                      <Select.Option value="hard">Hard</Select.Option>
                    </Select>
                  </Form.Item>
                  {/* Duration Field */}
                  <Form.Item
                    label={
                      <span style={{ fontWeight: "500", color: "#262626" }}>
                        Test Duration (minutes)
                      </span>
                    }
                    name="duration"
                    rules={[
                      {
                        required: true,
                        message: "Please enter test duration",
                      },
                    ]}
                    style={{ width: "50%" }}
                  >
                    <Input
                      prefix={
                        <ClockCircleOutlined style={{ color: "#bfbfbf" }} />
                      }
                      type="number"
                      placeholder="e.g. 60"
                      min={15}
                      max={180}
                      style={{
                        height: "40px",
                        borderRadius: "6px",
                        border: "1px solid #d9d9d9",
                      }}
                    />
                  </Form.Item>
                </div>

                <Form.Item
                  label={
                    <span style={{ fontWeight: "500", color: "#262626" }}>
                      Number of Questions
                    </span>
                  }
                  name="numQuestions"
                  rules={[
                    {
                      required: true,
                      message: "Please enter number of questions",
                    },
                  ]}
                  style={{ width: "50%" }}
                >
                  <Input
                    prefix={<NumberOutlined style={{ color: "#bfbfbf" }} />}
                    type="number"
                    placeholder="e.g. 5"
                    min={1}
                    max={20}
                    style={{
                      height: "40px",
                      borderRadius: "6px",
                      border: "1px solid #d9d9d9",
                    }}
                  />
                </Form.Item>

                <Form.Item style={{ marginTop: "24px", marginBottom: 0 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    style={buttonStyle}
                    icon={<PlusOutlined />}
                  >
                    {loading ? "Generating Test Link..." : "Generate Test Link"}
                  </Button>
                </Form.Item>
              </Form>

              {generatedLink && (
                <Alert
                  message={
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <CheckCircleOutlined
                        style={{ color: "#52c41a", marginRight: "8px" }}
                      />
                      <span style={{ fontWeight: "500", color: "#262626" }}>
                        Test Link Generated Successfully!
                      </span>
                    </div>
                  }
                  description={
                    <div style={{ marginTop: "12px" }}>
                      <Text
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          color: "#595959",
                        }}
                      >
                        Send this link to the candidate:
                      </Text>
                      <div
                        style={{
                          background: "#f5f5f5",
                          padding: "12px",
                          borderRadius: "6px",
                          border: "1px solid #e8e8e8",
                        }}
                      >
                        <Space>
                          <LinkOutlined style={{ color: "#1E88E5" }} />
                          <a
                            href={generatedLink}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              color: "#1E88E5",
                              fontWeight: "400",
                            }}
                          >
                            {generatedLink}
                          </a>
                        </Space>
                      </div>
                    </div>
                  }
                  type="success"
                  showIcon={false}
                  style={{
                    marginTop: "24px",
                    borderRadius: "6px",
                    border: "1px solid #b7eb8f",
                    background: "#f6ffed",
                  }}
                />
              )}
            </Card>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminForm;

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
  message
} from "antd";
import axios from "axios";

const { Header, Content, Sider } = Layout;
const { Title, Paragraph } = Typography;


interface SaveTestConfigResponse{
  link: string;
  emailSent: boolean;
}
const AdminForm: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const onFinish = async (values: any) => {
    setError(null)
    setGeneratedLink(null)
    try {
      const res = await axios.post<SaveTestConfigResponse>("http://localhost:5000/save-test-config", values, {
        headers: { "Content-Type": "application/json" }
      });
      const { link, emailSent } = res.data;

      setGeneratedLink(link)

      if (emailSent) {
        message.success("Test link generated and sent to candidate's email.");
      } else {
        message.warning("Link generated, but email could not be sent.");
      }
  
      console.log("Saved! Response:", res.data);

    } catch (err) {
      console.error("Error:", err);
      setError("Failed to save. Please check console for details.");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", minWidth: "100vw" }}>
      <Sider width={300} theme="dark" style={{ padding: "24px 16px" }}>
        <Title level={4} style={{ color: "#fff" }}>
          🧠 Test Creation Tips
        </Title>
        <Paragraph style={{ color: "#ccc" }}>
          ✔ Choose correct job domain
        </Paragraph>
        <Paragraph style={{ color: "#ccc" }}>
          ✔ Enter full candidate details
        </Paragraph>
        <Paragraph style={{ color: "#ccc" }}>
          ✔ Save & send link carefully
        </Paragraph>
      </Sider>

      <Layout>
        <Header style={{ background: "#fff", padding: "0 24px" }}>
          <Title level={3}>Create Interview Test</Title>
        </Header>

        <Content style={{ padding: 24 }}>
          <div style={{ maxWidth: 600, width: 1100, margin: "0 auto" }}>
            <Card title="Candidate Details">
              <Form form={form} layout="vertical" onFinish={onFinish}>
                <Form.Item
                  label="Candidate Name"
                  name="name"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="Enter candidate's name" />
                </Form.Item>

                <Form.Item
                  label="Email"
                  name="email"
                  rules={[{ required: true, type: "email" }]}
                >
                  <Input placeholder="Enter email" />
                </Form.Item>

                <Form.Item
                  label="Phone"
                  name="phone"
                  rules={[
                    { required: true },
                    {
                      pattern: /^[0-9]{10}$/,
                      message:
                        "Phone number must be exactly 10 digits and only numbers",
                    },
                  ]}
                >
                  <Input
                    maxLength={10}
                    placeholder="Enter 10-digit phone number"
                  />
                </Form.Item>

                <Form.Item
                  label="Experience Level"
                  name="experience"
                  rules={[{ required: true }]}
                >
                  <Select placeholder="Select experience">
                    <Select.Option value="fresher">Fresher</Select.Option>
                    <Select.Option value="1-2 years">1-2 years</Select.Option>
                    <Select.Option value="3+ years">3+ years</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  label="Role / Subject"
                  name="role"
                  rules={[{ required: true }]}
                >
                  <Select placeholder="Choose job domain">
                    <Select.Option value="web-dev">
                      Web Development
                    </Select.Option>
                    <Select.Option value="ai-ml">
                      AI / ML
                    </Select.Option>
                    <Select.Option value="marketing">
                      Sales & Marketing
                    </Select.Option>
                    <Select.Option value="HR">
                      HR Recruiter
                    </Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item
                  label="Difficulty Level"
                  name="difficulty"
                  rules={[
                    {
                      required: true,
                      message: "Please select difficulty level",
                    },
                  ]}
                >
                  <Select placeholder="Select difficulty">
                    <Select.Option value="easy">Easy</Select.Option>
                    <Select.Option value="medium">Medium</Select.Option>
                    <Select.Option value="hard">Hard</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  label="Number of Questions"
                  name="numQuestions"
                  rules={[{ required: true }]}
                >
                  <Input type="number" placeholder="e.g. 5" min={1} max={20} />
                </Form.Item>

                <Form.Item>
                  <Button type="primary" htmlType="submit" block>
                    Generate Test Link
                  </Button>
                </Form.Item>
              </Form>

              {generatedLink && (
                <Alert
                  message="Test Link Generated"
                  description={
                    <>
                      <p>Send this link to the candidate:</p>
                      <a href={generatedLink} target="_blank" rel="noreferrer">
                        {generatedLink}
                      </a>
                    </>
                  }
                  type="success"
                  showIcon
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

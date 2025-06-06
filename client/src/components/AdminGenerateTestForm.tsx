import React from "react";
import { Form, Input, Select, Button, Card, message } from "antd";

const { Option } = Select;

const handleFinish = async (values: any) => {
  try {
    // ...API call to backend
    await generateTestLink(values); // replace with your actual API logic
    message.success("Test link generated and sent!");
    form.resetFields();
  } catch (err) {
    message.error("Something went wrong. Please try again.");
  }
};

const experienceOptions = [
  { label: "Fresher", value: "fresher" },
  { label: "1-3 Years", value: "1-3" },
  { label: "3-5 Years", value: "3-5" },
  { label: "5+ Years", value: "5plus" },
];

const difficultyOptions = [
  { label: "Easy", value: "easy" },
  { label: "Medium", value: "medium" },
  { label: "Hard", value: "hard" },
];

export const AdminGenerateTestForm = () => {
  const [form] = Form.useForm();

  const handleFinish = (values: any) => {
    console.log("Form values:", values);
    // You can trigger your API call here
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f6fa",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Card
        style={{
          maxWidth: 480,
          width: "100%",
          borderRadius: 16,
          boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
        }}
        title={
          <div style={{ fontSize: 24, fontWeight: 600, textAlign: "center" }}>
            Generate Test Link
          </div>
        }
      >
        <Form
          layout="vertical"
          form={form}
          onFinish={handleFinish}
          size="large"
          style={{ marginTop: 8 }}
        >
          <Form.Item
            label="Candidate Name"
            name="name"
            rules={[{ required: true, message: "Please enter candidate name" }]}
          >
            <Input placeholder="Enter name" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Please enter email" },
              { type: "email", message: "Invalid email address" },
            ]}
          >
            <Input placeholder="Enter email" />
          </Form.Item>

          <Form.Item
            label="Phone"
            name="phone"
            rules={[
              { required: true, message: "Please enter phone number" },
              {
                pattern: /^\d{10,15}$/,
                message: "Enter valid phone number",
              },
            ]}
          >
            <Input placeholder="Enter phone" maxLength={15} />
          </Form.Item>

          <Form.Item
            label="Experience Level"
            name="experience"
            rules={[{ required: true, message: "Select experience level" }]}
          >
            <Select placeholder="Select experience">
              {experienceOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Role / Subject"
            name="role"
            rules={[{ required: true, message: "Please enter role/subject" }]}
          >
            <Input placeholder="e.g. Frontend, Backend, Data Science" />
          </Form.Item>

          <Form.Item
            label="Difficulty Level"
            name="difficulty"
            rules={[{ required: true, message: "Select difficulty level" }]}
          >
            <Select placeholder="Select difficulty">
              {difficultyOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Number of Questions"
            name="numQuestions"
            rules={[
              { required: true, message: "Please enter number of questions" },
              {
                type: "number",
                min: 1,
                max: 20,
                message: "Number must be between 1 and 20",
              },
            ]}
          >
            <Input type="number" placeholder="e.g. 5" min={1} max={20} />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              style={{ borderRadius: 12, marginTop: 16 }}
              onClick={handleFinish}
            >
              Generate Test Link
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

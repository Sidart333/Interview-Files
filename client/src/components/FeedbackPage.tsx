import React, { useState } from "react";
import { Row, Col, Card, Typography, Rate, Input, Button, message } from "antd";
import { useNavigate } from "react-router-dom";
import apiService from "../services/apiService";
const { Title, Paragraph } = Typography;
const { TextArea } = Input;

export const FeedbackPage: React.FC = () => {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (rating === 0) {
      return message.warning('please give us a rating before submitting.');
    }
    setSubmitting(true);
    try {
      await apiService.submitFeedback({
        rating,
        comment,
      });
      message.success('Thank you for your feedback.');
    }
    catch (err) {
      message.error('Failed to submit feedback. Please try again.');
    }
    finally {
      setSubmitting(false);
    }
  }

  return (
    <Row justify="center" style={{ padding: 24 }}>
      <Col xs={24} sm={18} md={12} lg={8}>
        <Card
          bordered={false}
          style={{
            textAlign: "center",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          <Title level={2}>🎉 Thank You!</Title>
          <Paragraph>
            We appreciate you taking the time to complete the interview.
          </Paragraph>

          <Paragraph strong>Please rate your experience:</Paragraph>
          <Rate
            onChange={setRating}
            value={rating}
            style={{ fontSize: 32, marginBottom: 24 }}
          />

          <Paragraph strong>Any comments?</Paragraph>
          <TextArea
            rows={4}
            placeholder="Let us know how we can improve..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{ marginBottom: 24 }}
          />

          <Button
            type="primary"
            size="large"
            block
            onClick={handleSubmit}
            loading={submitting}
          >
            Submit Feedback
          </Button>
        </Card>
      </Col>
    </Row>
  );
};

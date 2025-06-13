import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Spin, Typography } from "antd";
import apiService from "../services/apiService"; 
import UserEntryForm from "../components/UserEntryForm";

const { Title } = Typography;

const UserDashboard: React.FC = () => {
  const params = useParams();
  const token = params.token as string;
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("No token provided");
      return;
    }

    const fetchCandidateData = async () => {
      try {
        const candidateData = await apiService.getTestConfig(token);
        setCandidate(candidateData);
      } catch (error) {
        console.error("Error fetching candidate data:", error);
        setError("Failed to load candidate data");
      } finally {
        setLoading(false);
      }
    };

    fetchCandidateData();
  }, [token]);

  if (loading) return <Spin tip="Loading candidate data..." />;
  if (error)
    return (
      <Title level={4} style={{ color: "#ff4d4f" }}>
        {error}
      </Title>
    );
  if (!candidate) return <Title level={4}>Test not found or expired.</Title>;

  return <UserEntryForm token={token} candidate={candidate} />;
};

export default UserDashboard;

// UserDashboard.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Spin, Typography } from "antd";
import axios from "axios";
import UserEntryForm from "../components/UserEntryForm";

const { Title } = Typography;

const UserDashboard: React.FC = () => {
  const params = useParams();
  const token = params.token as string;
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    axios
      .get(`http://localhost:5000/get-test-config/${token}`)
      .then((res) => {
        setCandidate(res.data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [token]);

  if (loading) return <Spin tip="Loading candidate data..." />;
  if (!candidate) return <Title level={4}>Test not found or expired.</Title>;

  return <UserEntryForm token={token} candidate={candidate} />;
};

export default UserDashboard;

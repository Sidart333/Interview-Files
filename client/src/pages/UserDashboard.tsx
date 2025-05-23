import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import UserEntryForm from "../components/UserEntryForm";
import { Spin, Typography } from "antd";
import axios from 'axios';

const { Title } = Typography;

// Define props for UserEntryForm
interface UserEntryFormProps {
  token: string;
  candidate: any;
}

const UserDashboard: React.FC = () => {
  const params = useParams();
  const token = params.token as string;
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    if (!token) return;
    axios.get(`http://localhost:5000/get-test-config/${token}`)
      .then((res) => {
        setCandidate(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
      });
  }, [token]);

  if (loading) return <Spin tip="Loading candidate data..." />;

  if (!candidate) return <Title level={4}>Test not found or expired.</Title>;

  // Only render the form if we have both token and candidate
  return token && candidate ? (
    <UserEntryForm token={token} candidate={candidate} />
  ) : (
    <Title level={4}>Missing token or candidate data.</Title>
  );
};

export default UserDashboard;

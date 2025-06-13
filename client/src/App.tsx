import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AdminDashboard from './pages/AdminDashboard'
import UserDashboard from "./pages/UserDashboard";  
import TestInterface from "./components/TestInterface";
import HeadCalibration from "./components/HeadCalibration";   
import { FeedbackPage } from "./components/FeedbackPage";
import TestTerminated from "./components/TestTerminated";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/user-test/:token" element={<UserDashboard />} />
        <Route path="/calibration/:token" element={<HeadCalibration />} />
        <Route path="/test/:token/interview" element={<TestInterface />} />
        <Route path="/test-terminated" element={<TestTerminated />} />
        <Route path='/feedback' element={<FeedbackPage /> } />
      </Routes>
    </Router>
  );
};

export default App;

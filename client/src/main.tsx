import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "antd/dist/reset.css";
import { CandidateProvider } from "./context/CandidateContext";
import { AdminGenerateTestForm } from "./components/AdminGenerateTestForm.tsx";


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CandidateProvider>
      <AdminGenerateTestForm />
    </CandidateProvider>
  </React.StrictMode>
);

import React, { createContext, useContext, useState, ReactNode } from "react";

interface CandidateInfo {
  name: string;
  role: string;
  experience: string;
  numQuestions: number;
  difficulty: string;
}

const CandidateContext = createContext<{
  candidate: CandidateInfo | null;
  setCandidate: (data: CandidateInfo) => void;
}>({
  candidate: null,
  setCandidate: () => {},
});

export const CandidateProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [candidate, setCandidate] = useState<CandidateInfo | null>(null);
  return (
    <CandidateContext.Provider value={{ candidate, setCandidate }}>
      {children}
    </CandidateContext.Provider>
  );
};

export const useCandidate = () => useContext(CandidateContext);

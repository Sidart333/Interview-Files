import React from "react";
import { Button } from "antd";

interface Props {
  question: string;
}

const QuestionReader: React.FC<Props> = ({ question }) => {
  const speak = () => {
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(question);
    utter.lang = "en-US";
    synth.speak(utter);
  };

  return (
    <Button type="default" onClick={speak}>
      🔁 Replay Question
    </Button>
  );
};

export default QuestionReader;

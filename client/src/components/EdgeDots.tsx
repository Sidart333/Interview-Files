import React from "react";

const edgeDotSize = 32;

const EdgeDots: React.FC<{ active?: number }> = ({ active }) => (
  <>
    {/* Center */}
    {active === -1 && (
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: edgeDotSize,
          height: edgeDotSize,
          borderRadius: "50%",
          background: "#13ed13",
          boxShadow: "0 0 16px #13ed13",
          zIndex: 9999,
          transition: "background 0.2s",
        }}
      />
    )}

    {/* Left */}
    <div
      style={{
          position: "fixed",
          top: "50%",
          left: 20,
          transform: "translateY(-50%)",
          width: edgeDotSize,
          height: edgeDotSize,
          borderRadius: "50%",
          background: active === 1 ? "#13ed13" : "#bbb",
          boxShadow: active === 1 ? "0 0 16px #13ed13" : "",
          zIndex: 9999,
          transition: "background 0.2s",
        }}
    />
        {/* Top */}
        <div
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: `translateX(-50%)`,
            width: edgeDotSize,
            height: edgeDotSize,
            borderRadius: "50%",
            background: active === 0 ? "#13ed13" : "#bbb",
            boxShadow: active === 0 ? "0 0 16px #13ed13" : "",
            zIndex: 9999,
            transition: "background 0.2s",
          }}
        />
    {/* Right */}
    <div
      style={{
        position: "fixed",
        top: "50%",
        right: 20,
        transform: "translateY(-50%)",
        width: edgeDotSize,
        height: edgeDotSize,
        borderRadius: "50%",
        background: active === 2 ? "#13ed13" : "#bbb",
        boxShadow: active === 2 ? "0 0 16px #13ed13" : "",
        zIndex: 9999,
        transition: "background 0.2s",
      }}
    />
    {/* Bottom */}
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        width: edgeDotSize,
        height: edgeDotSize,
        borderRadius: "50%",
        background: active === 3 ? "#13ed13" : "#bbb",
        boxShadow: active === 3 ? "0 0 16px #13ed13" : "",
        zIndex: 9999,
        transition: "background 0.2s",
      }}
    />
  </>
);

export default EdgeDots;

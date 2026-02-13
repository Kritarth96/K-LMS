import React, { useRef, useEffect } from "react";
import "./MeteorBackground.css";

const MeteorBackground = ({ count = 20, delay = 0 }) => {
  const containerRef = useRef(null);
  const meteors = new Array(count).fill(true);

  return (
    <div
      ref={containerRef}
      className="meteor-background"
    >
      {meteors.map((_, idx) => (
        <span
          key={idx}
          className="meteor"
          style={{
            top: `${Math.floor(Math.random() * (100 - 300) + 300)}px`,
            left: `${Math.floor(Math.random() * (400 - -800) + -800)}px`,
            animationDelay: `${Math.random() * (0.8 - 0.2) + 0.2}s`,
            animationDuration: `${Math.floor(Math.random() * (10 - 2) + 2)}s`,
          }}
        ></span>
      ))}
    </div>
  );
};

export default MeteorBackground;

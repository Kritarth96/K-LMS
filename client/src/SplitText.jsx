import React from 'react';
import './SplitText.css';

const SplitText = ({ text, className = '', delay = 50 }) => {
  return (
    <span className={`split-text ${className}`}>
      {text.split("").map((char, index) => (
        <span
          key={index}
          className="char"
          style={{ animationDelay: `${index * delay}ms` }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
};

export default SplitText;

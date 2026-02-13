import React from 'react';
import './ShinyText.css';

const ShinyText = ({ text, className = '' }) => {
  return (
    <p className={`shiny-text ${className}`}>
      {text}
    </p>
  );
};

export default ShinyText;

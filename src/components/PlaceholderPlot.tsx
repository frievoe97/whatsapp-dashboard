import React from "react";

interface PlaceholderPlotProps {
  width: string;
}

const PlaceholderPlot: React.FC<PlaceholderPlotProps> = ({ width }) => {
  return (
    <div className="bg-gray-200 h-48 rounded-md shadow-md" style={{ width }}>
      <div className="h-full flex items-center justify-center text-gray-500">
        Placeholder Plot
      </div>
    </div>
  );
};

export default PlaceholderPlot;

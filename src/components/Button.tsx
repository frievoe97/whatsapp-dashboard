import React from "react";

interface ButtonProps {
  label: string;
  onClick: () => void;
  darkMode?: boolean;
  selected?: boolean;
  variant?: "white" | "black"; // Variant für verschiedene Stile
}

const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  darkMode,
  selected,
  variant = "white",
}) => {
  const baseClasses = "px-3 py-1 text-sm border rounded-none";
  const selectedClasses = selected
    ? darkMode
      ? "bg-white text-black"
      : "bg-black text-white"
    : darkMode
    ? "bg-gray-700 text-white border-white hover:border-white"
    : "bg-white text-black border-black hover:border-black";

  const variantClasses =
    variant === "black"
      ? darkMode
        ? "bg-black text-white border-white"
        : "bg-black text-white border-none"
      : darkMode
      ? "bg-gray-700 text-white border-white hover:border-white"
      : "bg-white text-black border-black hover:border-black";

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses} ${selectedClasses}`}
    >
      {label}
    </button>
  );
};

export default Button;

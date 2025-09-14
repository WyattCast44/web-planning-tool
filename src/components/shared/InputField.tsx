interface InputFieldProps {
  id: string;
  label: string;
  value: number | string;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  title?: string;
}

export function InputField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
  className = "",
  inputClassName = "",
  title,
}: InputFieldProps) {
  return (
    <div className={`flex flex-col divide-y divide-gray-600 ${className}`}>
      <label className="font-display" htmlFor={id} title={title}>
        {label}
      </label>
      <input
        type={typeof value === "number" ? "number" : "text"}
        id={id}
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={inputClassName}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

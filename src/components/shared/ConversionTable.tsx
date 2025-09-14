import { useState } from "react";
import { roundWithPadding } from "../../core/math";

interface ConversionUnit {
  key: string;
  label: string;
  value: number;
  setValue: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

interface ConversionTableProps {
  title: string;
  units: ConversionUnit[];
  conversionFunctions: {
    [key: string]: (value: number) => number;
  };
}

export function ConversionTable({ title, units, conversionFunctions }: ConversionTableProps) {
  return (
    <div>
      <header className="font-display text-center py-1.5 text-sm text-red-500/80 uppercase tracking-tight select-none">
        {title}
      </header>

      <div className="grid grid-cols-5 text-center border-gray-600 overflow-hidden w-full h-full">
        {/* Headers */}
        {units.map((unit, index) => (
          <label 
            key={`label-${unit.key}`} 
            htmlFor={unit.key}
            className={`border-r border-t border-gray-600 ${index === 0 ? 'border-l-0' : ''} ${index === units.length - 1 ? 'border-r-0' : ''} border-b border-gray-600 py-1.5`}
          >
            {unit.label}
          </label>
        ))}

        {/* Input rows */}
        {units.map((unit, unitIndex) => (
          <div key={`row-${unitIndex}`} className="contents">
            {units.map((otherUnit, otherIndex) => {
              const isLastRow = unitIndex === units.length - 1;
              const isLastCol = otherIndex === units.length - 1;
              const isFirstCol = otherIndex === 0;
              
              const cellClasses = [
                'border-r border-gray-600',
                isFirstCol ? 'border-l-0' : '',
                isLastCol ? 'border-r-0' : '',
                isLastRow ? 'border-b-0' : 'border-b border-gray-600',
                'px-2 py-1'
              ].filter(Boolean).join(' ');

              if (unitIndex === otherIndex) {
                // This is the input cell for this unit
                return (
                  <input
                    key={`input-${unit.key}`}
                    type="number"
                    id={unit.key}
                    min={unit.min}
                    max={unit.max}
                    step={unit.step || 1}
                    value={unit.value}
                    onChange={(e) => unit.setValue(Number(e.target.value))}
                    className={`${cellClasses} ${unit.className || ''}`}
                  />
                );
              } else {
                // This is a conversion cell
                const conversionKey = `${unit.key}To${otherUnit.key.charAt(0).toUpperCase() + otherUnit.key.slice(1)}`;
                const conversionFunction = conversionFunctions[conversionKey];
                const convertedValue = conversionFunction ? conversionFunction(unit.value) : 0;
                
                return (
                  <input
                    key={`conversion-${unit.key}-${otherUnit.key}`}
                    type="text"
                    disabled
                    value={roundWithPadding(convertedValue, 2)}
                    className={cellClasses}
                  />
                );
              }
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

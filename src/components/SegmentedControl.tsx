import React from 'react';

type SegmentValue = string | number;

interface SegmentedOption<T extends SegmentValue> {
  value: T;
  label: React.ReactNode;
}

interface SegmentedControlProps<T extends SegmentValue> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  optionClassName?: string;
  activeClassName?: string;
  inactiveClassName?: string;
}

export default function SegmentedControl<T extends SegmentValue>({
  options,
  value,
  onChange,
  className = '',
  optionClassName = '',
  activeClassName = 'ui-segment-option-active font-medium',
  inactiveClassName = 'ui-segment-option-inactive',
}: SegmentedControlProps<T>) {
  const activeIndex = Math.max(0, options.findIndex(option => option.value === value));

  return (
    <div className={`ui-segment ui-segment-slider ${className}`.trim()}>
      <span
        aria-hidden
        className="ui-segment-slider-indicator"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {options.map(option => {
        const isActive = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            className={`ui-segment-option relative z-10 ${optionClassName} ${
              isActive ? activeClassName : inactiveClassName
            }`.trim()}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

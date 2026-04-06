import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  footer?: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
};

export function Card({
  children,
  title,
  description,
  footer,
  className = '',
  hoverable = false,
  padding = 'md',
  onClick,
}: CardProps) {
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      onClick={onClick}
      className={[
        'bg-white rounded-xl border border-gray-100 shadow-sm',
        hoverable ? 'hover:shadow-md hover:border-gray-200 transition-all duration-150 cursor-pointer' : '',
        onClick ? 'w-full text-left' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {(title || description) && (
        <div className={`border-b border-gray-100 ${paddingClasses[padding]}`}>
          {title && <h3 className="text-base font-semibold text-gray-900">{title}</h3>}
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
      )}
      <div className={paddingClasses[padding]}>{children}</div>
      {footer && (
        <div className={`border-t border-gray-100 ${paddingClasses[padding]}`}>{footer}</div>
      )}
    </Tag>
  );
}

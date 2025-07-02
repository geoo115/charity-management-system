'use client';

import React, { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { z } from 'zod';
import { AlertCircle, CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputSanitizer, ValidationSchemas } from '@/lib/utils/security';

// Animation variants
const formVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const errorVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 }
};

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'textarea' | 'select';
  placeholder?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  options?: { label: string; value: string }[];
  disabled?: boolean;
  className?: string;
  'data-testid'?: string;
}

/**
 * Enhanced form field with validation and accessibility
 */
export const FormField: React.FC<FormFieldProps> = memo(({
  label,
  name,
  type = 'text',
  placeholder,
  required = false,
  value,
  onChange,
  error,
  options,
  disabled = false,
  className,
  'data-testid': testId
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const fieldId = `field-${name}`;
  const errorId = `error-${name}`;

  const handleChange = useCallback((newValue: string) => {
    // Sanitize input based on type
    let sanitizedValue = newValue;
    switch (type) {
      case 'email':
        sanitizedValue = InputSanitizer.sanitizeEmail(newValue);
        break;
      case 'tel':
        sanitizedValue = InputSanitizer.sanitizePhone(newValue);
        break;
      default:
        sanitizedValue = InputSanitizer.sanitizeText(newValue);
    }
    onChange(sanitizedValue);
  }, [onChange, type]);

  const renderInput = () => {
    const commonProps = {
      id: fieldId,
      name,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
        handleChange(e.target.value),
      onFocus: () => setIsFocused(true),
      onBlur: () => setIsFocused(false),
      placeholder,
      disabled,
      required,
      'aria-invalid': !!error,
      'aria-describedby': error ? errorId : undefined,
      'data-testid': testId,
      className: cn(
        'transition-all duration-200',
        isFocused && 'ring-2 ring-green-500/20',
        error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
        className
      )
    };

    switch (type) {
      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            rows={4}
            maxLength={1000}
          />
        );

      case 'select':
        return (
          <Select 
            value={value} 
            onValueChange={handleChange}
            disabled={disabled}
            required={required}
          >
            <SelectTrigger 
              id={fieldId}
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
              data-testid={testId}
              className={cn(
                'transition-all duration-200',
                error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              )}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'password':
        return (
          <div className="relative">
            <Input
              {...commonProps}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </Button>
          </div>
        );

      default:
        return (
          <Input
            {...commonProps}
            type={type}
            autoComplete={
              type === 'email' ? 'email' : 
              type === 'tel' ? 'tel' : 
              'off'
            }
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <Label 
        htmlFor={fieldId}
        className={cn(
          'text-sm font-medium',
          required && "after:content-['*'] after:ml-0.5 after:text-red-500",
          error && 'text-red-600'
        )}
      >
        {label}
      </Label>
      
      <motion.div
        animate={isFocused ? { scale: 1.02 } : { scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {renderInput()}
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            id={errorId}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex items-center space-x-1 text-sm text-red-600"
            role="alert"
          >
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

FormField.displayName = 'FormField';

/**
 * Enhanced form wrapper with validation
 */
interface EnhancedFormProps {
  title?: string;
  description?: string;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  schema?: z.ZodSchema;
  initialData?: Record<string, any>;
  submitText?: string;
  isLoading?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const EnhancedForm: React.FC<EnhancedFormProps> = memo(({
  title,
  description,
  onSubmit,
  schema,
  initialData = {},
  submitText = 'Submit',
  isLoading = false,
  children,
  className
}) => {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const validateField = useCallback((name: string, value: any) => {
    if (!schema) return;

    try {
      // For object schemas, check if the field exists
      if ('shape' in schema && schema.shape && typeof schema.shape === 'object') {
        const fieldSchema = (schema.shape as Record<string, z.ZodTypeAny>)[name];
        if (fieldSchema) {
          fieldSchema.parse(value);
          setErrors(prev => ({ ...prev, [name]: '' }));
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({ 
          ...prev, 
          [name]: error.errors[0]?.message || 'Invalid value' 
        }));
      }
    }
  }, [schema]);

  const handleFieldChange = useCallback((name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
    setSubmitSuccess(false);
  }, [validateField]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting || isLoading) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      // Validate entire form if schema provided
      if (schema) {
        schema.parse(formData);
      }

      await onSubmit(formData);
      setSubmitSuccess(true);

      // Reset form after successful submission
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);

    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            fieldErrors[err.path[0]] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        console.error('Form submission error:', error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enhanced children with props injection
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === FormField) {
      const fieldName = child.props.name;
      return React.cloneElement(child as React.ReactElement<FormFieldProps>, {
        value: formData[fieldName] || '',
        onChange: (value: string) => handleFieldChange(fieldName, value),
        error: errors[fieldName],
        disabled: isSubmitting || isLoading,
      });
    }
    return child;
  });

  return (
    <Card className={cn('w-full max-w-2xl mx-auto', className)}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </CardHeader>
      )}
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {enhancedChildren}

          <div className="flex items-center justify-between pt-4">
            <AnimatePresence>
              {submitSuccess && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center space-x-2 text-green-600"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Submitted successfully!</span>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="ml-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                submitText
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
});

EnhancedForm.displayName = 'EnhancedForm';

/**
 * Password strength indicator
 */
interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = memo(({ 
  password, 
  className 
}) => {
  const getStrength = (pwd: string) => {
    let score = 0;
    const checks = {
      length: pwd.length >= 8,
      lowercase: /[a-z]/.test(pwd),
      uppercase: /[A-Z]/.test(pwd),
      numbers: /\d/.test(pwd),
      symbols: /[^A-Za-z0-9]/.test(pwd)
    };

    score = Object.values(checks).filter(Boolean).length;
    return { score, checks };
  };

  const { score, checks } = getStrength(password);
  
  const strengthLevels = [
    { label: 'Very Weak', color: 'bg-red-500', textColor: 'text-red-600' },
    { label: 'Weak', color: 'bg-orange-500', textColor: 'text-orange-600' },
    { label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-600' },
    { label: 'Good', color: 'bg-blue-500', textColor: 'text-blue-600' },
    { label: 'Strong', color: 'bg-green-500', textColor: 'text-green-600' }
  ];

  const currentLevel = strengthLevels[Math.min(score, 4)];

  if (!password) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">Password strength:</span>
        <span className={currentLevel.textColor}>{currentLevel.label}</span>
      </div>
      
      <div className="flex space-x-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-200',
              i < score ? currentLevel.color : 'bg-gray-200'
            )}
          />
        ))}
      </div>

      <div className="space-y-1 text-xs">
        {Object.entries(checks).map(([key, passed]) => (
          <div 
            key={key} 
            className={cn(
              'flex items-center space-x-2',
              passed ? 'text-green-600' : 'text-gray-400'
            )}
          >
            <CheckCircle className={cn('h-3 w-3', passed ? 'opacity-100' : 'opacity-30')} />
            <span>
              {key === 'length' && 'At least 8 characters'}
              {key === 'lowercase' && 'Lowercase letter'}
              {key === 'uppercase' && 'Uppercase letter'}
              {key === 'numbers' && 'Number'}
              {key === 'symbols' && 'Symbol'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

PasswordStrength.displayName = 'PasswordStrength';

export default {
  FormField,
  EnhancedForm,
  PasswordStrength
};

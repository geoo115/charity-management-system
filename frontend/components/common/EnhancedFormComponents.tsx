'use client';

import React, { useState, useEffect, useCallback, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  AlertCircle, 
  Info,
  Search,
  Calendar,
  Clock,
  MapPin,
  Upload,
  FileText,
  Image as ImageIcon,
  Trash2,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Validation types and utilities
export type ValidationRule = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
  email?: boolean;
  phone?: boolean;
  url?: boolean;
};

export type ValidationResult = {
  isValid: boolean;
  message?: string;
};

const validateField = (value: string, rules: ValidationRule): ValidationResult => {
  if (rules.required && !value?.trim()) {
    return { isValid: false, message: 'This field is required' };
  }

  if (value && rules.minLength && value.length < rules.minLength) {
    return { isValid: false, message: `Minimum ${rules.minLength} characters required` };
  }

  if (value && rules.maxLength && value.length > rules.maxLength) {
    return { isValid: false, message: `Maximum ${rules.maxLength} characters allowed` };
  }

  if (value && rules.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return { isValid: false, message: 'Please enter a valid email address' };
    }
  }

  if (value && rules.phone) {
    const phoneRegex = /^[+]?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(value)) {
      return { isValid: false, message: 'Please enter a valid phone number' };
    }
  }

  if (value && rules.url) {
    try {
      new URL(value);
    } catch {
      return { isValid: false, message: 'Please enter a valid URL' };
    }
  }

  if (value && rules.pattern && !rules.pattern.test(value)) {
    return { isValid: false, message: 'Invalid format' };
  }

  if (value && rules.custom) {
    const customError = rules.custom(value);
    if (customError) {
      return { isValid: false, message: customError };
    }
  }

  return { isValid: true };
};

// Enhanced Input Component
interface EnhancedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  validation?: ValidationRule;
  showValidation?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onValidationChange?: (result: ValidationResult) => void;
  containerClassName?: string;
}

export const EnhancedInput = forwardRef<HTMLInputElement, EnhancedInputProps>(
  ({ 
    label, 
    description, 
    validation,
    showValidation = true,
    leftIcon,
    rightIcon,
    onValidationChange,
    containerClassName,
    className,
    onChange,
    value,
    type,
    ...props 
  }, ref) => {
    const [internalValue, setInternalValue] = useState(value || '');
    const [validationResult, setValidationResult] = useState<ValidationResult>({ isValid: true });
    const [showPassword, setShowPassword] = useState(false);
    const [focused, setFocused] = useState(false);

    // Handle validation
    useEffect(() => {
      if (validation && showValidation) {
        const result = validateField(String(internalValue), validation);
        setValidationResult(result);
        onValidationChange?.(result);
      }
    }, [internalValue, validation, showValidation, onValidationChange]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInternalValue(newValue);
      onChange?.(e);
    };

    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;
    const hasError = showValidation && !validationResult.isValid && internalValue;
    const hasSuccess = showValidation && validationResult.isValid && internalValue && validation;

    return (
      <div className={cn('space-y-2', containerClassName)}>
        {label && (
          <Label className="text-sm font-medium">
            {label}
            {validation?.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}

          <Input
            ref={ref}
            type={inputType}
            value={internalValue}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={cn(
              'transition-all duration-200',
              leftIcon && 'pl-10',
              (rightIcon || isPassword) && 'pr-10',
              hasError && 'border-red-500 focus-visible:ring-red-500',
              hasSuccess && 'border-green-500 focus-visible:ring-green-500',
              focused && 'shadow-md',
              className
            )}
            {...props}
          />

          {/* Right side icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {showValidation && internalValue && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-sm"
              >
                {hasError && <AlertCircle className="h-4 w-4 text-red-500" />}
                {hasSuccess && <Check className="h-4 w-4 text-green-500" />}
              </motion.div>
            )}
            
            {isPassword && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            )}
            
            {rightIcon && !isPassword && (
              <div className="text-muted-foreground">{rightIcon}</div>
            )}
          </div>
        </div>

        {/* Validation message */}
        <AnimatePresence>
          {showValidation && !validationResult.isValid && internalValue && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-1 text-xs text-red-600"
            >
              <AlertCircle className="h-3 w-3" />
              {validationResult.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Character count for text inputs */}
        {validation?.maxLength && (
          <div className="flex justify-end">
            <span className={cn(
              'text-xs',
              String(internalValue).length > validation.maxLength * 0.8
                ? 'text-orange-500'
                : 'text-muted-foreground'
            )}>
              {String(internalValue).length}/{validation.maxLength}
            </span>
          </div>
        )}
      </div>
    );
  }
);

EnhancedInput.displayName = 'EnhancedInput';

// Enhanced Textarea Component
interface EnhancedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  description?: string;
  validation?: ValidationRule;
  showValidation?: boolean;
  onValidationChange?: (result: ValidationResult) => void;
  containerClassName?: string;
  autoResize?: boolean;
}

export const EnhancedTextarea = forwardRef<HTMLTextAreaElement, EnhancedTextareaProps>(
  ({ 
    label, 
    description, 
    validation,
    showValidation = true,
    onValidationChange,
    containerClassName,
    className,
    onChange,
    value,
    autoResize = true,
    ...props 
  }, ref) => {
    const [internalValue, setInternalValue] = useState(value || '');
    const [validationResult, setValidationResult] = useState<ValidationResult>({ isValid: true });

    useEffect(() => {
      if (validation && showValidation) {
        const result = validateField(String(internalValue), validation);
        setValidationResult(result);
        onValidationChange?.(result);
      }
    }, [internalValue, validation, showValidation, onValidationChange]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setInternalValue(newValue);
      
      // Auto-resize
      if (autoResize) {
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
      }
      
      onChange?.(e);
    };

    const hasError = showValidation && !validationResult.isValid && internalValue;
    const hasSuccess = showValidation && validationResult.isValid && internalValue && validation;

    return (
      <div className={cn('space-y-2', containerClassName)}>
        {label && (
          <Label className="text-sm font-medium">
            {label}
            {validation?.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}

        <div className="relative">
          <Textarea
            ref={ref}
            value={internalValue}
            onChange={handleChange}
            className={cn(
              'resize-none transition-all duration-200',
              hasError && 'border-red-500 focus-visible:ring-red-500',
              hasSuccess && 'border-green-500 focus-visible:ring-green-500',
              className
            )}
            {...props}
          />

          {showValidation && internalValue && (
            <div className="absolute top-2 right-2">
              {hasError && <AlertCircle className="h-4 w-4 text-red-500" />}
              {hasSuccess && <Check className="h-4 w-4 text-green-500" />}
            </div>
          )}
        </div>

        <AnimatePresence>
          {showValidation && !validationResult.isValid && internalValue && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-1 text-xs text-red-600"
            >
              <AlertCircle className="h-3 w-3" />
              {validationResult.message}
            </motion.div>
          )}
        </AnimatePresence>

        {validation?.maxLength && (
          <div className="flex justify-end">
            <span className={cn(
              'text-xs',
              String(internalValue).length > validation.maxLength * 0.8
                ? 'text-orange-500'
                : 'text-muted-foreground'
            )}>
              {String(internalValue).length}/{validation.maxLength}
            </span>
          </div>
        )}
      </div>
    );
  }
);

EnhancedTextarea.displayName = 'EnhancedTextarea';

// File Upload Component
interface FileUploadProps {
  label?: string;
  description?: string;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxFiles?: number;
  onFilesChange?: (files: File[]) => void;
  validation?: ValidationRule;
  containerClassName?: string;
  preview?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  description,
  accept,
  multiple = false,
  maxSize = 5 * 1024 * 1024, // 5MB default
  maxFiles = 10,
  onFilesChange,
  validation,
  containerClassName,
  preview = true
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleFileChange = (newFiles: File[]) => {
    const validFiles: File[] = [];
    const newErrors: string[] = [];

    newFiles.forEach(file => {
      if (file.size > maxSize) {
        newErrors.push(`${file.name} is too large (max ${Math.round(maxSize / 1024 / 1024)}MB)`);
        return;
      }
      validFiles.push(file);
    });

    if (multiple) {
      const totalFiles = [...files, ...validFiles];
      if (totalFiles.length > maxFiles) {
        newErrors.push(`Maximum ${maxFiles} files allowed`);
        return;
      }
      setFiles(totalFiles);
      onFilesChange?.(totalFiles);
    } else {
      setFiles(validFiles.slice(0, 1));
      onFilesChange?.(validFiles.slice(0, 1));
    }

    setErrors(newErrors);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFileChange(droppedFiles);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFileChange(selectedFiles);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesChange?.(newFiles);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn('space-y-4', containerClassName)}>
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {validation?.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          dragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        )}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
      >
        <div className="space-y-2">
          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
          <div>
            <Label
              htmlFor="file-upload"
              className="cursor-pointer text-sm font-medium text-primary hover:text-primary/80"
            >
              Click to upload
            </Label>
            <span className="text-sm text-muted-foreground"> or drag and drop</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {accept ? `Accepted: ${accept}` : 'Any file type'} 
            {maxSize && ` • Max ${Math.round(maxSize / 1024 / 1024)}MB`}
            {multiple && ` • Up to ${maxFiles} files`}
          </p>
        </div>

        <input
          id="file-upload"
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {/* Error messages */}
      <AnimatePresence>
        {errors.map((error, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1 text-xs text-red-600"
          >
            <AlertCircle className="h-3 w-3" />
            {error}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* File previews */}
      {preview && files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 p-3 bg-muted rounded-lg"
            >
              {getFileIcon(file)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                className="h-6 w-6 p-0"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// Multi-step Form Component
interface FormStep {
  id: string;
  title: string;
  description?: string;
  content: React.ReactNode;
  validation?: () => boolean;
}

interface MultiStepFormProps {
  steps: FormStep[];
  onComplete?: (data: Record<string, any>) => void;
  onStepChange?: (step: number) => void;
  className?: string;
}

export const MultiStepForm: React.FC<MultiStepFormProps> = ({
  steps,
  onComplete,
  onStepChange,
  className
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState<Record<string, any>>({});

  const canProceed = () => {
    const step = steps[currentStep];
    return !step.validation || step.validation();
  };

  const handleNext = () => {
    if (canProceed() && currentStep < steps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(currentStep + 1);
      onStepChange?.(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      onStepChange?.(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (canProceed()) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      onComplete?.(formData);
    }
  };

  const goToStep = (stepIndex: number) => {
    if (stepIndex <= currentStep || completedSteps.has(stepIndex - 1)) {
      setCurrentStep(stepIndex);
      onStepChange?.(stepIndex);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Step {currentStep + 1} of {steps.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <motion.div
            className="bg-primary h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => goToStep(index)}
              disabled={index > currentStep && !completedSteps.has(index - 1)}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
                index === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : completedSteps.has(index)
                  ? 'bg-green-500 text-white'
                  : index < currentStep
                  ? 'bg-muted text-muted-foreground cursor-pointer hover:bg-muted/80'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {completedSteps.has(index) ? (
                <Check className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </button>
            {index < steps.length - 1 && (
              <div className={cn(
                'h-0.5 w-12 mx-2',
                index < currentStep || completedSteps.has(index)
                  ? 'bg-primary'
                  : 'bg-muted'
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Current step content */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">{steps[currentStep].title}</h2>
              {steps[currentStep].description && (
                <p className="text-sm text-muted-foreground">
                  {steps[currentStep].description}
                </p>
              )}
            </div>
            
            <AnimatePresence>
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {steps[currentStep].content}
              </motion.div>
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          Previous
        </Button>
        
        <div className="flex gap-2">
          {currentStep === steps.length - 1 ? (
            <Button
              onClick={handleComplete}
              disabled={!canProceed()}
            >
              Complete
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default {
  EnhancedInput,
  EnhancedTextarea,
  FileUpload,
  MultiStepForm,
  validateField,
}; 
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export interface ProgressBarProps {
    /** Progress value from 0 to 100 */
    value: number;
    /** Current status of the progress */
    status?: 'idle' | 'loading' | 'success' | 'error' | 'paused';
    /** Error message to display */
    error?: string;
    /** Whether to show percentage text */
    showPercentage?: boolean;
    /** Whether to animate the progress bar */
    animated?: boolean;
    /** Custom label to display */
    label?: string;
    /** Additional information to display */
    info?: string;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Color variant */
    variant?: 'default' | 'success' | 'warning' | 'destructive';
    /** Custom className */
    className?: string;
    /** Whether progress should be preserved on error (for recoverable errors) */
    preserveProgressOnError?: boolean;
    /** Callback when progress animation completes */
    onAnimationComplete?: () => void;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
    value,
    status = 'idle',
    error,
    showPercentage = true,
    animated = true,
    label,
    info,
    size = 'md',
    variant = 'default',
    className,
    preserveProgressOnError = true,
    onAnimationComplete,
}) => {
    const [displayValue, setDisplayValue] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    // Animate progress value changes
    useEffect(() => {
        if (!animated) {
            setDisplayValue(value);
            return;
        }

        // Don't reset progress on error if preserveProgressOnError is true
        const targetValue = status === 'error' && !preserveProgressOnError ? 0 : value;

        if (displayValue === targetValue) return;

        setIsAnimating(true);
        const startValue = displayValue;
        const difference = targetValue - startValue;
        const duration = Math.abs(difference) * 10; // 10ms per percentage point
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Use easeOutCubic for smooth animation
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const currentValue = startValue + difference * easeOutCubic;

            setDisplayValue(Math.round(currentValue));

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setIsAnimating(false);
                onAnimationComplete?.();
            }
        };

        requestAnimationFrame(animate);
    }, [value, animated, displayValue, status, preserveProgressOnError, onAnimationComplete]);

    // Get status icon
    const getStatusIcon = () => {
        switch (status) {
            case 'loading':
                return <Loader2 className="h-4 w-4 animate-spin" />;
            case 'success':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'error':
                return <AlertCircle className="h-4 w-4 text-destructive" />;
            case 'paused':
                return <Clock className="h-4 w-4 text-yellow-500" />;
            default:
                return null;
        }
    };

    // Get progress bar color based on status and variant
    const getProgressColor = () => {
        if (status === 'error') return 'bg-destructive';
        if (status === 'success') return 'bg-green-500';
        if (status === 'paused') return 'bg-yellow-500';

        switch (variant) {
            case 'success':
                return 'bg-green-500';
            case 'warning':
                return 'bg-yellow-500';
            case 'destructive':
                return 'bg-destructive';
            default:
                return 'bg-primary';
        }
    };

    // Get size classes
    const getSizeClasses = () => {
        switch (size) {
            case 'sm':
                return {
                    container: 'space-y-1',
                    progress: 'h-1',
                    text: 'text-xs',
                };
            case 'lg':
                return {
                    container: 'space-y-3',
                    progress: 'h-3',
                    text: 'text-base',
                };
            default:
                return {
                    container: 'space-y-2',
                    progress: 'h-2',
                    text: 'text-sm',
                };
        }
    };

    const sizeClasses = getSizeClasses();
    const progressColor = getProgressColor();
    const statusIcon = getStatusIcon();

    return (
        <div className={cn(sizeClasses.container, className)}>
            {/* Header with label and status */}
            {(label || statusIcon || showPercentage) && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        {statusIcon}
                        {label && <span className={cn('font-medium', sizeClasses.text)}>{label}</span>}
                    </div>

                    {showPercentage && (
                        <span
                            className={cn(
                                'font-mono font-medium tabular-nums',
                                sizeClasses.text,
                                status === 'error' && 'text-destructive',
                                status === 'success' && 'text-green-500',
                            )}
                        >
                            {displayValue}%
                        </span>
                    )}
                </div>
            )}

            {/* Progress bar */}
            <div className="relative">
                <Progress
                    value={displayValue}
                    className={cn(sizeClasses.progress, 'transition-all duration-300', animated && isAnimating && 'transition-none')}
                />

                {/* Custom progress indicator with color and enhanced animations */}
                <div
                    className={cn(
                        'progress-indicator progress-bar absolute top-0 left-0 h-full rounded-full transition-all duration-300',
                        progressColor,
                        animated && isAnimating && 'transition-none',
                        status === 'loading' && 'progress-bar',
                    )}
                    style={{ '--progress-width': `${displayValue}%` } as React.CSSProperties}
                />

                {/* Enhanced shimmer effect for loading state */}
                {status === 'loading' && animated && (
                    <div
                        className="shimmer-container absolute top-0 left-0 h-full overflow-hidden rounded-full"
                        style={{ '--shimmer-width': `${displayValue}%` } as React.CSSProperties}
                    >
                        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                        <div className="progress-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                    </div>
                )}

                {/* Glow effect for active progress */}
                {status === 'loading' && displayValue > 0 && (
                    <div
                        className="absolute top-0 left-0 h-full rounded-full opacity-50 blur-sm"
                        style={{
                            width: `${displayValue}%`,
                            background: 'linear-gradient(90deg, #ff6b35, #f7931e)',
                            animation: 'pulse 2s infinite',
                        }}
                    />
                )}
            </div>

            {/* Error message */}
            {status === 'error' && error && (
                <div className="flex items-start space-x-2 text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                        <p className={cn('font-medium', sizeClasses.text)}>Upload Error</p>
                        <p className={cn('text-destructive/80', sizeClasses.text)}>{error}</p>
                        {preserveProgressOnError && displayValue > 0 && (
                            <p className={cn('mt-1 text-muted-foreground', sizeClasses.text)}>
                                Progress preserved - you can retry from {displayValue}%
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Additional info */}
            {info && status !== 'error' && <p className={cn('text-muted-foreground', sizeClasses.text)}>{info}</p>}

            {/* Success message */}
            {status === 'success' && (
                <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className={cn('font-medium', sizeClasses.text)}>Upload completed successfully</span>
                </div>
            )}

            {/* Paused message */}
            {status === 'paused' && (
                <div className="flex items-center space-x-2 text-yellow-600">
                    <Clock className="h-4 w-4" />
                    <span className={cn('font-medium', sizeClasses.text)}>Upload paused</span>
                </div>
            )}
        </div>
    );
};

export default ProgressBar;

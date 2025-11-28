import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner = ({
  message = 'Loading...',
  subMessage,
  fullScreen = false,
}: LoadingSpinnerProps) => {
  const containerClasses = fullScreen
    ? 'min-h-screen flex items-center justify-center bg-background'
    : 'flex flex-col items-center justify-center py-16';

  return (
    <div className={containerClasses}>
      <div className="text-center space-y-4 animate-fade-in">
        <Loader2 className="w-12 h-12 animate-spin text-accent mx-auto" />
        {message && (
          <div>
            <p className="text-xl font-semibold">{message}</p>
            {subMessage && (
              <p className="text-muted-foreground">{subMessage}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

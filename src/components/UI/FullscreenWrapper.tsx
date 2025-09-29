import React, { useState, useRef, useEffect, ReactNode } from 'react';

interface FullscreenWrapperProps {
  children: ReactNode;
  className?: string;
  showButton?: boolean;
  buttonPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  buttonText?: string;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

const FullscreenWrapper: React.FC<FullscreenWrapperProps> = ({
  children,
  className = '',
  showButton = true,
  buttonPosition = 'top-right',
  buttonText,
  onFullscreenChange
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const enterFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (containerRef.current.requestFullscreen) {
        await containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        await (containerRef.current as any).webkitRequestFullscreen();
      } else if ((containerRef.current as any).msRequestFullscreen) {
        await (containerRef.current as any).msRequestFullscreen();
      }
    } catch (err) {
      console.error('Error attempting to enable fullscreen:', err);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
    } catch (err) {
      console.error('Error attempting to exit fullscreen:', err);
    }
  };

  const toggleFullscreen = () => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement ||
                               (document as any).webkitFullscreenElement ||
                               (document as any).msFullscreenElement;

      const newIsFullscreen = fullscreenElement === containerRef.current;
      setIsFullscreen(newIsFullscreen);
      onFullscreenChange?.(newIsFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [onFullscreenChange]);

  const buttonPositionClasses = {
    'top-right': 'top-2 right-2',
    'top-left': 'top-2 left-2',
    'bottom-right': 'bottom-2 right-2',
    'bottom-left': 'bottom-2 left-2'
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${className} ${isFullscreen ? 'bg-white dark:bg-gray-900 p-4' : ''}`}
    >
      {showButton && (
        <button
          onClick={toggleFullscreen}
          className={`absolute ${buttonPositionClasses[buttonPosition]} z-10 px-2 py-1 bg-black/20 hover:bg-black/30 text-white text-xs rounded transition-colors duration-200 backdrop-blur-sm`}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          type="button"
        >
          {buttonText || (isFullscreen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          ))}
        </button>
      )}
      <div className={isFullscreen ? 'h-full overflow-auto' : ''}>
        {children}
      </div>
    </div>
  );
};

export default FullscreenWrapper;
import { useEffect, useRef, useState } from 'react';

interface TurnRadiusParams {
  ktas: number;
  maxAngleOfBankDeg: number;
  rollRateDeg: number;
  currentHeading: number;
  windSpeed: number;
  windDirection: number;
  timeAfterTurnStarted: number;
}

interface Point {
  x: number;
  y: number;
}

interface WorkerResult {
  success: boolean;
  points?: Point[];
  error?: string;
}

export function useTurnRadiusWorker() {
  const [points, setPoints] = useState<Point[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Create the worker
    workerRef.current = new Worker(new URL('../workers/turnRadiusWorker.ts', import.meta.url), {
      type: 'module'
    });

    // Listen for messages from the worker
    workerRef.current.onmessage = (e: MessageEvent<WorkerResult>) => {
      const { success, points: workerPoints, error: workerError } = e.data;
      
      if (success && workerPoints) {
        setPoints(workerPoints);
        setError(null);
      } else {
        setError(workerError || 'Unknown error occurred');
        setPoints([]);
      }
      
      setIsLoading(false);
    };

    // Handle worker errors
    workerRef.current.onerror = (error) => {
      console.error('Worker error:', error);
      setError('Worker error occurred');
      setIsLoading(false);
    };

    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const calculateTurnRadius = (params: TurnRadiusParams) => {
    if (!workerRef.current) {
      setError('Worker not available');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    // Send parameters to the worker
    workerRef.current.postMessage(params);
  };

  return {
    points,
    isLoading,
    error,
    calculateTurnRadius
  };
}

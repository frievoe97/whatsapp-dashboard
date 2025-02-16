// Imports: React hooks
import { useState, useEffect, RefObject } from 'react';

/////////////////////// Type Definition ///////////////////////

/**
 * Represents the dimensions of an HTML element.
 */
interface ResizeObserverEntry {
  width: number;
  height: number;
}

/////////////////////// Custom Hook: useResizeObserver ///////////////////////

/**
 * Custom Hook: useResizeObserver
 *
 * Monitors the size of a given HTML element using the ResizeObserver API and returns its current dimensions.
 *
 * @param ref - A React ref object that points to the target HTML element.
 * @returns The current width and height of the element, or undefined if the element is not available.
 */
const useResizeObserver = (ref: RefObject<HTMLElement>): ResizeObserverEntry | undefined => {
  // State: Holds the current dimensions of the element
  const [dimensions, setDimensions] = useState<ResizeObserverEntry>();

  //////////// useEffect: Setup and Cleanup ResizeObserver ////////////
  useEffect(() => {
    const element = ref.current;
    if (!element) return; // Exit if element is not available

    // Function: Update dimensions from element's bounding rectangle
    const updateDimensions = () => {
      const rect = element.getBoundingClientRect();
      setDimensions({
        width: rect.width,
        height: rect.height,
      });
    };

    // Initial update before starting the observer
    updateDimensions();

    // Create a new ResizeObserver instance to monitor size changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    // Start observing the target element
    resizeObserver.observe(element);

    // Cleanup: Unobserve the element when component unmounts or ref changes
    return () => {
      if (element) {
        resizeObserver.unobserve(element);
      }
    };
  }, [ref]); // Re-run effect if the ref changes

  return dimensions;
};

export default useResizeObserver;

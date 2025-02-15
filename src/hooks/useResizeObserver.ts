/**
 * Custom React Hook: useResizeObserver
 *
 * This hook provides real-time monitoring of an HTML element's dimensions (width and height)
 * using the ResizeObserver API. It is useful for responsive components that need to adjust
 * dynamically based on their size.
 *
 * @param {RefObject<HTMLElement>} ref - A React ref object pointing to the target HTML element.
 * @returns {ResizeObserverEntry | undefined} - An object containing the width and height of the observed element.
 */

import { useState, useEffect, RefObject } from 'react';

// Define the structure of the ResizeObserver entry state
interface ResizeObserverEntry {
  width: number;
  height: number;
}

const useResizeObserver = (ref: RefObject<HTMLElement>): ResizeObserverEntry | undefined => {
  // State to store the current dimensions of the observed element
  const [dimensions, setDimensions] = useState<ResizeObserverEntry>();

  useEffect(() => {
    const element = ref.current;
    if (!element) return; // Ensure the element exists before proceeding

    /**
     * Function to manually update the dimensions in case ResizeObserver
     * is not immediately triggered or needs an initial value.
     */
    const updateDimensions = () => {
      const rect = element.getBoundingClientRect();
      setDimensions({
        width: rect.width,
        height: rect.height,
      });
    };

    // Initial update to set dimensions before the observer starts
    updateDimensions();

    // Create a new ResizeObserver instance to track element size changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    // Start observing the target element
    resizeObserver.observe(element);

    /**
     * Cleanup function to remove the observer when the component unmounts
     * or when the observed element changes.
     */
    return () => {
      if (element) {
        resizeObserver.unobserve(element);
      }
    };
  }, [ref]); // Re-run effect if the ref changes

  return dimensions;
};

export default useResizeObserver;

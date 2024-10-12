import { useState, useEffect, RefObject } from "react";

interface ResizeObserverEntry {
  width: number;
  height: number;
}

const useResizeObserver = (
  ref: RefObject<HTMLElement>
): ResizeObserverEntry | undefined => {
  const [dimensions, setDimensions] = useState<ResizeObserverEntry>();

  useEffect(() => {
    const element = ref.current;
    if (!element) return; // Element muss existieren

    // Fallback: Initiale Abfrage der Dimensionen
    const updateDimensions = () => {
      const rect = element.getBoundingClientRect();
      setDimensions({
        width: rect.width,
        height: rect.height,
      });
    };

    // Initiale Abfrage der Dimensionen, falls diese noch nicht gesetzt wurden
    updateDimensions();

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(element);

    // Clean-up-Funktion
    return () => {
      if (element) {
        resizeObserver.unobserve(element);
      }
    };
  }, [ref]);

  return dimensions;
};

export default useResizeObserver;

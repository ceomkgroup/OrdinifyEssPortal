"use client";

import { useEffect, useRef, useState } from "react";

export function ChartContainer({ children, className = "", height = 200 }) {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const nextHeight = Math.floor(rect.height || height);
      if (width > 0 && nextHeight > 0) {
        setSize({ width, height: nextHeight });
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [height]);

  return (
    <div
      ref={ref}
      className={`min-w-0 w-full ${className}`}
      style={{ height, minHeight: height }}
    >
      {size.width > 0 && size.height > 0 ? children(size) : null}
    </div>
  );
}

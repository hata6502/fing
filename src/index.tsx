import {
  Dispatch,
  FunctionComponent,
  MouseEventHandler,
  PointerEventHandler,
  SetStateAction,
  StrictMode,
  SVGProps,
  TouchEventHandler,
  memo,
  useEffect,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";

const backgroundColor = "#fafaef";
const textColor = "rgba(0, 0, 0, 0.87)";

const viewportZoom = 10;
const gridSize = 32 * viewportZoom;
const tileSize = 4 * gridSize;

interface Point {
  x: number;
  y: number;
  t: number;
  p: number;
}

if ("serviceWorker" in navigator) {
  await navigator.serviceWorker.register("/serviceWorker.mjs");
}

const pathTolineSegments = (path: Point[]) =>
  path
    .slice(0, -1)
    .map((point, pointIndex) => [point, path[pointIndex + 1]] as const);

const App: FunctionComponent = () => {
  const [pageKey, dispatchPageKey] = useState("");
  return <Page key={pageKey} dispatchPageKey={dispatchPageKey} />;
};

const Page: FunctionComponent<{
  dispatchPageKey: Dispatch<SetStateAction<string>>;
}> = ({ dispatchPageKey }) => {
  const [canvasWidth, setCanvasWidth] = useState(() => {
    const savedCanvasWidthString = localStorage.getItem("canvasWidth");
    return savedCanvasWidthString
      ? Number(savedCanvasWidthString)
      : tileSize * (Math.ceil(innerWidth / tileSize) + 4);
  });

  const [canvasHeight, setCanvasHeight] = useState(() => {
    const savedCanvasHeightString = localStorage.getItem("canvasHeight");
    return savedCanvasHeightString
      ? Number(savedCanvasHeightString)
      : tileSize * (Math.ceil(innerHeight / tileSize) + 4);
  });

  const [mountedTime] = useState(() => {
    const savedMountedTimeString = localStorage.getItem("mountedTime");
    return savedMountedTimeString ? Number(savedMountedTimeString) : Date.now();
  });

  const [paths, dispatchPaths] = useState<Point[][]>(() => {
    const savedPathsString = localStorage.getItem("paths");
    return savedPathsString ? JSON.parse(savedPathsString) : [];
  });

  const [pointerID, dispatchPointerID] = useState<number>();

  const canvasTopElementRef = useRef<HTMLDivElement>(null);
  const canvasBottomElementRef = useRef<HTMLDivElement>(null);
  const canvasLeftElementRef = useRef<HTMLDivElement>(null);
  const canvasRightElementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      !canvasTopElementRef.current ||
      !canvasBottomElementRef.current ||
      !canvasLeftElementRef.current ||
      !canvasRightElementRef.current
    ) {
      throw new Error("canvas elements are not found");
    }

    scrollTo(1.5 * tileSize, 1.5 * tileSize);

    const topObserver = new IntersectionObserver((entries) => {
      if (entries.every((entry) => !entry.isIntersecting)) {
        return;
      }

      setTimeout(() => {
        setCanvasHeight((prevCanvasHeight) => prevCanvasHeight + tileSize);
        scrollBy(0, tileSize);

        dispatchPaths((prevPaths) =>
          prevPaths.map((prevPath) =>
            prevPath.map((prevPoint) => ({
              ...prevPoint,
              y: prevPoint.y + tileSize,
            }))
          )
        );
      }, 500);
    });

    const bottomObserver = new IntersectionObserver((entries) => {
      if (entries.every((entry) => !entry.isIntersecting)) {
        return;
      }

      setTimeout(() => {
        setCanvasHeight((prevCanvasHeight) => prevCanvasHeight + tileSize);
      }, 500);
    });

    const leftObserver = new IntersectionObserver((entries) => {
      if (entries.every((entry) => !entry.isIntersecting)) {
        return;
      }

      setTimeout(() => {
        setCanvasWidth((prevCanvasWidth) => prevCanvasWidth + tileSize);
        scrollBy(tileSize, 0);

        dispatchPaths((prevPaths) =>
          prevPaths.map((prevPath) =>
            prevPath.map((prevPoint) => ({
              ...prevPoint,
              x: prevPoint.x + tileSize,
            }))
          )
        );
      }, 500);
    });

    const rightObserver = new IntersectionObserver((entries) => {
      if (entries.every((entry) => !entry.isIntersecting)) {
        return;
      }

      setTimeout(() => {
        setCanvasWidth((prevCanvasWidth) => prevCanvasWidth + tileSize);
      }, 500);
    });

    topObserver.observe(canvasTopElementRef.current);
    bottomObserver.observe(canvasBottomElementRef.current);
    leftObserver.observe(canvasLeftElementRef.current);
    rightObserver.observe(canvasRightElementRef.current);

    return () => {
      topObserver.disconnect();
      bottomObserver.disconnect();
      leftObserver.disconnect();
      rightObserver.disconnect();
    };
  }, []);

  const velocityXRef = useRef(0);
  const velocityDecimalXRef = useRef(0);

  useEffect(() => {
    const intervalID = setInterval(() => {
      velocityDecimalXRef.current += velocityXRef.current;
      const velocityIntegerX = Math.floor(velocityDecimalXRef.current);
      if (velocityIntegerX) {
        scrollBy(velocityIntegerX, 0);
      }
      velocityDecimalXRef.current -= velocityIntegerX;

      velocityXRef.current /= 1 + 1 / 64;
    });
    return () => {
      clearInterval(intervalID);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("mountedTime", String(mountedTime));
  }, [mountedTime]);

  useEffect(() => {
    localStorage.setItem("canvasWidth", String(canvasWidth));
  }, [canvasWidth]);

  useEffect(() => {
    localStorage.setItem("canvasHeight", String(canvasHeight));
  }, [canvasHeight]);

  useEffect(() => {
    const timeoutID = window.setTimeout(() => {
      localStorage.setItem("paths", JSON.stringify(paths));
    }, 100);

    return () => clearTimeout(timeoutID);
  }, [paths]);

  const viewBox = `0 0 ${canvasWidth} ${canvasHeight}`;

  const handleContextMenu: MouseEventHandler = (event) => {
    event.preventDefault();
  };

  const handlePointerDown: PointerEventHandler = (event) => {
    if (typeof pointerID === "number") {
      return;
    }

    const point = {
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY,
      t: Date.now() - mountedTime,
      p: event.pressure,
    };

    dispatchPaths((prevPaths) => [...prevPaths, [point]]);
    dispatchPointerID(event.pointerId);
  };

  const handlePointerMove: PointerEventHandler = (event) => {
    if (pointerID !== event.pointerId) {
      return;
    }

    const currentPoint = {
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY,
      t: Date.now() - mountedTime,
      p: event.pressure,
    };

    dispatchPaths((prevPaths) => [
      ...prevPaths.slice(0, -1),
      [...prevPaths[prevPaths.length - 1], currentPoint],
    ]);

    const prevPoint = paths.at(-1)?.at(-1);
    if (prevPoint && visualViewport) {
      const feedback =
        (event.nativeEvent.pageX - visualViewport.pageLeft) /
        visualViewport.width;

      if (feedback >= 0.5) {
        const delta =
          Math.abs(currentPoint.y - prevPoint.y) /
          visualViewport.scale ** (1 / 2);

        velocityXRef.current += ((feedback - 0.5) * delta) / 16;
      }
    }
  };

  const handlePointerUp: PointerEventHandler = (event) => {
    if (pointerID !== event.pointerId) {
      return;
    }

    const currentPoint = {
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY,
      t: Date.now() - mountedTime,
      p: event.pressure,
    };
    const currentPath = [...(paths.at(-1) ?? []), currentPoint];
    const currentLineSegments = pathTolineSegments(currentPath);

    const existingPaths = paths.slice(0, -1);
    const maxIntersectedCount = existingPaths.reduce(
      (maxIntersectedCount, existingPath) => {
        let intersectedCount = 0;

        for (const a of pathTolineSegments(existingPath)) {
          for (const b of currentLineSegments) {
            if (
              ((a[0].x - a[1].x) * (b[0].y - a[0].y) +
                (a[0].y - a[1].y) * (a[0].x - b[0].x)) *
                ((a[0].x - a[1].x) * (b[1].y - a[0].y) +
                  (a[0].y - a[1].y) * (a[0].x - b[1].x)) <
                0 &&
              ((b[0].x - b[1].x) * (a[0].y - b[0].y) +
                (b[0].y - b[1].y) * (b[0].x - a[0].x)) *
                ((b[0].x - b[1].x) * (a[1].y - b[0].y) +
                  (b[0].y - b[1].y) * (b[0].x - a[1].x)) <
                0
            ) {
              intersectedCount++;
            }
          }
        }

        return Math.max(maxIntersectedCount, intersectedCount);
      },
      -Infinity
    );

    if (maxIntersectedCount < 8) {
      dispatchPaths([...existingPaths, currentPath]);
    } else {
      const minX = currentPath.reduce(
        (min, point) => Math.min(min, point.x),
        Infinity
      );
      const maxX = currentPath.reduce(
        (max, point) => Math.max(max, point.x),
        -Infinity
      );
      const minY = currentPath.reduce(
        (min, point) => Math.min(min, point.y),
        Infinity
      );
      const maxY = currentPath.reduce(
        (max, point) => Math.max(max, point.y),
        -Infinity
      );

      dispatchPaths(
        existingPaths.filter((existingPath) => {
          const centerX =
            existingPath.reduce((sum, point) => sum + point.x, 0) /
            existingPath.length;
          const centerY =
            existingPath.reduce((sum, point) => sum + point.y, 0) /
            existingPath.length;

          return (
            centerX < minX ||
            centerX >= maxX ||
            centerY < minY ||
            centerY >= maxY
          );
        })
      );
    }

    dispatchPointerID(undefined);
  };

  const handlePointerCancel: PointerEventHandler = (event) => {
    if (pointerID !== event.pointerId) {
      return;
    }

    dispatchPaths((prevPaths) => [...prevPaths.slice(0, -1)]);
    dispatchPointerID(undefined);
  };

  const handleTouchEnd: TouchEventHandler = (event) => {
    // Prevent mouse events for iOS.
    // https://developer.mozilla.org/ja/docs/Web/API/touchevent#using_with_addeventlistener_and_preventdefault
    event.preventDefault();
  };

  const handleShareButtonClick = async () => {
    const padding = 8;
    const canvasZoom = 8;

    const noiseFilteredPaths = paths.filter((path) => {
      let length = 0;
      let prevPoint;
      for (const point of path) {
        if (prevPoint) {
          length +=
            ((point.x - prevPoint.x) ** 2 + (point.y - prevPoint.y) ** 2) **
            (1 / 2);
        }

        prevPoint = point;
      }

      return length >= 8;
    });
    const points = noiseFilteredPaths.flat();
    const maxX = points.reduce((a, b) => Math.max(a, b.x), -Infinity) + padding;
    const minX = points.reduce((a, b) => Math.min(a, b.x), Infinity) - padding;
    const maxY = points.reduce((a, b) => Math.max(a, b.y), -Infinity) + padding;
    const minY = points.reduce((a, b) => Math.min(a, b.y), Infinity) - padding;

    const canvasElement = document.createElement("canvas");
    const width = (maxX - minX) * canvasZoom;
    const height = (maxY - minY) * canvasZoom;
    canvasElement.width = width;
    canvasElement.height = height;

    const canvasContext = canvasElement.getContext("2d");
    if (!canvasContext) {
      throw new Error("Couldn't get canvasContext. ");
    }

    canvasContext.fillStyle = backgroundColor;
    canvasContext.rect(0, 0, width, height);
    canvasContext.fill();

    canvasContext.lineCap = "round";
    canvasContext.lineWidth = viewportZoom * canvasZoom;
    canvasContext.strokeStyle = textColor;
    for (const path of paths) {
      canvasContext.beginPath();

      for (const [pointIndex, point] of path.entries()) {
        if (pointIndex === 0) {
          canvasContext.moveTo(
            (point.x - minX) * canvasZoom,
            (point.y - minY) * canvasZoom
          );
        } else {
          canvasContext.lineTo(
            (point.x - minX) * canvasZoom,
            (point.y - minY) * canvasZoom
          );
        }
      }

      canvasContext.stroke();
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvasElement.toBlob(resolve)
    );
    if (!blob) {
      throw new Error("Blob is not found. ");
    }
    const filename = "note.png";
    const shareData = {
      files: [new File([blob], filename, { type: "image/png" })],
    };

    if (navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      const anchorElement = document.createElement("a");
      try {
        anchorElement.download = filename;
        anchorElement.href = canvasElement.toDataURL();
        document.body.append(anchorElement);
        anchorElement.click();
      } finally {
        anchorElement.remove();
      }
    }
  };

  const handleClearButtonClick = () => {
    for (const key of ["canvasWidth", "canvasHeight", "mountedTime", "paths"]) {
      localStorage.removeItem(key);
    }

    dispatchPageKey(String(Math.random()));
    alert("Cleared. ");
  };

  return (
    <div onContextMenu={handleContextMenu}>
      <div
        ref={canvasTopElementRef}
        style={{
          width: canvasWidth + tileSize,
          height: tileSize / 2,
        }}
      />

      <div style={{ display: "flex", width: canvasWidth + tileSize }}>
        <div ref={canvasLeftElementRef} style={{ width: tileSize / 2 }} />

        <div
          style={{
            position: "relative",
            width: canvasWidth,
            verticalAlign: "bottom",
          }}
        >
          <svg
            viewBox={viewBox}
            xmlns="http://www.w3.org/2000/svg"
            style={{
              position: "absolute",
              width: "100%",
              backgroundColor,
            }}
          >
            <Grids canvasWidth={canvasWidth} canvasHeight={canvasHeight} />
          </svg>

          <Canvas
            paths={paths}
            viewBox={viewBox}
            xmlns="http://www.w3.org/2000/svg"
            style={{
              position: "relative",
              width: "100%",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onTouchEnd={handleTouchEnd}
          />
        </div>

        <div ref={canvasRightElementRef} style={{ width: tileSize / 2 }} />
      </div>

      <div
        ref={canvasBottomElementRef}
        style={{
          width: canvasWidth + tileSize,
          height: tileSize / 2,
        }}
      />

      <button
        type="button"
        style={{
          position: "fixed",
          top: "calc(env(safe-area-inset-top) + 80px)",
          left: "calc(env(safe-area-inset-left) + 80px)",
          fontSize: 12 * viewportZoom,
        }}
        onClick={handleShareButtonClick}
      >
        Share
      </button>

      <button
        type="button"
        style={{
          position: "fixed",
          top: "calc(env(safe-area-inset-top) + 80px)",
          right: "calc(env(safe-area-inset-right) + 80px)",
          fontSize: 12 * viewportZoom,
        }}
        onClick={handleClearButtonClick}
      >
        Clear
      </button>
    </div>
  );
};

document.body.style.margin = "0";
const container = document.createElement("div");
document.body.append(container);

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);

const Grids: FunctionComponent<{ canvasWidth: number; canvasHeight: number }> =
  memo(({ canvasWidth, canvasHeight }) => (
    <>
      {[...Array(Math.ceil(canvasHeight / gridSize)).keys()].flatMap((y) =>
        [...Array(Math.ceil(canvasWidth / gridSize)).keys()].map((x) => {
          const cx = x * gridSize;
          const cy = y * gridSize;

          return (
            <circle
              key={`${x}-${y}`}
              cx={cx}
              cy={cy}
              r={viewportZoom}
              fill={
                cx % tileSize === 0 && cy % tileSize === 0
                  ? "rgba(0, 0, 0, 0.2)"
                  : "rgba(0, 0, 0, 0.05)"
              }
            />
          );
        })
      )}
    </>
  ));

const Canvas: FunctionComponent<
  {
    paths: Point[][];
  } & SVGProps<SVGSVGElement>
> = ({ paths, ...svgProps }) => (
  <svg {...svgProps}>
    {paths.map((path, pathIndex) => (
      <Path key={pathIndex} path={path} />
    ))}
  </svg>
);

const Path: FunctionComponent<{
  path: Point[];
}> = memo(({ path }) => {
  const d = path
    .map(
      (point, pointIndex) =>
        `${pointIndex === 0 ? "M" : "L"} ${point.x} ${point.y}`
    )
    .join(" ");

  return (
    <path
      d={d}
      fill="none"
      stroke={textColor}
      strokeLinecap="round"
      strokeWidth={viewportZoom}
    />
  );
});

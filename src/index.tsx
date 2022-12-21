import {
  Dispatch,
  FunctionComponent,
  MouseEventHandler,
  PointerEventHandler,
  SetStateAction,
  StrictMode,
  SVGProps,
  memo,
  useEffect,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";

const gridSize = 32;
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

  const sensitivityRef = useRef(32);
  const velocityXRef = useRef(0);
  const velocityDecimalXRef = useRef(0);

  useEffect(() => {
    const intervalID = setInterval(() => {
      velocityDecimalXRef.current += velocityXRef.current;
      scrollBy(Math.floor(velocityDecimalXRef.current), 0);
      velocityDecimalXRef.current -= Math.floor(velocityDecimalXRef.current);

      velocityXRef.current /= 1.046875;
    }, 16);
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
    const sensitivityString = localStorage.getItem("sensitivity");
    if (sensitivityString) {
      sensitivityRef.current = Number(sensitivityString);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("sensitivity", String(sensitivityRef.current));
  }, [sensitivityRef.current]);

  useEffect(() => {
    const timeoutID = window.setTimeout(() => {
      localStorage.setItem("paths", JSON.stringify(paths));
    }, 100);

    return () => clearTimeout(timeoutID);
  }, [paths]);

  const viewBox = `0 0 ${canvasWidth} ${canvasHeight}`;

  const handleSVGContextMenu: MouseEventHandler = (event) =>
    event.preventDefault();

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
        (currentPoint.x - visualViewport.pageLeft) / visualViewport.width;

      if (feedback >= 0.5) {
        const delta =
          /*((currentPoint.x - prevPoint.x) / visualViewport.width) ** 2 +*/
          (((currentPoint.y - prevPoint.y) / visualViewport.height) ** 2) **
          0.5;

        velocityXRef.current +=
          (feedback - 0.5) * delta * sensitivityRef.current;
        sensitivityRef.current += (0.75 - feedback) * delta * 2;
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

    dispatchPaths((prevPaths) => [
      ...prevPaths.slice(0, -1),
      [...prevPaths[prevPaths.length - 1], currentPoint],
    ]);

    dispatchPointerID(undefined);
  };

  const handlePointerCancel: PointerEventHandler = (event) => {
    if (pointerID !== event.pointerId) {
      return;
    }

    dispatchPaths((prevPaths) => [...prevPaths.slice(0, -1)]);
    dispatchPointerID(undefined);
  };

  const handleShareButtonClick = async () => {
    const padding = 4;
    const zoom = 4;

    const points = paths.flat();
    const maxX = points.reduce((a, b) => Math.max(a, b.x), -Infinity) + padding;
    const minX = points.reduce((a, b) => Math.min(a, b.x), Infinity) - padding;
    const maxY = points.reduce((a, b) => Math.max(a, b.y), -Infinity) + padding;
    const minY = points.reduce((a, b) => Math.min(a, b.y), Infinity) - padding;

    const canvasElement = document.createElement("canvas");
    const width = (maxX - minX) * zoom;
    const height = (maxY - minY) * zoom;
    canvasElement.width = width;
    canvasElement.height = height;

    const canvasContext = canvasElement.getContext("2d");
    if (!canvasContext) {
      throw new Error("Couldn't get canvasContext. ");
    }

    canvasContext.fillStyle = "#ffffff";
    canvasContext.rect(0, 0, width, height);
    canvasContext.fill();

    canvasContext.lineCap = "round";
    canvasContext.lineWidth = zoom;
    canvasContext.strokeStyle = "#000000";
    for (const path of paths) {
      canvasContext.beginPath();

      for (const [pointIndex, point] of path.entries()) {
        if (pointIndex === 0) {
          canvasContext.moveTo(
            (point.x - minX) * zoom,
            (point.y - minY) * zoom
          );
        } else {
          canvasContext.lineTo(
            (point.x - minX) * zoom,
            (point.y - minY) * zoom
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
  };

  return (
    <>
      <div
        ref={canvasTopElementRef}
        style={{
          width: canvasWidth + tileSize,
          height: tileSize / 2,
          backgroundColor: "#eeeeee",
        }}
      />

      <div style={{ display: "flex", width: canvasWidth + tileSize }}>
        <div
          ref={canvasLeftElementRef}
          style={{ width: tileSize / 2, backgroundColor: "#eeeeee" }}
        />

        <div
          style={{
            position: "relative",
            width: canvasWidth,
            touchAction: "pinch-zoom",
            verticalAlign: "bottom",
          }}
        >
          <svg
            viewBox={viewBox}
            xmlns="http://www.w3.org/2000/svg"
            style={{ position: "absolute", width: "100%", userSelect: "none" }}
          >
            <Grids canvasWidth={canvasWidth} canvasHeight={canvasHeight} />
          </svg>

          <Canvas
            paths={paths}
            pointerID={pointerID}
            dispatchPaths={dispatchPaths}
            dispatchPointerID={dispatchPointerID}
            viewBox={viewBox}
            xmlns="http://www.w3.org/2000/svg"
            style={{ position: "relative", width: "100%", userSelect: "none" }}
            onContextMenu={handleSVGContextMenu}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          />
        </div>

        <div
          ref={canvasRightElementRef}
          style={{ width: tileSize / 2, backgroundColor: "#eeeeee" }}
        />
      </div>

      <div
        ref={canvasBottomElementRef}
        style={{
          width: canvasWidth + tileSize,
          height: tileSize / 2,
          backgroundColor: "#eeeeee",
        }}
      />

      <button
        type="button"
        style={{
          position: "fixed",
          top: 8,
          left: 8,
          userSelect: "none",
        }}
        onClick={handleShareButtonClick}
      >
        Share
      </button>

      <button
        type="button"
        style={{
          position: "fixed",
          top: 8,
          right: 8,
          userSelect: "none",
        }}
        onClick={handleClearButtonClick}
      >
        Clear
      </button>
    </>
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
              r={1}
              fill={
                cx % tileSize === 0 && cy % tileSize === 0
                  ? "#bdbdbd"
                  : "#eeeeee"
              }
              style={{ userSelect: "none" }}
            />
          );
        })
      )}
    </>
  ));

const Canvas: FunctionComponent<
  {
    paths: Point[][];
    pointerID: number | undefined;
    dispatchPaths: Dispatch<SetStateAction<Point[][]>>;
    dispatchPointerID: Dispatch<SetStateAction<number | undefined>>;
  } & SVGProps<SVGSVGElement>
> = ({ paths, pointerID, dispatchPaths, dispatchPointerID, ...svgProps }) => (
  <svg {...svgProps}>
    {paths.map((path, pathIndex) => (
      <Path
        key={pathIndex}
        path={path}
        index={pathIndex}
        erasable={
          typeof pointerID !== "number" || pathIndex !== paths.length - 1
        }
        dispatchPaths={dispatchPaths}
        dispatchPointerID={dispatchPointerID}
      />
    ))}
  </svg>
);

const Path: FunctionComponent<{
  path: Point[];
  index: number;
  erasable: boolean;
  dispatchPaths: Dispatch<SetStateAction<Point[][]>>;
  dispatchPointerID: Dispatch<SetStateAction<number | undefined>>;
}> = memo(({ path, index, erasable, dispatchPaths, dispatchPointerID }) => {
  const [timeoutID, setTimeoutID] = useState<number>();
  const elementRef = useRef<SVGPathElement>(null);

  const d = path
    .map(
      (point, pointIndex) =>
        `${pointIndex === 0 ? "M" : "L"} ${point.x} ${point.y}`
    )
    .join(" ");

  const handlePointerDown = () =>
    setTimeoutID(
      window.setTimeout(() => {
        dispatchPaths((prevPaths) => [
          ...prevPaths.slice(0, index),
          ...prevPaths.slice(index + 1, -1),
        ]);

        dispatchPointerID(undefined);
      }, 500)
    );

  const handlePointerMove: PointerEventHandler = (event) => {
    if (!elementRef.current) {
      throw new Error("elementRef is null");
    }

    if (
      document
        .elementsFromPoint(event.pageX - scrollX, event.pageY - scrollY)
        .includes(elementRef.current)
    ) {
      return;
    }

    clearTimeout(timeoutID);
  };

  const handlePointerUp = () => clearTimeout(timeoutID);

  return (
    <>
      <path
        d={d}
        fill="none"
        stroke="#000000"
        strokeLinecap="round"
        style={{ userSelect: "none" }}
      />

      {erasable && (
        <path
          ref={elementRef}
          d={d}
          fill="none"
          stroke="rgba(0, 0, 0, 0)"
          strokeLinecap="round"
          strokeWidth={8}
          style={{ userSelect: "none" }}
          onPointerCancel={handlePointerUp}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      )}
    </>
  );
});

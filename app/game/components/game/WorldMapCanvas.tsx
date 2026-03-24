"use client";

import { memo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
  ZoomableGroup,
  useMapContext,
} from "react-simple-maps";
import { countriesByNumericCode } from "@/data/countries";
import type { ClickInfo, GuessResult, D3Projection, ZoomState } from "../../types";
import { GEO_URL, DEFAULT_PROJECTION } from "../../types";
import { toSVGCoords } from "../../utils";

// ─── OceanClickLayer ──────────────────────────────────────────────────────────

function OceanClickLayer({
  onClick,
  disabled,
}: {
  onClick: (info: ClickInfo) => void;
  disabled: boolean;
}) {
  const { projection } = useMapContext() as { projection: D3Projection };

  return (
    <rect
      width={960}
      height={500}
      fill="transparent"
      style={{ cursor: disabled ? "default" : "crosshair" }}
      onClick={(e: React.MouseEvent<SVGRectElement>) => {
        if (disabled) return;
        const { x, y } = toSVGCoords(
          e,
          e.currentTarget as unknown as SVGGraphicsElement
        );
        const coords = projection.invert([x, y]);
        if (!coords) return;
        onClick({
          lng: +coords[0].toFixed(4),
          lat: +coords[1].toFixed(4),
          country: null,
        });
      }}
    />
  );
}

// ─── MapCanvas ────────────────────────────────────────────────────────────────

interface MapCanvasProps {
  onClick: (info: ClickInfo) => void;
  result: GuessResult | null;
  projectionConfig: { scale: number; center: [number, number] };
  mapZoom: ZoomState;
  onZoomChange: (z: ZoomState) => void;
  borderOpacity?: number;
}

const MapCanvas = memo(function MapCanvas({
  onClick,
  result,
  projectionConfig,
  mapZoom,
  onZoomChange,
  borderOpacity = 1,
}: MapCanvasProps) {
  const disabled = result !== null;

  return (
    <ComposableMap
      projection="geoEqualEarth"
      projectionConfig={projectionConfig}
      width={960}
      height={500}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        cursor: disabled ? "default" : "crosshair",
        touchAction: "none",
      }}
    >
      <ZoomableGroup
        center={mapZoom.center}
        zoom={mapZoom.zoom}
        minZoom={1}
        maxZoom={8}
        onMoveEnd={({ coordinates, zoom }) =>
          onZoomChange({ center: coordinates as [number, number], zoom })
        }
      >
        <OceanClickLayer onClick={onClick} disabled={disabled} />

        <Geographies geography={GEO_URL}>
          {({ geographies, projection }: any) =>
            geographies.map((geo: any) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                onClick={(e: React.MouseEvent<SVGPathElement>) => {
                  if (disabled) return;
                  const { x, y } = toSVGCoords(
                    e,
                    e.currentTarget as SVGGraphicsElement
                  );
                  const coords = (projection as D3Projection).invert([x, y]);
                  if (!coords) return;
                  onClick({
                    lng: +coords[0].toFixed(4),
                    lat: +coords[1].toFixed(4),
                    country: countriesByNumericCode.get(Number(geo.id)) ?? null,
                  });
                }}
                style={{
                  default: {
                    fill: "#1a1a1a",
                    stroke: "#2a2a2a",
                    strokeWidth: 0.5,
                    strokeOpacity: borderOpacity,
                    outline: "none",
                    transition: "stroke-opacity 1s ease",
                  },
                  hover: {
                    fill: disabled ? "#1a1a1a" : "#2a2a2a",
                    stroke: disabled ? "#2a2a2a" : "#333333",
                    strokeWidth: 0.5,
                    strokeOpacity: borderOpacity,
                    outline: "none",
                    transition: "stroke-opacity 1s ease",
                  },
                  pressed: {
                    fill: "#1e2a1e",
                    stroke: "#2a3a2a",
                    strokeWidth: 0.75,
                    strokeOpacity: borderOpacity,
                    outline: "none",
                    transition: "stroke-opacity 1s ease",
                  },
                }}
              />
            ))
          }
        </Geographies>

        {result && (
          <>
            {/* Player pin + line — only when there was an actual guess */}
            {!result.timedOut &&
              result.guessLat !== null &&
              result.guessLng !== null && (
                <>
                  <Line
                    from={[result.guessLng, result.guessLat]}
                    to={[result.country.capitalLng, result.country.capitalLat]}
                    stroke="#444444"
                    strokeWidth={1}
                    strokeLinecap="round"
                    strokeDasharray="4,3"
                    style={{
                      strokeDashoffset: "500",
                      animation:
                        "lineGrow 0.4s ease-out 0.4s forwards",
                    }}
                  />
                  <Marker coordinates={[result.guessLng, result.guessLat]}>
                    <g
                      style={{
                        animation:
                          "pinDrop 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
                      }}
                    >
                      <path
                        d="M0,-5 C-2.76,-5 -5,-2.76 -5,0 C-5,2.76 0,7 0,7 C0,7 5,2.76 5,0 C5,-2.76 2.76,-5 0,-5Z"
                        fill="#f87171"
                        stroke="#fff"
                        strokeWidth={1.5}
                      />
                      <text
                        textAnchor="middle"
                        y={-10}
                        style={{
                          fontSize: 9,
                          fill: "#999999",
                          fontFamily: "sans-serif",
                          pointerEvents: "none",
                        }}
                      >
                        You
                      </text>
                    </g>
                  </Marker>
                </>
              )}

            {/* Correct capital pin — always shown */}
            <Marker
              coordinates={[
                result.country.capitalLng,
                result.country.capitalLat,
              ]}
            >
              {/* Pulsing ring */}
              <circle
                r={8}
                fill="none"
                stroke="#4ade80"
                strokeWidth={1.5}
                style={
                  {
                    animation: "pulseRing 1.6s ease-out infinite",
                    transformBox: "fill-box",
                    transformOrigin: "center",
                  } as React.CSSProperties
                }
              />
              {/* Pin — drops 300ms after player pin */}
              <g
                style={{
                  animation:
                    "pinDrop 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.3s both",
                }}
              >
                <path
                  d="M0,-5 C-2.76,-5 -5,-2.76 -5,0 C-5,2.76 0,7 0,7 C0,7 5,2.76 5,0 C5,-2.76 2.76,-5 0,-5Z"
                  fill="#4ade80"
                  stroke="#fff"
                  strokeWidth={1.5}
                />
                <text
                  textAnchor="middle"
                  y={-10}
                  style={{
                    fontSize: 9,
                    fill: "#4ade80",
                    fontFamily: "sans-serif",
                    fontWeight: 600,
                    pointerEvents: "none",
                  }}
                >
                  {result.country.capital}
                </text>
              </g>
            </Marker>
          </>
        )}
      </ZoomableGroup>
    </ComposableMap>
  );
});

export default MapCanvas;

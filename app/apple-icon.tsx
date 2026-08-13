import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          border: "4px solid #f5f5f7",
          fontFamily: "sans-serif",
          fontWeight: 900,
          fontSize: 90,
          color: "#f5f5f7",
        }}
      >
        S
      </div>
    ),
    { ...size }
  );
}

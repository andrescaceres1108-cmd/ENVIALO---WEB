import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
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
          border: "2px solid #f5f5f7",
          borderRadius: 7,
          fontFamily: "sans-serif",
          fontWeight: 700,
          fontSize: 18,
          color: "#f5f5f7",
        }}
      >
        S
      </div>
    ),
    { ...size }
  );
}

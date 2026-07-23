import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#191B1F",
        color: "#FFFDF8",
        fontSize: 36,
        fontWeight: 800,
        fontFamily: "monospace",
        borderBottom: "8px solid #E95D2A",
      }}
    >
      K
    </div>,
    size,
  );
}

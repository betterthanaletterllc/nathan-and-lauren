import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Favicon — deep green square with the couple's monogram in invitation ivory
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
          background: "#244C3A",
          color: "#F1EBDD",
          fontSize: 14,
          fontFamily: "Georgia, serif",
          borderRadius: 6,
        }}
      >
        L&N
      </div>
    ),
    { ...size }
  );
}

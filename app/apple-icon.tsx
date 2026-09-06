import { ImageResponse } from "next/og";

/**
 * iOS ignores SVG manifest icons for the home screen, so the touch icon is
 * rendered to a PNG at build time instead of committing a binary to the repo.
 */

export const size = { width: 180, height: 180 };
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
          background: "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)",
          color: "#ffffff",
          fontSize: 116,
          fontWeight: 700,
        }}
      >
        ₹
      </div>
    ),
    size,
  );
}

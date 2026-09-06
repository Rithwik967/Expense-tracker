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
          background: "#091426",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 78,
              height: 28,
              background: "#fbf8fa",
              borderRadius: 8,
              marginBottom: -10,
            }}
          />
          <div
            style={{
              width: 108,
              height: 74,
              background: "#6cf8bb",
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingRight: 18,
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                background: "#091426",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  background: "#c88000",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

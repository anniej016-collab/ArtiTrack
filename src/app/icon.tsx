import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/**
 * Generated rather than committed as a file, so the home-screen icon can't
 * drift away from the app's own colours.
 */
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
          background: "linear-gradient(135deg, #a855f7, #ec4899)",
        }}
      >
        <div
          style={{
            width: 300,
            height: 300,
            borderRadius: 999,
            background: "#09090f",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 78,
              height: 78,
              borderRadius: 999,
              background: "linear-gradient(135deg, #a855f7, #ec4899)",
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}

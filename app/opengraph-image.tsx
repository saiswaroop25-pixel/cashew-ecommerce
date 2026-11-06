import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = "Premium cashews";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default social-sharing preview (WhatsApp, Facebook, X...). Brand colours, no photo, no invented claims. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "#F8F3E9",
          color: "#344B35",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 8, color: "#C5A46D", textTransform: "uppercase" }}>Premium cashews</div>
        <div style={{ display: "flex", fontSize: 86, lineHeight: 1.1, marginTop: 24 }}>{site.name}</div>
        <div style={{ display: "flex", marginTop: 32, height: 6, width: 160, background: "#C5A46D" }} />
        <div style={{ display: "flex", fontSize: 34, marginTop: 32, color: "#795438" }}>Cashews for your kitchen and your business</div>
      </div>
    ),
    size,
  );
}

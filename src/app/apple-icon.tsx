import { ImageResponse } from "next/og";

import { IconArtwork, faviconMark } from "./icon";

/**
 * The home-screen icon, for iOS and for anything else that reads
 * `apple-touch-icon`.
 *
 * Opaque PNG at 180x180, which is the size the platform asks for, and the same
 * two-edged mark the tab icon uses — imported rather than redrawn so the palette
 * and the geometry can only have one definition. The keyline earns its keep here
 * more than anywhere else: iOS composites this on an arbitrary wallpaper, which
 * can be lighter than any of the three site themes, and the carbon edge is what
 * keeps the plate from dissolving into it.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return new ImageResponse(<IconArtwork mark={faviconMark(size.width)} />, { ...size });
}

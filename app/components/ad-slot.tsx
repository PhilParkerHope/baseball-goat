// A reserved space for an ad. Ads are off for now, so this shows nothing and
// takes up no room. When the site is approved, set ADS_ENABLED to true and put
// the ad network's tag inside the box below; every slot on the site lights up.
const ADS_ENABLED = false;

const SIZES = {
  rectangle: { width: 300, height: 250 }, // fits phones and sidebars
  leaderboard: { width: 728, height: 90 }, // wide screens only
};

export function AdSlot({ size, className = "" }: { size: keyof typeof SIZES; className?: string }) {
  if (!ADS_ENABLED) return null;
  // A fixed size, so the page doesn't jump when the ad loads.
  return <div aria-hidden className={`mx-auto max-w-full ${className}`} style={SIZES[size]} />;
}

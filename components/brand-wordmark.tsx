// Text placeholder for the insurer logo box on an Agent Landing Page, shown
// whenever no SuperAdmin has uploaded a real logo yet (Settings > Branding).
// Colours are fixed to the Great Eastern Takaful brand rather than the app's
// own navy/red tokens (which are a shade darker) -- this has to read right
// sitting in the same white box the uploaded logo would otherwise fill.
// Shared between the public agent-view page and its Settings > Branding
// preview so the two never drift apart.
export function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`text-center leading-none ${className}`}>
      <div className="text-[15px] font-extrabold tracking-tight" style={{ color: "#0f2540" }}>
        Great Eastern
      </div>
      <div className="mt-[3px] text-[13px] font-bold tracking-[0.14em]" style={{ color: "#D23B44" }}>
        TAKAFUL
      </div>
    </div>
  );
}

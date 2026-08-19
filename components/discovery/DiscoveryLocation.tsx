export default function DiscoveryLocation({
  cityName,
}: {
  cityName: string | null;
}) {
  if (!cityName) return null;

  return (
    <div style={{ padding: "0 20px", marginBottom: 24 }}>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 2 }}>Events in</p>
      <p style={{ fontSize: 18, fontWeight: 600, color: "#171717" }}>
        {cityName}
      </p>
    </div>
  );
}

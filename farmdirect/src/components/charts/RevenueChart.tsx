import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function RevenueChart({ data }: { data: { day: string; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#154212" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#154212" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e2e2" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#42493e" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "#42493e" }} axisLine={false} tickLine={false} width={50} />
        <Tooltip
          formatter={(value) => [`₹${value}`, "Revenue"]}
          contentStyle={{ borderRadius: 8, borderColor: "#c2c9bb", fontSize: 13 }}
        />
        <Area type="monotone" dataKey="revenue" stroke="#154212" strokeWidth={2} fill="url(#revenueFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

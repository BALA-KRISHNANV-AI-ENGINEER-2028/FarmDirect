import { Container, SectionHeading } from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import StatCard from "../../components/ui/StatCard";
import RevenueChart from "../../components/charts/RevenueChart";
import { revenueTrend, bestSellers } from "../../data/orders";
import { formatINR } from "../../utils/format";

export default function FarmerAnalytics() {
  const maxRevenue = Math.max(...bestSellers.map((b) => b.revenue));

  return (
    <Container className="py-stack-lg">
      <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">Analytics</h1>
      <p className="text-label-sm text-on-surface-variant mb-8">Demo data — analytics aren't part of the backend yet.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="Revenue (30d)" value={formatINR(42230)} icon="account_balance_wallet" trend="+8.2%" />
        <StatCard label="Orders (30d)" value="86" icon="receipt_long" trend="+5.4%" />
        <StatCard label="Products Sold" value="870 kg" icon="eco" trend="+11%" />
        <StatCard label="New Customers" value="24" icon="group" trend="+3" />
      </div>

      <div className="bg-surface-bright rounded-xl border border-surface-variant p-6 mb-10">
        <SectionHeading title="Sales Trends" />
        <RevenueChart data={revenueTrend} />
      </div>

      <div className="grid lg:grid-cols-2 gap-gutter">
        <div className="bg-surface-bright rounded-xl border border-surface-variant p-6">
          <h2 className="font-display text-headline-sm text-on-surface mb-5">Best-Selling Products</h2>
          <div className="space-y-4">
            {bestSellers.map((b) => (
              <div key={b.name}>
                <div className="flex justify-between mb-1">
                  <span className="text-label-md font-semibold text-on-surface">{b.name}</span>
                  <span className="text-label-md text-on-surface-variant">{formatINR(b.revenue)}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${(b.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
                <p className="text-label-sm text-on-surface-variant mt-1">{b.unitsSold} units sold</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-bright rounded-xl border border-surface-variant p-6">
          <h2 className="font-display text-headline-sm text-on-surface mb-5">Product Performance</h2>
          <div className="space-y-3">
            {[
              { label: "Repeat Purchase Rate", value: "64%" },
              { label: "Average Order Value", value: formatINR(490) },
              { label: "Customer Growth", value: "+18% MoM" },
              { label: "Avg. Rating", value: "4.8 / 5" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-surface-variant last:border-0">
                <span className="text-body-md text-on-surface-variant flex items-center gap-2">
                  <Icon name="insights" size={16} className="text-primary" />
                  {row.label}
                </span>
                <span className="font-semibold text-on-surface">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}

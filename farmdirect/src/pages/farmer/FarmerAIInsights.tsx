import { Container } from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Badge from "../../components/ui/Badge";
import { aiInsights } from "../../data/orders";

const typeLabels: Record<string, string> = {
  demand: "Demand Forecast",
  price: "Price Recommendation",
  inventory: "Inventory Alert",
  sales: "Sales Insight",
};

export default function FarmerAIInsights() {
  return (
    <Container className="py-stack-lg">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-full bg-tertiary-fixed flex items-center justify-center">
          <Icon name="auto_awesome" size={22} className="text-on-tertiary-fixed-variant" />
        </div>
        <div>
          <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface">FarmDirect AI</h1>
          <p className="text-body-md text-on-surface-variant">Your agricultural assistant — insights tailored to your farm.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-gutter mt-8">
        {aiInsights.map((insight) => (
          <div key={insight.id} className="bg-surface-bright rounded-xl border border-surface-variant p-6">
            <div className="flex items-center justify-between mb-4">
              <Badge variant="gold" icon={<Icon name={insight.icon} size={14} />}>
                {typeLabels[insight.type]}
              </Badge>
            </div>
            <h2 className="font-display text-headline-sm text-on-surface mb-2">{insight.title}</h2>
            <p className="text-body-lg text-on-surface-variant">{insight.message}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 bg-surface-container-low rounded-xl border border-outline-variant p-6 flex items-start gap-4">
        <Icon name="info" className="text-primary mt-0.5" size={20} />
        <p className="text-body-md text-on-surface-variant">
          FarmDirect AI insights are generated from marketplace trends, weather, and your sales history. This is a
          preview experience — insights will become more precise as your sales history grows.
        </p>
      </div>
    </Container>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Container, SectionHeading } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Icon from "../../components/ui/Icon";
import Badge from "../../components/ui/Badge";
import ProductCard from "../../components/products/ProductCard";
import FarmCard from "../../components/farms/FarmCard";
import { categories } from "../../data/categories";
import { fetchProducts } from "../../services/productsApi";
import { fetchFarms } from "../../services/farmsApi";
import type { Farm, Product } from "../../types";

const howItWorks = [
  { icon: "search", title: "Discover", desc: "Browse fresh harvests from verified farms near you." },
  { icon: "shopping_basket", title: "Order", desc: "Add products to your basket and check out securely." },
  { icon: "agriculture", title: "Harvested Fresh", desc: "Your farmer picks and prepares your order same-day." },
  { icon: "local_shipping", title: "Delivered", desc: "Track your order from farm to your doorstep." },
];

export default function Home() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [nearbyFarms, setNearbyFarms] = useState<Farm[]>([]);
  const [storyFarm, setStoryFarm] = useState<Farm | null>(null);

  useEffect(() => {
    fetchProducts({ sort: "rating", limit: 12 })
      .then(({ products }) => setFeatured(products.filter((p) => p.harvestedToday).slice(0, 3)))
      .catch(() => setFeatured([]));
    fetchFarms({ verified_only: true, limit: 4 })
      .then(({ farms }) => {
        setNearbyFarms(farms.slice(0, 3));
        setStoryFarm(farms[0] ?? null);
      })
      .catch(() => setNearbyFarms([]));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg md:py-16">
        <div className="rounded-xl overflow-hidden relative min-h-[60vh] flex items-center bg-surface-container-low ambient-shadow">
          <img
            className="absolute inset-0 w-full h-full object-cover"
            alt="Farmer harvesting produce in a sunlit field"
            src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1600&q=80"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
          <div className="relative z-10 p-8 md:p-16 max-w-2xl text-on-primary">
            <h1 className="font-display text-display-lg-mobile md:text-display-lg mb-6">
              Fresh From the Farm. Direct to You.
            </h1>
            <p className="text-body-lg mb-8 opacity-90">
              Buy freshly cultivated products directly from farmers near you. Know your farmer, discover fresh
              harvests, and support local agriculture.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/marketplace">
                <Button size="lg">Explore Fresh Products</Button>
              </Link>
              <Link to="/farms">
                <Button size="lg" variant="outline" className="border-on-primary text-on-primary hover:bg-on-primary/10">
                  Find Nearby Farms
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <Container className="py-stack-lg">
        <SectionHeading title="Shop by Category" />
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {categories.map((c) => (
            <Link
              key={c.name}
              to={`/marketplace?category=${encodeURIComponent(c.name)}`}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-bright border border-surface-variant hover:border-primary-fixed-dim hover:-translate-y-0.5 transition-all"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${c.color}1A` }}
              >
                <Icon name={c.icon} size={22} className="" />
              </div>
              <span className="text-label-sm font-semibold text-on-surface text-center">{c.name}</span>
            </Link>
          ))}
        </div>
      </Container>

      {/* Freshly Harvested Today */}
      <Container className="py-stack-lg">
        <SectionHeading title="Freshly Harvested Today" action={{ label: "View All", href: "/marketplace" }} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </Container>

      {/* Nearby Farms */}
      <Container className="py-stack-lg">
        <SectionHeading title="Nearby Farms" action={{ label: "View All", href: "/farms" }} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {nearbyFarms.map((f) => (
            <FarmCard key={f.id} farm={f} />
          ))}
        </div>
      </Container>

      {/* How FarmDirect Works */}
      <Container className="py-stack-lg">
        <SectionHeading title="How FarmDirect Works" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
          {howItWorks.map((s, i) => (
            <div key={s.title} className="text-center p-5">
              <div className="w-14 h-14 rounded-full bg-primary-container/15 flex items-center justify-center mx-auto mb-4">
                <Icon name={s.icon} size={26} className="text-primary" />
              </div>
              <p className="text-label-sm text-outline mb-1">Step {i + 1}</p>
              <h3 className="font-display text-headline-sm text-on-surface mb-1">{s.title}</h3>
              <p className="text-body-md text-on-surface-variant">{s.desc}</p>
            </div>
          ))}
        </div>
      </Container>

      {/* Farmer Story */}
      {storyFarm && (
        <Container className="py-stack-lg">
          <div className="rounded-xl bg-surface-container-low border border-surface-variant overflow-hidden grid md:grid-cols-2 ambient-shadow">
            <img
              src={storyFarm.image || "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=900&q=80"}
              alt={storyFarm.name}
              className="w-full h-64 md:h-full object-cover"
            />
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <Badge variant="gold" icon={<Icon name="verified" size={14} />} className="w-fit mb-4">
                Farmer Story
              </Badge>
              <h2 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface mb-3">
                "Every crate tells the story of the soil it grew from."
              </h2>
              <p className="text-body-lg text-on-surface-variant mb-6">{storyFarm.description}</p>
              <Link to={`/farmers/${storyFarm.farmerId}`}>
                <Button variant="outline" className="w-fit">
                  Meet the Farmer
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      )}

      {/* Trust Section */}
      <Container className="py-stack-lg md:pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {[
            { icon: "verified", title: "Verified Farmers", desc: "Every farm is vetted for quality and authenticity." },
            { icon: "eco", title: "100% Traceable", desc: "Know exactly which farm and farmer grew your food." },
            { icon: "handshake", title: "Fair to Farmers", desc: "No middlemen — farmers keep more of every rupee." },
          ].map((t) => (
            <div key={t.title} className="flex items-start gap-4 p-6 bg-surface-bright rounded-xl border border-surface-variant">
              <div className="w-11 h-11 rounded-full bg-tertiary-fixed flex items-center justify-center shrink-0">
                <Icon name={t.icon} size={20} className="text-on-tertiary-fixed-variant" />
              </div>
              <div>
                <h3 className="font-display text-headline-sm text-on-surface mb-1">{t.title}</h3>
                <p className="text-body-md text-on-surface-variant">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}

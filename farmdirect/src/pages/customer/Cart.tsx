import { Link, useNavigate } from "react-router-dom";
import { Container } from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { useCart } from "../../hooks/useCart";
import { formatINR } from "../../utils/format";

export default function Cart() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();
  const navigate = useNavigate();

  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    acc[item.farmName] = acc[item.farmName] || [];
    acc[item.farmName].push(item);
    return acc;
  }, {});

  const deliveryFee = items.length > 0 ? 25 : 0;
  const total = subtotal + deliveryFee;

  if (items.length === 0) {
    return (
      <Container className="py-16">
        <EmptyState
          icon="shopping_basket"
          title="Your basket is empty"
          description="Browse fresh harvests from local farms and add them to your basket."
          action={
            <Link to="/marketplace">
              <Button>Explore Marketplace</Button>
            </Link>
          }
        />
      </Container>
    );
  }

  return (
    <Container className="py-stack-lg">
      <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface mb-8">Your Basket</h1>
      <div className="grid lg:grid-cols-[1fr_360px] gap-gutter items-start">
        <div className="space-y-8">
          {Object.entries(grouped).map(([farmName, farmItems]) => (
            <div key={farmName}>
              <h2 className="font-display text-headline-sm text-on-surface mb-3 flex items-center gap-2">
                <Icon name="storefront" size={20} className="text-primary" />
                {farmName}
              </h2>
              <div className="bg-surface-bright rounded-xl border border-surface-variant divide-y divide-surface-variant">
                {farmItems.map((item) => (
                    <div key={item.productId} className="flex items-center gap-4 p-4">
                      <img src={item.image} alt={item.name} className="w-20 h-20 rounded-lg object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <Link to={`/products/${item.productId}`} className="font-semibold text-on-surface hover:text-primary truncate block">
                          {item.name}
                        </Link>
                        <p className="text-label-sm text-on-surface-variant">₹{item.price} / {item.unit}</p>
                      </div>
                      <div className="flex items-center border border-surface-variant rounded-lg">
                        <button
                          className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          <Icon name="remove" size={16} />
                        </button>
                        <span className="w-8 text-center text-label-md font-semibold">{item.quantity}</span>
                        <button
                          className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          <Icon name="add" size={16} />
                        </button>
                      </div>
                      <span className="w-20 text-right font-semibold text-on-surface">
                        {formatINR(item.price * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeItem(item.productId)}
                        aria-label="Remove item"
                        className="text-on-surface-variant hover:text-error"
                      >
                        <Icon name="delete" size={20} />
                      </button>
                    </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-surface-bright rounded-xl border border-surface-variant p-6 sticky top-24">
          <h2 className="font-display text-headline-sm text-on-surface mb-4">Order Summary</h2>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-body-md text-on-surface-variant">
              <span>Subtotal</span>
              <span>{formatINR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-body-md text-on-surface-variant">
              <span>Delivery Fee</span>
              <span>{formatINR(deliveryFee)}</span>
            </div>
          </div>
          <div className="flex justify-between font-semibold text-on-surface text-headline-sm pt-4 border-t border-surface-variant mb-6">
            <span>Total</span>
            <span>{formatINR(total)}</span>
          </div>
          <Button fullWidth size="lg" onClick={() => navigate("/checkout")}>
            Proceed to Checkout
          </Button>
          <Link to="/marketplace" className="block text-center text-label-md font-semibold text-primary mt-4 hover:underline">
            Continue Shopping
          </Link>
        </div>
      </div>
    </Container>
  );
}

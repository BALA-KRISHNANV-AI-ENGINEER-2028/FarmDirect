import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Container } from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import { Field, Input, Select, Textarea } from "../../components/ui/Input";
import Skeleton from "../../components/ui/Skeleton";
import { categories } from "../../data/categories";
import { fetchMyFarms } from "../../services/farmsApi";
import { createProduct, updateProduct, fetchProduct } from "../../services/productsApi";
import { ApiError } from "../../services/apiClient";
import type { Farm } from "../../types";

export default function AddProduct() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [farms, setFarms] = useState<Farm[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState("");

  const [farmId, setFarmId] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [farmingMethod, setFarmingMethod] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("kg");
  const [stock, setStock] = useState("");
  const [harvestDate, setHarvestDate] = useState("");

  useEffect(() => {
    fetchMyFarms().then((list) => {
      setFarms(list);
      if (list[0]) setFarmId(list[0].id);
    });
    if (id) {
      fetchProduct(id).then((p) => {
        setName(p.name);
        setCategory(p.category);
        setFarmingMethod(p.farmingMethod);
        setDescription(p.description);
        setPrice(String(p.price));
        setUnit(p.unit);
        setHarvestDate(p.harvestDate ? p.harvestDate.slice(0, 10) : "");
        setImages(p.images);
        setFarmId(p.farmId);
        setLoadingInitial(false);
      });
    } else {
      setLoadingInitial(false);
    }
  }, [id]);

  const addImageUrl = () => {
    if (imageUrlInput.trim()) {
      setImages((prev) => [...prev, imageUrlInput.trim()]);
      setImageUrlInput("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isEdit && id) {
        await updateProduct(id, {
          name,
          category: category || undefined,
          farmingMethod: farmingMethod || undefined,
          description: description || undefined,
          price: Number(price),
          unit,
          harvestDate: harvestDate || undefined,
          images,
        });
      } else {
        await createProduct({
          farmId,
          name,
          category: category || undefined,
          farmingMethod: farmingMethod || undefined,
          description: description || undefined,
          price: Number(price),
          unit,
          stock: Number(stock),
          harvestDate: harvestDate || undefined,
          images,
        });
      }
      navigate("/farmer/products");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <Container className="py-stack-lg max-w-3xl">
        <Skeleton className="h-8 w-64 mb-8" />
        <Skeleton className="h-96 w-full" />
      </Container>
    );
  }

  return (
    <Container className="py-stack-lg max-w-3xl">
      <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">
        {isEdit ? "Edit Product" : "Add New Product"}
      </h1>
      <p className="text-body-md text-on-surface-variant mb-8">
        {isEdit ? "Update this product's details." : "List a fresh product for customers to discover."}
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="bg-surface-bright rounded-xl border border-surface-variant p-6 space-y-5">
          <h2 className="font-display text-headline-sm text-on-surface">Basic Information</h2>
          {!isEdit && farms.length > 1 && (
            <Field label="Farm" required>
              <Select value={farmId} onChange={(e) => setFarmId(e.target.value)}>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Product Name" required>
            <Input placeholder="e.g. Heirloom Tomatoes" required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Category" required>
              <Select value={category} onChange={(e) => setCategory(e.target.value)} required>
                <option value="" disabled>Select a category</option>
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Farming Method" required>
              <Select value={farmingMethod} onChange={(e) => setFarmingMethod(e.target.value)} required>
                <option value="" disabled>Select a method</option>
                <option>Organic</option>
                <option>Natural Farming</option>
                <option>Pesticide-Free</option>
                <option>Conventional</option>
              </Select>
            </Field>
          </div>
          <Field label="Description">
            <Textarea rows={4} placeholder="Describe your product — flavor, freshness, growing method..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </section>

        <section className="bg-surface-bright rounded-xl border border-surface-variant p-6 space-y-5">
          <h2 className="font-display text-headline-sm text-on-surface">Pricing & Stock</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Price (₹)" required>
              <Input type="number" min={0} step="0.01" placeholder="0" required value={price} onChange={(e) => setPrice(e.target.value)} />
            </Field>
            <Field label="Unit" required>
              <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value="kg">kg</option>
                <option value="bunch">bunch</option>
                <option value="dozen">dozen</option>
                <option value="piece">piece</option>
                <option value="liter">liter</option>
              </Select>
            </Field>
            {!isEdit && (
              <Field label="Available Quantity" required>
                <Input type="number" min={0} placeholder="0" required value={stock} onChange={(e) => setStock(e.target.value)} />
              </Field>
            )}
          </div>
          <Field label="Harvest Date">
            <Input type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} />
          </Field>
          {isEdit && (
            <p className="text-label-sm text-on-surface-variant">
              To change stock, use the <a href="/farmer/inventory" className="text-primary font-semibold hover:underline">Inventory</a> page.
            </p>
          )}
        </section>

        <section className="bg-surface-bright rounded-xl border border-surface-variant p-6 space-y-5">
          <h2 className="font-display text-headline-sm text-on-surface">Images</h2>
          <div className="flex gap-2">
            <Input
              placeholder="Paste an image URL"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addImageUrl();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addImageUrl}>Add</Button>
          </div>
          {images.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {images.map((img, i) => (
                <div key={img + i} className="w-24 h-24 rounded-lg overflow-hidden relative">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 w-5 h-5 bg-surface-bright/90 rounded-full flex items-center justify-center"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {error && <p className="text-label-sm text-error">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? "Saving..." : isEdit ? "Save Changes" : "Publish Product"}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => navigate("/farmer/products")}>
            Cancel
          </Button>
        </div>
      </form>
    </Container>
  );
}

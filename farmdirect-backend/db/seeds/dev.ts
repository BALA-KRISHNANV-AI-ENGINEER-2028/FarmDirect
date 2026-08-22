/**
 * Development seed data — mirrors the frontend's mock data
 * (src/data/farmers.ts, farms.ts, products.ts, orders.ts) so the first API
 * integration pass (Phase H) produces near-identical UI output to what the
 * mocks currently render, making the swap easy to verify visually.
 *
 * NOT for production use. All accounts use the same dev-only password.
 * Run with: npm run seed
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import { pool, withTransaction } from "../../src/config/database";
import { env } from "../../src/config/env";

const DEV_PASSWORD = "Password123!";

async function seed() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, env.BCRYPT_COST);

  await withTransaction(async (client) => {
    console.log("Clearing existing dev data...");
    // Truncate in dependency order (children first) so this script is
    // re-runnable without manually dropping/recreating the database.
    await client.query(`
      TRUNCATE TABLE
        notifications, notification_preferences,
        product_favorites, farm_favorites, farmer_favorites,
        product_reviews, farm_reviews, farmer_reviews,
        order_status_events, order_items, orders,
        cart_items, addresses,
        inventory_movements, product_images, products,
        farm_images, farms,
        password_reset_tokens, refresh_tokens,
        farmer_profiles, customer_profiles, users
      RESTART IDENTITY CASCADE;
    `);

    // --- Farmers + their users -------------------------------------------
    console.log("Seeding farmers...");
    const farmerSeeds = [
      {
        email: "ravi.kumar@farmdirect.dev",
        fullName: "Ravi Kumar",
        avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80",
        experienceYears: 14,
        verified: true,
        story:
          "Ravi has been farming his family's land for 14 years, transitioning fully to organic methods in 2015. He believes fresh, honest food builds stronger communities and works closely with 40+ households every week.",
      },
      {
        email: "sunita.devi@farmdirect.dev",
        fullName: "Sunita Devi",
        avatarUrl: "https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=400&q=80",
        experienceYears: 9,
        verified: true,
        story:
          "Sunita runs Green Acres with her two sons, specializing in leafy greens grown using natural farming methods with zero synthetic inputs.",
      },
      {
        email: "manoj.patil@farmdirect.dev",
        fullName: "Manoj Patil",
        avatarUrl: "https://images.unsplash.com/photo-1594751543129-6701ad444259?w=400&q=80",
        experienceYears: 21,
        verified: true,
        story:
          "A third-generation farmer, Manoj combines traditional wisdom with modern soil testing to grow some of the region's best-loved tomatoes and peppers.",
      },
      {
        email: "lakshmi.reddy@farmdirect.dev",
        fullName: "Lakshmi Reddy",
        avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80",
        experienceYears: 11,
        verified: false,
        story:
          "Lakshmi grows heritage grains and pulses using rain-fed, pesticide-free methods passed down from her grandparents.",
      },
    ] as const;

    const farmerIds: Record<string, string> = {};
    for (const f of farmerSeeds) {
      const userRes = await client.query<{ id: string }>(
        `INSERT INTO users (email, password_hash, role, phone)
         VALUES ($1, $2, 'farmer', $3) RETURNING id`,
        [f.email, passwordHash, "+91 9" + Math.floor(100000000 + Math.random() * 899999999)]
      );
      const userId = userRes.rows[0].id;
      farmerIds[f.fullName] = userId;

      await client.query(
        `INSERT INTO farmer_profiles (user_id, full_name, avatar_url, experience_years, verified, story, rating_cached, review_count_cached)
         VALUES ($1, $2, $3, $4, $5, $6, 0, 0)`,
        [userId, f.fullName, f.avatarUrl, f.experienceYears, f.verified, f.story]
      );
      await client.query(`INSERT INTO notification_preferences (user_id) VALUES ($1)`, [userId]);
    }

    // --- Farms -------------------------------------------------------------
    console.log("Seeding farms...");
    const farmSeeds = [
      {
        key: "farm1",
        farmerName: "Ravi Kumar",
        name: "Ravi's Organic Farm",
        description:
          "A 12-acre certified-organic farm on the outskirts of Nashik, growing heirloom vegetables using regenerative soil practices.",
        category: "Vegetables",
        sizeAcres: 12,
        farmingMethod: "Organic",
        yearsActive: 14,
        verified: true,
        addressLine: "Nashik, Maharashtra",
        lat: 19.9975,
        lng: 73.7898,
        gallery: [
          "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&q=80",
          "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=800&q=80",
          "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80",
          "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80",
        ],
      },
      {
        key: "farm2",
        farmerName: "Sunita Devi",
        name: "Green Acres",
        description: "Small-scale leafy green specialists using zero-input natural farming on 6 acres.",
        category: "Vegetables",
        sizeAcres: 6,
        farmingMethod: "Natural Farming",
        yearsActive: 9,
        verified: true,
        addressLine: "Hosur, Tamil Nadu",
        lat: 12.7409,
        lng: 77.8253,
        gallery: [
          "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80",
          "https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?w=800&q=80",
        ],
      },
      {
        key: "farm3",
        farmerName: "Manoj Patil",
        name: "Sunrise Valley Farm",
        description: "A third-generation family farm known for its tomatoes, peppers, and warm hospitality.",
        category: "Vegetables",
        sizeAcres: 22,
        farmingMethod: "Pesticide-Free",
        yearsActive: 21,
        verified: true,
        addressLine: "Pune, Maharashtra",
        lat: 18.5204,
        lng: 73.8567,
        gallery: [
          "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=800&q=80",
          "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80",
        ],
      },
      {
        key: "farm4",
        farmerName: "Lakshmi Reddy",
        name: "Miller's Field",
        description: "A rain-fed grain and pulse farm growing heritage varieties across 30 acres.",
        category: "Grains",
        sizeAcres: 30,
        farmingMethod: "Pesticide-Free",
        yearsActive: 11,
        verified: false,
        addressLine: "Warangal, Telangana",
        lat: 17.9689,
        lng: 79.5941,
        gallery: [
          "https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?w=800&q=80",
          "https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=800&q=80",
        ],
      },
    ] as const;

    const farmIds: Record<string, string> = {};
    for (const f of farmSeeds) {
      const res = await client.query<{ id: string }>(
        `INSERT INTO farms
           (farmer_id, name, description, category, size_acres, farming_method, years_active, verified, address_line, location, rating_cached, review_count_cached)
         VALUES
           ($1, $2, $3, $4, $5, $6, $7, $8, $9, ST_SetSRID(ST_MakePoint($10, $11), 4326)::geography, 0, 0)
         RETURNING id`,
        [
          farmerIds[f.farmerName],
          f.name,
          f.description,
          f.category,
          f.sizeAcres,
          f.farmingMethod,
          f.yearsActive,
          f.verified,
          f.addressLine,
          f.lng,
          f.lat,
        ]
      );
      farmIds[f.key] = res.rows[0].id;

      for (let i = 0; i < f.gallery.length; i++) {
        await client.query(
          `INSERT INTO farm_images (farm_id, url, sort_order) VALUES ($1, $2, $3)`,
          [farmIds[f.key], f.gallery[i], i]
        );
      }
    }

    // --- Products ------------------------------------------------------------
    console.log("Seeding products...");
    const productSeeds = [
      { key: "p1", farm: "farm1", name: "Heirloom Tomatoes", category: "Vegetables", price: 38, unit: "kg", farmingMethod: "Organic", harvestDate: "2026-08-10", stock: 120, image: "https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=800&q=80", description: "Sun-ripened heirloom tomatoes grown without synthetic pesticides, hand-picked at peak ripeness for maximum flavor." },
      { key: "p2", farm: "farm1", name: "Dinosaur Kale", category: "Vegetables", price: 45, unit: "bunch", farmingMethod: "Organic", harvestDate: "2026-08-09", stock: 40, image: "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=800&q=80", description: "Deep green, crinkled leaves with a rich, earthy flavor — perfect for sautéing or salads." },
      { key: "p3", farm: "farm2", name: "Organic Baby Spinach", category: "Vegetables", price: 30, unit: "bunch", farmingMethod: "Natural Farming", harvestDate: "2026-08-10", stock: 8, image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&q=80", description: "Tender baby spinach leaves, washed and bundled the same morning they're picked." },
      { key: "p4", farm: "farm3", name: "Vine Tomatoes", category: "Vegetables", price: 34, unit: "kg", farmingMethod: "Pesticide-Free", harvestDate: "2026-08-08", stock: 200, image: "https://images.unsplash.com/photo-1561136594-7f68413baa99?w=800&q=80", description: "Classic red vine tomatoes with a balanced sweet-tart flavor, great for everyday cooking." },
      { key: "p5", farm: "farm4", name: "Heritage Wheat Grains", category: "Grains", price: 55, unit: "kg", farmingMethod: "Pesticide-Free", harvestDate: "2026-07-20", stock: 500, image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&q=80", description: "Stone-ground heritage wheat, rain-fed and free of synthetic inputs." },
      { key: "p6", farm: "farm1", name: "Purple Brinjal", category: "Vegetables", price: 28, unit: "kg", farmingMethod: "Organic", harvestDate: "2026-08-09", stock: 65, image: "https://images.unsplash.com/photo-1613743983303-b3e89f8a2b80?w=800&q=80", description: "Glossy purple brinjal, firm and seed-light — ideal for roasting or curries." },
      { key: "p7", farm: "farm2", name: "Fresh Coriander", category: "Vegetables", price: 15, unit: "bunch", farmingMethod: "Natural Farming", harvestDate: "2026-08-10", stock: 0, image: "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=800&q=80", description: "Aromatic, fragrant coriander bunches picked fresh each morning." },
      { key: "p8", farm: "farm3", name: "Green Bell Peppers", category: "Vegetables", price: 42, unit: "kg", farmingMethod: "Pesticide-Free", harvestDate: "2026-08-09", stock: 90, image: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=800&q=80", description: "Crisp, glossy green bell peppers with thick walls and a mild sweetness." },
      { key: "p9", farm: "farm3", name: "Purple Eggplants", category: "Vegetables", price: 32, unit: "kg", farmingMethod: "Pesticide-Free", harvestDate: "2026-08-07", stock: 3, image: "https://images.unsplash.com/photo-1600231615692-4d0e2a8b8daf?w=800&q=80", description: "Slender purple eggplants with tender flesh, perfect for grilling." },
      { key: "p10", farm: "farm4", name: "Roasted Groundnuts", category: "Nuts & Oils", price: 60, unit: "kg", farmingMethod: "Pesticide-Free", harvestDate: "2026-07-15", stock: 150, image: "https://images.unsplash.com/photo-1567892737950-30c4db37cd89?w=800&q=80", description: "Sun-dried and lightly roasted groundnuts grown on rain-fed soil." },
    ] as const;

    const productIds: Record<string, string> = {};
    for (const p of productSeeds) {
      const availability = p.stock === 0 ? "Out of Stock" : p.stock <= 10 ? "Low Stock" : "In Stock";
      const res = await client.query<{ id: string }>(
        `INSERT INTO products
           (farm_id, name, category, description, price, unit, farming_method, harvest_date, stock, availability, rating_cached, review_count_cached)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, 0)
         RETURNING id`,
        [
          farmIds[p.farm],
          p.name,
          p.category,
          p.description,
          p.price,
          p.unit,
          p.farmingMethod,
          p.harvestDate,
          p.stock,
          availability,
        ]
      );
      productIds[p.key] = res.rows[0].id;
      await client.query(`INSERT INTO product_images (product_id, url, sort_order) VALUES ($1, $2, 0)`, [
        productIds[p.key],
        p.image,
      ]);
      // Initial harvest movement so inventory_movements isn't empty on a fresh seed.
      await client.query(
        `INSERT INTO inventory_movements (product_id, change, reason, note) VALUES ($1, $2, 'harvest', 'Initial seed stock')`,
        [productIds[p.key], p.stock]
      );
    }

    // --- Customer -----------------------------------------------------------
    console.log("Seeding customer...");
    const customerUserRes = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, role, phone) VALUES ($1, $2, 'customer', $3) RETURNING id`,
      ["alex.johnson@farmdirect.dev", passwordHash, "+91 9876543210"]
    );
    const customerId = customerUserRes.rows[0].id;
    await client.query(
      `INSERT INTO customer_profiles (user_id, full_name, avatar_url, date_of_birth)
       VALUES ($1, $2, $3, $4)`,
      [customerId, "Alex Johnson", "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&q=80", "1994-03-12"]
    );
    await client.query(`INSERT INTO notification_preferences (user_id) VALUES ($1)`, [customerId]);

    const addressRes = await client.query<{ id: string }>(
      `INSERT INTO addresses (customer_id, label, full_name, phone, address_line, city, state, postal_code, is_default)
       VALUES ($1, 'Home', 'Alex Johnson', '+91 9876543210', '204, Lotus Residency, Baner Road', 'Pune', 'Maharashtra', '411045', true)
       RETURNING id`,
      [customerId]
    );
    const addressId = addressRes.rows[0].id;

    // --- Favorites (matching the frontend's default localStorage state) -----
    console.log("Seeding favorites...");
    await client.query(`INSERT INTO product_favorites (customer_id, product_id) VALUES ($1, $2), ($1, $3)`, [
      customerId,
      productIds.p1,
      productIds.p4,
    ]);
    await client.query(`INSERT INTO farm_favorites (customer_id, farm_id) VALUES ($1, $2)`, [
      customerId,
      farmIds.farm1,
    ]);
    await client.query(`INSERT INTO farmer_favorites (customer_id, farmer_id) VALUES ($1, $2)`, [
      customerId,
      farmerIds["Ravi Kumar"],
    ]);

    // --- Reviews (matching src/data/products.ts mock reviews) ---------------
    console.log("Seeding reviews...");
    await client.query(
      `INSERT INTO product_reviews (customer_id, product_id, rating, comment, created_at) VALUES
       ($1, $2, 5, 'Best tomatoes I''ve had all year, so juicy.', '2026-08-05'),
       ($1, $3, 5, 'So fresh and hearty.', '2026-08-02')`,
      [customerId, productIds.p1, productIds.p2]
    );
    await client.query(
      `UPDATE products SET rating_cached = 5.0, review_count_cached = 1 WHERE id IN ($1, $2)`,
      [productIds.p1, productIds.p2]
    );

    // --- Orders (matching src/data/orders.ts mock) ---------------------------
    console.log("Seeding orders...");

    async function createOrder(opts: {
      orderNumber: string;
      status: string;
      items: { productKey: string; farmKey: string; quantity: number; price: number; unit: string; name: string }[];
      deliveryFee: number;
      placedAt: string;
      estimatedDeliveryAt: string | null;
      history: string[]; // status values in chronological order
    }) {
      const subtotal = opts.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const total = subtotal + opts.deliveryFee;

      const orderRes = await client.query<{ id: string }>(
        `INSERT INTO orders
           (order_number, customer_id, status, delivery_address_id, delivery_address_snapshot,
            delivery_method, payment_method, subtotal, delivery_fee, total, estimated_delivery_at, placed_at)
         VALUES ($1, $2, $3, $4, $5, 'standard', 'upi', $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          opts.orderNumber,
          customerId,
          opts.status,
          addressId,
          JSON.stringify({ addressLine: "204, Lotus Residency, Baner Road", city: "Pune", state: "Maharashtra" }),
          subtotal,
          opts.deliveryFee,
          total,
          opts.estimatedDeliveryAt,
          opts.placedAt,
        ]
      );
      const orderId = orderRes.rows[0].id;

      for (const item of opts.items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, farm_id, name_snapshot, unit_snapshot, price_snapshot, quantity)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [orderId, productIds[item.productKey], farmIds[item.farmKey], item.name, item.unit, item.price, item.quantity]
        );
      }

      for (const status of opts.history) {
        await client.query(`INSERT INTO order_status_events (order_id, status) VALUES ($1, $2)`, [orderId, status]);
      }

      return orderId;
    }

    await createOrder({
      orderNumber: "FD-8924",
      status: "OUT_FOR_DELIVERY",
      items: [
        { productKey: "p1", farmKey: "farm1", quantity: 2, price: 38, unit: "kg", name: "Heirloom Tomatoes" },
        { productKey: "p2", farmKey: "farm1", quantity: 1, price: 45, unit: "bunch", name: "Dinosaur Kale" },
      ],
      deliveryFee: 25,
      placedAt: "2026-08-10",
      estimatedDeliveryAt: "2026-08-12 18:00:00+05:30",
      history: ["PENDING", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"],
    });

    await createOrder({
      orderNumber: "FD-8901",
      status: "DELIVERED",
      items: [{ productKey: "p4", farmKey: "farm3", quantity: 3, price: 34, unit: "kg", name: "Vine Tomatoes" }],
      deliveryFee: 0,
      placedAt: "2026-08-05",
      estimatedDeliveryAt: null,
      history: ["PENDING", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED"],
    });

    await createOrder({
      orderNumber: "FD-8877",
      status: "DELIVERED",
      items: [
        { productKey: "p10", farmKey: "farm4", quantity: 1, price: 60, unit: "kg", name: "Roasted Groundnuts" },
        { productKey: "p3", farmKey: "farm2", quantity: 2, price: 30, unit: "bunch", name: "Organic Baby Spinach" },
      ],
      deliveryFee: 0,
      placedAt: "2026-07-29",
      estimatedDeliveryAt: null,
      history: ["PENDING", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED"],
    });

    console.log("Seed complete.");
    console.log(`\nDev accounts (all use password: ${DEV_PASSWORD}):`);
    console.log("  Customer: alex.johnson@farmdirect.dev");
    console.log("  Farmer:   ravi.kumar@farmdirect.dev (Ravi's Organic Farm)");
    console.log("  Farmer:   sunita.devi@farmdirect.dev (Green Acres)");
    console.log("  Farmer:   manoj.patil@farmdirect.dev (Sunrise Valley Farm)");
    console.log("  Farmer:   lakshmi.reddy@farmdirect.dev (Miller's Field)");
  });
}

seed()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error("Seed failed:", err);
    await pool.end();
    process.exit(1);
  });

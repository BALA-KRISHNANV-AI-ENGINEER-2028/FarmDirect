import type { Farmer } from "../types";

export const farmers: Farmer[] = [
  {
    id: "f1",
    name: "Ravi Kumar",
    photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80",
    farmId: "farm1",
    farmName: "Ravi's Organic Farm",
    experienceYears: 14,
    location: "Nashik, Maharashtra",
    verified: true,
    rating: 4.8,
    reviewCount: 214,
    story:
      "Ravi has been farming his family's land for 14 years, transitioning fully to organic methods in 2015. He believes fresh, honest food builds stronger communities and works closely with 40+ households every week.",
    productIds: ["p1", "p2", "p6"],
  },
  {
    id: "f2",
    name: "Sunita Devi",
    photo: "https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=400&q=80",
    farmId: "farm2",
    farmName: "Green Acres",
    experienceYears: 9,
    location: "Hosur, Tamil Nadu",
    verified: true,
    rating: 4.7,
    reviewCount: 132,
    story:
      "Sunita runs Green Acres with her two sons, specializing in leafy greens grown using natural farming methods with zero synthetic inputs.",
    productIds: ["p3", "p7"],
  },
  {
    id: "f3",
    name: "Manoj Patil",
    photo: "https://images.unsplash.com/photo-1594751543129-6701ad444259?w=400&q=80",
    farmId: "farm3",
    farmName: "Sunrise Valley Farm",
    experienceYears: 21,
    location: "Pune, Maharashtra",
    verified: true,
    rating: 4.9,
    reviewCount: 341,
    story:
      "A third-generation farmer, Manoj combines traditional wisdom with modern soil testing to grow some of the region's best-loved tomatoes and peppers.",
    productIds: ["p4", "p8", "p9"],
  },
  {
    id: "f4",
    name: "Lakshmi Reddy",
    photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80",
    farmId: "farm4",
    farmName: "Miller's Field",
    experienceYears: 11,
    location: "Warangal, Telangana",
    verified: false,
    rating: 4.5,
    reviewCount: 58,
    story:
      "Lakshmi grows heritage grains and pulses using rain-fed, pesticide-free methods passed down from her grandparents.",
    productIds: ["p5", "p10"],
  },
];

export const marketplaceCategories = ["All produce", "Vegetables", "Grains", "Roots & tubers", "Fruits"] as const;
export type MarketplaceCategory = (typeof marketplaceCategories)[number];

export type MarketplaceItem = {
  id: number;
  slug: string;
  title: string;
  category: string;
  priceMinor: number;
  priceUnit: string;
  quantityAvailable: number;
  quantityUnit: string;
  minimumOrder: number;
  location: string;
  description: string;
  imageUrl: string | null;
  sellerUserId: number | null;
  sellerName: string;
  sellerBusinessName: string | null;
  sellerBio?: string | null;
  sellerContactInfo?: string | null;
  sellerVerificationStatus: "not_started" | "pending" | "verified" | "needs_changes";
  isExample: boolean;
};

/** Clearly marked examples inspired by the uploaded HTML; these are never written to the live database. */
export const exampleListings: MarketplaceItem[] = [
  {
    id: -1, slug: "example-tomatoes", title: "Fresh field tomatoes", category: "Vegetables",
    priceMinor: 96000, priceUnit: "kg", quantityAvailable: 320, quantityUnit: "kg", minimumOrder: 10,
    location: "Kaduna, Kaduna State", description: "Illustrative listing only. Fresh, firm tomatoes shown as a sample of the produce information farmers can publish.",
    imageUrl: "/produce/tomatoes.jpg", sellerUserId: null, sellerName: "Example grower", sellerBusinessName: "Illustrative listing",
    sellerVerificationStatus: "not_started", isExample: true,
  },
  {
    id: -2, slug: "example-rice", title: "Local long-grain rice", category: "Grains",
    priceMinor: 165000, priceUnit: "kg", quantityAvailable: 240, quantityUnit: "kg", minimumOrder: 25,
    location: "Kano, Kano State", description: "Illustrative listing only. Raw long-grain rice shown as a sample of bulk crop listings.",
    imageUrl: "/produce/rice.jpg", sellerUserId: null, sellerName: "Example grower", sellerBusinessName: "Illustrative listing",
    sellerVerificationStatus: "not_started", isExample: true,
  },
  {
    id: -3, slug: "example-cassava", title: "Fresh cassava roots", category: "Roots & tubers",
    priceMinor: 42000, priceUnit: "kg", quantityAvailable: 1800, quantityUnit: "kg", minimumOrder: 50,
    location: "Ogun, Ogun State", description: "Illustrative listing only. Mature cassava roots shown to demonstrate a roots-and-tubers listing.",
    imageUrl: "/produce/cassava.jpg", sellerUserId: null, sellerName: "Example grower", sellerBusinessName: "Illustrative listing",
    sellerVerificationStatus: "not_started", isExample: true,
  },
  {
    id: -4, slug: "example-peppers", title: "Sweet bell peppers", category: "Vegetables",
    priceMinor: 240000, priceUnit: "kg", quantityAvailable: 90, quantityUnit: "kg", minimumOrder: 5,
    location: "Jos, Plateau State", description: "Illustrative listing only. A sample pepper listing with a visible harvest location and unit price.",
    imageUrl: "/produce/pepper.jpg", sellerUserId: null, sellerName: "Example grower", sellerBusinessName: "Illustrative listing",
    sellerVerificationStatus: "not_started", isExample: true,
  },
  {
    id: -5, slug: "example-maize", title: "Sweet yellow maize", category: "Grains",
    priceMinor: 72000, priceUnit: "kg", quantityAvailable: 500, quantityUnit: "kg", minimumOrder: 20,
    location: "Makurdi, Benue State", description: "Illustrative listing only. Fresh maize shown as a sample listing; availability is not real.",
    imageUrl: "/produce/maize.jpg", sellerUserId: null, sellerName: "Example grower", sellerBusinessName: "Illustrative listing",
    sellerVerificationStatus: "not_started", isExample: true,
  },
  {
    id: -6, slug: "example-plantain", title: "Green cooking plantain", category: "Fruits",
    priceMinor: 450000, priceUnit: "bunch", quantityAvailable: 80, quantityUnit: "bunches", minimumOrder: 2,
    location: "Ondo, Ondo State", description: "Illustrative listing only. Firm cooking plantain shown as an example of per-bunch pricing.",
    imageUrl: "/produce/plantain.jpg", sellerUserId: null, sellerName: "Example grower", sellerBusinessName: "Illustrative listing",
    sellerVerificationStatus: "not_started", isExample: true,
  },
  {
    id: -7, slug: "example-okra", title: "Tender fresh okra", category: "Vegetables",
    priceMinor: 130000, priceUnit: "kg", quantityAvailable: 110, quantityUnit: "kg", minimumOrder: 5,
    location: "Ibadan, Oyo State", description: "Illustrative listing only. Fresh okra shown as a sample vegetable listing.",
    imageUrl: "/produce/okra.jpg", sellerUserId: null, sellerName: "Example grower", sellerBusinessName: "Illustrative listing",
    sellerVerificationStatus: "not_started", isExample: true,
  },
  {
    id: -8, slug: "example-sorghum", title: "Clean red sorghum", category: "Grains",
    priceMinor: 110000, priceUnit: "kg", quantityAvailable: 900, quantityUnit: "kg", minimumOrder: 50,
    location: "Maiduguri, Borno State", description: "Illustrative listing only. Clean sorghum shown as a sample of a stored-grain listing.",
    imageUrl: "/produce/sorghum.jpg", sellerUserId: null, sellerName: "Example grower", sellerBusinessName: "Illustrative listing",
    sellerVerificationStatus: "not_started", isExample: true,
  },
];

export function getExampleListing(slug: string) {
  return exampleListings.find(item => item.slug === slug) ?? null;
}

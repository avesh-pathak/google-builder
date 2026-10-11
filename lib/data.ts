import type { Cafe, MenuItem, TasteTagMeta, User, Visit } from "./types";

/**
 * All data below is FICTIONAL DEMO DATA for the Café Circle AI hackathon MVP.
 * Prices are invented, cafés are stand-ins, and images are licensed stock
 * photography used as placeholders.
 */

const photo = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=960&h=720&q=70`;

export const PRIMARY_CAFE_ID = "cafe-circle";

export const DEMO_NOTICE = "Demo data";

/** Taste vocabulary shared by the menu, profiles and the recommender. */
export const TASTE_TAGS: TasteTagMeta[] = [
  { id: "sweet", label: "Sweet" },
  { id: "bitter", label: "Bitter" },
  { id: "strong", label: "Strong" },
  { id: "cold", label: "Cold" },
  { id: "hot", label: "Hot" },
  { id: "creamy", label: "Creamy" },
  { id: "caramel", label: "Caramel" },
  { id: "chocolatey", label: "Chocolatey" },
  { id: "nutty", label: "Nutty" },
  { id: "fruity", label: "Fruity" },
  { id: "smooth", label: "Smooth" },
  { id: "savoury", label: "Savoury" },
];

export const FLAVOR_OPTIONS = [
  "Cold coffee",
  "Sweet coffee",
  "Strong coffee",
  "Caramel",
  "Chocolate",
  "Hazelnut",
  "Fruity",
  "Espresso",
];

/** Ingredients a user can flag as something they avoid. */
export const INGREDIENT_OPTIONS = [
  "Milk",
  "Nuts",
  "Chocolate",
  "Caramel",
  "Cinnamon",
  "Gluten",
];

export const CAFES: Cafe[] = [
  {
    id: PRIMARY_CAFE_ID,
    name: "Café Circle",
    area: "Indiranagar, Bengaluru",
    blurb: "Our primary demo café. Small-batch roasts and a rotating dessert counter.",
    image: photo("photo-1509042239860-f550ce710b93"),
  },
  {
    id: "cafe-third-wave",
    name: "Third Wave Coffee",
    area: "Koramangala, Bengaluru",
    blurb: "Bold single-origin espresso. A favourite stop for slow mornings.",
    image: photo("photo-1447933601403-0c6688de566e"),
  },
  {
    id: "cafe-brew-bloom",
    name: "Brew & Bloom",
    area: "Jayanagar, Bengaluru",
    blurb: "Plant-filled courtyard café with an all-day brunch menu.",
    image: photo("photo-1559496417-e7f25cb247f3"),
  },
];

export const MENU: MenuItem[] = [
  {
    id: "iced-spanish-latte",
    name: "Iced Spanish Latte",
    description:
      "Double espresso poured over condensed milk and ice. Sweet, cold and dangerously easy to finish.",
    price: 320,
    category: "drinks",
    tags: ["cold", "sweet", "creamy", "caramel"],
    image: photo("photo-1461023058943-07fcbe16d735"),
  },
  {
    id: "cold-brew",
    name: "Cold Brew",
    description: "Steeped for 18 hours, served black over a single large cube. Smooth, never sharp.",
    price: 280,
    category: "drinks",
    tags: ["cold", "strong", "bitter", "smooth"],
    image: photo("photo-1517487881594-2787fef5ebf7"),
  },
  {
    id: "cappuccino",
    name: "Cappuccino",
    description: "A classic — equal parts espresso, steamed milk and a soft dome of foam.",
    price: 220,
    category: "drinks",
    tags: ["hot", "creamy", "smooth"],
    image: photo("photo-1534778101976-62847782c213"),
  },
  {
    id: "caramel-macchiato",
    name: "Caramel Macchiato",
    description: "Vanilla-steamed milk, a shot of espresso and a caramel drizzle on top.",
    price: 300,
    category: "drinks",
    tags: ["hot", "sweet", "caramel", "creamy"],
    image: photo("photo-1541167760496-1628856ab772"),
  },
  {
    id: "iced-americano",
    name: "Iced Americano",
    description: "Two shots of espresso, cold water, ice. Nothing to hide behind.",
    price: 240,
    category: "drinks",
    tags: ["cold", "strong", "bitter"],
    image: photo("photo-1497935586351-b67a49e012bf"),
  },
  {
    id: "mocha",
    name: "Mocha",
    description: "Espresso and steamed milk folded through 55% dark chocolate.",
    price: 310,
    category: "drinks",
    tags: ["hot", "sweet", "chocolatey", "creamy"],
    image: photo("photo-1512568400610-62da28bc8a13"),
  },
  {
    id: "hazelnut-latte",
    name: "Hazelnut Latte",
    description: "Toasted hazelnut syrup, espresso and silky milk. Nutty and rounded.",
    price: 290,
    category: "drinks",
    tags: ["hot", "nutty", "sweet", "creamy"],
    image: photo("photo-1572442388796-11668a67e53d"),
  },
  {
    id: "chocolate-croissant",
    name: "Chocolate Croissant",
    description: "Laminated in-house and baked through the morning. Shatteringly flaky.",
    price: 210,
    category: "food",
    tags: ["sweet", "chocolatey", "savoury"],
    image: photo("photo-1509440159596-0249088772ff"),
  },
  {
    id: "grilled-sandwich",
    name: "Grilled Sandwich",
    description: "Sourdough, smoked cheese, roast peppers and basil pressed until golden.",
    price: 260,
    category: "food",
    tags: ["savoury", "hot", "strong"],
    image: photo("photo-1528735602780-2552fd46c7af"),
  },
  {
    id: "blueberry-cheesecake",
    name: "Blueberry Cheesecake",
    description: "Baked New York style base with a wild blueberry compote.",
    price: 290,
    category: "food",
    tags: ["sweet", "fruity", "creamy"],
    image: photo("photo-1551024506-0bccd828d307"),
  },
];

export const USERS: User[] = [
  {
    id: "avesh",
    name: "Avesh",
    initials: "A",
    color: "#a45f2c",
    bio: "Cold coffee on most days. Always hunting for the least sweet option on the menu.",
    preferences: {
      sweetness: 3,
      bitterness: 3,
      temperature: "cold",
      favoriteFlavors: ["Cold coffee", "Chocolate"],
      dislikedIngredients: [],
      budget: "balanced",
    },
    usualOrderId: "cold-brew",
    usualNote: "Less ice",
    friendIds: ["riya", "aarav"],
  },
  {
    id: "riya",
    name: "Riya",
    initials: "R",
    color: "#8a4c6b",
    bio: "Will order anything with caramel in the name, and dessert is non-negotiable.",
    preferences: {
      sweetness: 5,
      bitterness: 2,
      temperature: "cold",
      favoriteFlavors: ["Sweet coffee", "Caramel"],
      dislikedIngredients: [],
      budget: "balanced",
    },
    usualOrderId: "caramel-macchiato",
    usualNote: "Extra caramel drizzle",
    friendIds: ["avesh", "aarav"],
  },
  {
    id: "aarav",
    name: "Aarav",
    initials: "A",
    color: "#4c6b5a",
    bio: "Espresso purist. Believes a good bean needs no syrup at all.",
    preferences: {
      sweetness: 2,
      bitterness: 5,
      temperature: "hot",
      favoriteFlavors: ["Strong coffee", "Espresso"],
      dislikedIngredients: [],
      budget: "value",
    },
    usualOrderId: "iced-americano",
    usualNote: "Double shot",
    friendIds: ["avesh", "riya"],
  },
];

/**
 * Seeded visits. `shared: true` means the visit is visible to friends.
 * Avesh's Third Wave visit mirrors the example in the product brief.
 */
export const VISITS: Visit[] = [
  {
    id: "visit-avesh-1",
    userId: "avesh",
    cafeId: "cafe-third-wave",
    date: "2026-09-24",
    items: [{ menuItemId: "iced-americano", name: "Iced Americano", rating: 4 }],
    note: "Loved the strong coffee, but next time less ice.",
    shared: true,
    source: "seed",
  },
  {
    id: "visit-avesh-2",
    userId: "avesh",
    cafeId: "cafe-circle",
    date: "2026-09-12",
    items: [
      { menuItemId: "cold-brew", name: "Cold Brew", rating: 5 },
      { menuItemId: "chocolate-croissant", name: "Chocolate Croissant", rating: 4 },
    ],
    note: "The cold brew here is the smoothest I've had.",
    shared: true,
    source: "seed",
  },
  {
    id: "visit-avesh-3",
    userId: "avesh",
    cafeId: "cafe-brew-bloom",
    date: "2026-08-30",
    items: [{ menuItemId: "hazelnut-latte", name: "Hazelnut Latte", rating: 3 }],
    note: "A bit too sweet for me — good otherwise.",
    shared: false,
    source: "seed",
  },
  {
    id: "visit-riya-1",
    userId: "riya",
    cafeId: "cafe-circle",
    date: "2026-09-20",
    items: [
      { menuItemId: "caramel-macchiato", name: "Caramel Macchiato", rating: 5 },
      { menuItemId: "blueberry-cheesecake", name: "Blueberry Cheesecake", rating: 5 },
    ],
    note: "Caramel macchiato plus the cheesecake is the perfect pairing.",
    shared: true,
    source: "seed",
  },
  {
    id: "visit-riya-2",
    userId: "riya",
    cafeId: "cafe-third-wave",
    date: "2026-09-05",
    items: [{ menuItemId: "iced-spanish-latte", name: "Iced Spanish Latte", rating: 5 }],
    note: "Sweet, cold and creamy. Exactly my kind of drink.",
    shared: true,
    source: "seed",
  },
  {
    id: "visit-riya-3",
    userId: "riya",
    cafeId: "cafe-brew-bloom",
    date: "2026-08-22",
    items: [{ menuItemId: "mocha", name: "Mocha", rating: 4 }],
    note: "Rich but not too heavy.",
    shared: true,
    source: "seed",
  },
  {
    id: "visit-aarav-1",
    userId: "aarav",
    cafeId: "cafe-third-wave",
    date: "2026-09-18",
    items: [
      { menuItemId: "iced-americano", name: "Iced Americano", rating: 5 },
      { menuItemId: "grilled-sandwich", name: "Grilled Sandwich", rating: 4 },
    ],
    note: "Best iced americano in the city, and the sandwich holds up.",
    shared: true,
    source: "seed",
  },
  {
    id: "visit-aarav-2",
    userId: "aarav",
    cafeId: "cafe-circle",
    date: "2026-09-02",
    items: [{ menuItemId: "cappuccino", name: "Cappuccino", rating: 4 }],
    note: "Solid foam, could be a touch hotter.",
    shared: true,
    source: "seed",
  },
  {
    id: "visit-aarav-3",
    userId: "aarav",
    cafeId: "cafe-brew-bloom",
    date: "2026-08-19",
    items: [{ menuItemId: "cold-brew", name: "Cold Brew", rating: 4 }],
    note: "Good, though I'd take it even stronger.",
    shared: false,
    source: "seed",
  },
];

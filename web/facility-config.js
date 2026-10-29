// Shared facility configuration, used by app.js for both the facility input cards and the
// facility recipe reference modal, so the two stay in sync automatically.

// Facility configuration. `name` must exactly match the facility string used throughout the
// Rust data model (ProductionItem.facility / FacilityCounts keys) since it's sent verbatim as
// the JSON key for each facility's count/level. Add new facilities here only; cards and input
// handling are generated dynamically, no other file needs to change. `category` groups the cards
// in the UI (see `FACILITY_CATEGORIES` below for display order). `hasLevels: false` hides the
// Level input entirely for facilities that don't level up in-game; omit the field (defaults to
// leveled) for any facility that does. `hasWorker: true` marks facilities an Aniimo works;
// `ability` is the Aniimo ability the facility uses and `personality` the personality that gets
// its +20% speed bonus (omitted if not known), shown in the plan's Aniimo recommendations.
// `unlocks` maps each facility level to the RV (Homeland) level that unlocks it. `counts[i]` is how
// many of the facility you can place at RV level i + 1; an RV level past the end of the list keeps
// the last count. Simple mode uses both (see `simpleSetup`). Counts are confirmed in game up to RV
// level 19 for the facilities listed below. Past the last confirmed RV entry, each facility keeps
// its last count. Farmland, Woodland and Mine continue to follow the game's established pattern.
//
// Facilities marked "Not yet verified in game" in their tooltip haven't had their numbers
// confirmed in game yet.
export const FACILITIES = [
    {
        name: 'Farmland', slug: 'farmland', defaultCount: 1, category: 'Materials',
        unlocks: { 1: 1, 2: 2, 3: 5, 4: 7, 5: 9, 6: 12, 7: 16, 8: 21 },
        counts: [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 40, 40, 42],
        tooltip: "Lv.1: Wheat&#10;Lv.2: Potato, Quick Wheat&#10;Lv.3: Rice, Soybean&#10;Lv.4: Rose, Cotton, Quick Potato&#10;Lv.5: Strawberry, Lavender, Sugarcane&#10;Lv.6: Ginseng, Grape, Premium Wheat, Quick Rice&#10;Lv.7: Cranberry, Agave, Quick Strawberry&#10;Lv.8: Sorghum, Premium Potato, Quick Agave"
    },
    {
        name: 'Woodland', slug: 'woodland', defaultCount: 1, category: 'Materials',
        unlocks: { 1: 2, 2: 4, 3: 7, 4: 11, 5: 14, 6: 18 },
        counts: [0, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 20, 20, 21],
        tooltip: "Lv.1: Willow Wood&#10;Lv.2: Bamboo, Lemon&#10;Lv.3: Cherry Blossom, Apple, Maple Syrup, Quick Bamboo&#10;Lv.4: Palm Bark, Chestnut, Walnut, Quick Lemon&#10;Lv.5: Natural Rubber, Coconut, Quick Maple Syrup&#10;Lv.6: Cocoa, Orange Flower, Quick Coconut&#10;Also yields Wood Blocks."
    },
    {
        name: 'Mine', slug: 'mine', defaultCount: 1, category: 'Materials', hasWorker: true, ability: 'Earth', personality: 'Playful', supportsEmode: true,
        unlocks: { 1: 3, 2: 6, 3: 9, 4: 12, 5: 15, 6: 18, 7: 21 },
        counts: [0, 0, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10],
        tooltip: "Lv.1: Rock&#10;Lv.2: Clay&#10;Lv.3: Shell&#10;Lv.4: Copper Ore&#10;Lv.5: Quartz Ore&#10;Lv.6: Gem&#10;Lv.7: Silver Ore&#10;Also yields Mineral Sand."
    },
    {
        name: 'Well', slug: 'well', defaultCount: 0, category: 'Materials', hasWorker: true, ability: 'Water', personality: 'Faithful', supportsEmode: true,
        unlocks: { 1: 4, 2: 8, 3: 11, 4: 13, 5: 17, 6: 21 },
        counts: [0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4],
        tooltip: "Lv.1: Well Water, Quick Well Water&#10;Lv.2: Fresh Water&#10;Lv.3: Quick Fresh Water&#10;Lv.4: Deep Rock Spring Water, Quick Deep Rock Spring Water&#10;Lv.5: Natural Mineral Spring Water, Quick Natural Mineral Spring Water&#10;Lv.6: Snowmelt Cold Spring, Quick Snowmelt Cold Spring"
    },
    {
        name: 'Tidewhisper Sandcastle', slug: 'tidewhisper-sandcastle', defaultCount: 0, category: 'Aniimo Materials', hasWorker: true, ability: 'Leisure', personality: 'Judicious',
        unlocks: { 1: 5, 2: 8, 3: 13, 4: 19, 5: 22 },
        counts: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
        tooltip: "Lv.1: Sea Salt&#10;Lv.2: Quick Sea Salt&#10;Lv.3: Pearl (needs Warm)&#10;Lv.4: Quick Pearl (needs Warm)&#10;Lv.5: Sweet Cone (needs Freeze)"
    },
    {
        name: 'Dewy House', slug: 'dewy-house', defaultCount: 0, category: 'Aniimo Materials', hasWorker: true, ability: 'Leisure', personality: 'Instinctive',
        unlocks: { 1: 6, 2: 11 },
        counts: [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
        tooltip: "Lv.1: Aromathyst&#10;Lv.2: Quick Aromathyst"
    },
    {
        name: 'Nimbus Bed', slug: 'nimbus-bed', defaultCount: 0, category: 'Aniimo Materials', hasWorker: true, ability: 'Leisure', personality: 'Judicious',
        unlocks: { 1: 10, 2: 13, 3: 16 },
        counts: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 2],
        tooltip: "Lv.1: Wool&#10;Lv.2: Quick Wool&#10;Lv.3: Petals"
    },
    {
        name: 'Starfall Hammock', slug: 'starfall-hammock', defaultCount: 0, category: 'Aniimo Materials', hasWorker: true, ability: 'Leisure', personality: 'Faithful',
        unlocks: { 1: 12, 2: 21 },
        counts: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 2],
        tooltip: "Lv.1: Star (needs Cool)&#10;Lv.2: Gold Speck Cap (needs Warm)"
    },
    {
        name: 'Floral Windmill', slug: 'floral-windmill', defaultCount: 0, category: 'Aniimo Materials', hasLevels: false, hasWorker: true, ability: 'Leisure', personality: 'Nimble',
        unlocks: { 1: 18 },
        counts: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
        tooltip: "Scales, Quick Scales (need Adequate)&#10;Not yet verified in game."
    },
    {
        name: 'Heat Furnace', slug: 'heat-furnace', defaultCount: 0, category: 'Environment', hasLevels: false,
        unlocks: { 1: 7 },
        counts: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3],
        tooltip: "Provides Warm or Scorching growing conditions for crops that need one&#10;The calculator picks whichever mode is more profitable.&#10;Covers a 9x9 area around itself; how many plots fit depends on what shares it."
    },
    {
        name: 'Cooling Unit', slug: 'cooling-unit', defaultCount: 0, category: 'Environment', hasLevels: false,
        unlocks: { 1: 7 },
        counts: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 3],
        tooltip: "Provides Cool or Freeze growing conditions for crops that need one&#10;The calculator picks whichever mode is more profitable.&#10;Covers a 9x9 area around itself; how many plots fit depends on what shares it."
    },
    {
        name: 'Sunlamp', slug: 'sunlamp', defaultCount: 0, category: 'Environment', hasLevels: false,
        unlocks: { 1: 9 },
        counts: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3],
        tooltip: "Provides Adequate growing conditions for crops that need one&#10;Covers a 9x9 area around itself; how many plots fit depends on what shares it."
    },
    {
        name: 'Carousel Mill', slug: 'carousel-mill', defaultCount: 1, category: 'Materials Processing', hasWorker: true, ability: 'Wind', personality: 'Tenacious', supportsEmode: true,
        unlocks: { 1: 2, 2: 5, 3: 9, 4: 13, 5: 16, 6: 18, 7: 21 },
        counts: [0, 1, 1, 1, 1, 1, 1, 1, 2],
        tooltip: "Lv.1: Wheatmeal&#10;Lv.2: Tofu, Milled Rice&#10;Lv.3: Lavender Powder&#10;Lv.4: Rice Drink, Ginseng Powder&#10;Lv.5: Refined Flour, Coconut Oil&#10;Lv.6: Cocoa Powder, Coconut Milk, Pearl Powder&#10;Lv.7: Sorghum Flour, Gold Dust, Bright Silver Powder"
    },
    {
        name: 'Crafting Table', slug: 'crafting-table', defaultCount: 1, category: 'Materials Processing', hasWorker: true, ability: 'Artisanship', personality: 'Judicious', supportsEmode: true,
        unlocks: { 1: 3, 2: 5, 3: 7, 4: 9, 5: 12, 6: 15, 7: 18, 8: 20, 9: 22 },
        counts: [0, 0, 1, 1, 1, 1, 1, 1, 1, 2],
        tooltip: "Lv.1: Wood Sculpture&#10;Lv.2: Bamboo Ware, River-Washed Stones, Premium River-Washed Stones&#10;Lv.3: Rose Freshener, Pottery, Premium Rose Freshener&#10;Lv.4: Bouquet, Shell Ornament, Lavender Sachet&#10;Lv.5: Wind Chime, Star Wish Lantern, Dream Catcher, Advanced Wind Chime&#10;Lv.6: Rubber Duck, Pearl Necklace, Woven Toy, Porcelain&#10;Lv.7: Dye, Gemstone Dust, Flowers in a Bottle, Advanced Gemstone Dust&#10;Lv.8: Doll, Star Diamond, Pearl Face Cream&#10;Lv.9: Quicksilver Springstone, Glitter Powder, Orange Flower Scented Mat, Premium Quicksilver Springstone"
    },
    {
        name: 'Claw Game Cooker', slug: 'claw-game-cooker', defaultCount: 1, category: 'Materials Processing', hasWorker: true, ability: 'Fire', personality: 'Practical', supportsEmode: true,
        unlocks: { 1: 4, 2: 5, 3: 7, 4: 9, 5: 12, 6: 16, 7: 19 },
        counts: [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2],
        tooltip: "Lv.1: Bread, Premium Bread&#10;Lv.2: Roasted Soybeans&#10;Lv.3: Maple Candy Roasted Potatoes, Apple Tart, Rose Shortbread&#10;Lv.4: Lavender Cookies, Apple Candy&#10;Lv.5: Grape Candy, Caramel Nut Chips&#10;Lv.6: Maple Candy Star, Coconut Cookie&#10;Lv.7: Flower Bread, Berry Chocolate Coconut Pudding, Premium Berry Chocolate Coconut Pudding"
    },
    {
        name: 'Jukebox Dryer', slug: 'jukebox-dryer', defaultCount: 1, category: 'Materials Processing', hasWorker: true, ability: 'Dark', personality: 'Nimble', supportsEmode: true,
        unlocks: { 1: 4, 2: 5, 3: 7, 4: 10, 5: 12, 6: 14, 7: 18, 8: 21 },
        counts: [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2],
        tooltip: "Lv.1: Potato Chips&#10;Lv.2: Dried Lemon Slices&#10;Lv.3: Dried Cherry Blossom, Dried Bean Curd&#10;Lv.4: Dried Apple Slices, Dried Strawberries&#10;Lv.5: Nuts, Dried Ginseng&#10;Lv.6: Dried Grapes, Shredded Coconut&#10;Lv.7: Dried Cranberries, Dried Flowers&#10;Lv.8: Dried Orange Flower, Agave Fiber"
    },
    {
        name: 'Simmering Pot', slug: 'simmering-pot', defaultCount: 0, category: 'Materials Processing', hasWorker: true, ability: 'Fire', personality: 'Tenacious', supportsEmode: true,
        unlocks: { 1: 5, 2: 7, 3: 9, 4: 12, 5: 15, 6: 18, 7: 21 },
        counts: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2],
        tooltip: "Lv.1: Plain Rice Porridge&#10;Lv.2: Rose Concentrate&#10;Lv.3: Rock Candy, Strawberry Jam, Maple Candy Apple Jam&#10;Lv.4: Chestnut Puree, Grape Jam, Ginseng Porridge&#10;Lv.5: Maple Sugar Chunk, Malt Sugar&#10;Lv.6: Cocoa Spread, Cranberry Jam, Agave Syrup&#10;Lv.7: Potato Starch, Sorghum Porridge, Orange Flower Syrup"
    },
    {
        name: 'Phonolfactory Table', slug: 'phonolfactory-table', defaultCount: 0, category: 'Materials Processing', hasWorker: true, ability: 'Perfumery', personality: 'Instinctive', supportsEmode: true,
        unlocks: { 1: 6, 2: 7, 3: 10, 4: 14, 5: 17, 6: 19, 7: 22 },
        counts: [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2],
        tooltip: "Lv.1: Bamboo Joss Stick&#10;Lv.2: Rose Incense, Cherry Incense&#10;Lv.3: Lavender Incense, Lemon Incense, Advanced Lemon Incense&#10;Lv.4: Herbal Ginseng Aroma&#10;Lv.5: Soap, Premium Soap&#10;Lv.6: Orange Flower Incense, Mixed Perfume, Lotion, Premium Mixed Perfume&#10;Lv.7: Coconut Milk Lotion, Orange Flower Skin Balm, Gold Dust Sachet"
    },
    {
        name: 'Bouncy Brew Keg', slug: 'bouncy-brew-keg', defaultCount: 0, category: 'Materials Processing', hasWorker: true, ability: 'Water', personality: 'Energetic', supportsEmode: true,
        unlocks: { 1: 6, 2: 9, 3: 13, 4: 17, 5: 19, 6: 22 },
        counts: [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2],
        tooltip: "Lv.1: Wheat Tea, Toasted Rice Green Tea&#10;Lv.2: Potato Kvass, Strawberry Juice, Apple Juice, Sugarcane Juice&#10;Lv.3: Grape Juice, Ginseng Water, Grape Lemon Drink, Walnut Milk&#10;Lv.4: Cranberry Juice, Coconut Cooler&#10;Lv.5: Agave Drink, Hot Cocoa, Coconut Cocoa, Orange Flower Dew&#10;Lv.6: Red Sorghum Rice Drink, Cocoa Sweet Cone, Sugar Core Sweet Cone"
    },
    {
        name: 'Blazing Stove', slug: 'blazing-stove', defaultCount: 0, category: 'Materials Processing', hasWorker: true, ability: 'Fire', personality: 'Nimble', supportsEmode: true,
        unlocks: { 1: 8, 2: 10, 3: 13, 4: 16, 5: 18, 6: 22 },
        counts: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2],
        tooltip: "Lv.1: Soy Sauce Fried Rice, Creamy Potato Soup, Cherry Blossom Rice Ball, Premium Potato Soup&#10;Lv.2: Tanghulu, Soy Sauce Tofu, Sugar-Roasted Chestnuts&#10;Lv.3: Steamed Vermicelli Roll, Ginseng Chestnut Cake, Walnut Cake&#10;Lv.4: Jello, Strawberry Candy, Rich Grape Compote, Premium Jello&#10;Lv.5: Strawberry Cream Puff, Cranberry Chocolate&#10;Lv.6: Shredded Coconut Cake, Cranberry Soft Cake, Orange Flower Rice Drink"
    },
    {
        name: 'Pickling Jar', slug: 'pickling-jar', defaultCount: 0, category: 'Materials Processing', hasWorker: true, ability: 'Dark', personality: 'Playful', supportsEmode: true,
        unlocks: { 1: 8, 2: 10, 3: 13, 4: 16, 5: 19, 6: 21 },
        counts: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2],
        tooltip: "Lv.1: Soy Sauce, Salted Cherry Blossom&#10;Lv.2: Sweet Rice Drink, Cider Vinegar, Premium Sweet Rice Wine&#10;Lv.3: Rice Vinegar, Salted Lemon, Premium Salted Lemon&#10;Lv.4: Candied Strawberries&#10;Lv.5: Candied Orange Flower&#10;Lv.6: Sorghum Fermented Mash"
    },
    {
        name: 'Joy Wheel Loom', slug: 'joy-wheel-loom', defaultCount: 0, category: 'Materials Processing', hasWorker: true, ability: 'Wind', personality: 'Faithful', supportsEmode: true,
        unlocks: { 1: 7, 2: 10, 3: 15, 4: 19, 5: 21 },
        counts: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2],
        tooltip: "Lv.1: Cotton Thread&#10;Lv.2: Woolen Yarn, Cotton Fabric&#10;Lv.3: Palm Rope, Wool Fabric&#10;Lv.4: Dyed Cotton Fabric&#10;Lv.5: Sisal Plush Mat"
    },
    {
        name: 'Dance Pad Polisher', slug: 'dance-pad-polisher', defaultCount: 0, category: 'Materials Processing', hasWorker: true, ability: 'Lightning', supportsEmode: true,
        unlocks: { 1: 2, 2: 5, 3: 7 },
        counts: [0, 1],
        tooltip: "Lv.1: Growth Bud&#10;Lv.2: Growth Flower&#10;Lv.3: Growth Fruit&#10;Makes Aniimo EXP, not Home Coins.&#10;Unlock levels not yet confirmed in game."
    },
    {
        name: 'Aniipod Maker', slug: 'aniipod-maker', defaultCount: 0, category: 'Materials Processing', hasWorker: true, ability: 'Lightning', supportsEmode: true,
        unlocks: { 1: 3, 2: 6, 3: 9 },
        counts: [0, 0, 1],
        tooltip: "Lv.1: Aniipod&#10;Lv.2: Aniipod Pro&#10;Lv.3: Aniipod Mega&#10;Aniipods are for catching Aniimo, not for selling.&#10;Unlock levels not yet confirmed in game."
    },
    {
        name: 'Woodworking Bench', slug: 'woodworking-bench', defaultCount: 0, category: 'Materials Processing', hasWorker: true, ability: 'Artisanship', personality: 'Energetic', supportsEmode: true,
        unlocks: { 1: 6, 2: 10, 3: 14, 4: 18 },
        // One unit per tier the next level-up needs (2 at RV 10, 3 at RV 14, 4 at RV 18 checked in game).
        counts: [0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4],
        tooltip: "Lv.1: Rough Lumber&#10;Lv.2: Standard Planks&#10;Lv.3: Laminated Beams&#10;Lv.4: Densified Timber Component&#10;Turns Wood Blocks into RV level-up materials."
    },
    {
        name: 'Chimney Kiln', slug: 'chimney-kiln', defaultCount: 0, category: 'Materials Processing', hasWorker: true, ability: 'Fire', personality: 'Practical', supportsEmode: true,
        unlocks: { 1: 6, 2: 10, 3: 14, 4: 18 },
        // One unit per tier the next level-up needs (2 at RV 10, 3 at RV 14, 4 at RV 18 checked in game).
        counts: [0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4],
        tooltip: "Lv.1: Coarse-Sifted Ore&#10;Lv.2: Sintered Ore Brick&#10;Lv.3: Refined Ore&#10;Lv.4: Microcrystalline Ore Plate&#10;Turns Mineral Sand into RV level-up materials."
    },
];

// Watts one electric unit draws per facility level (`electricRequire` in the game's
// homeland_facility_data): 15W a level for most processors, 30W a level for the Mine, Well,
// Aniipod Maker and Dance Pad Polisher. A Lv.3 Woodworking Bench draws 45W, a Lv.5 Mine 150W.
export const FACILITY_WATTS_PER_LEVEL = {
    'Mine': 30,
    'Well': 30,
    'Carousel Mill': 15,
    'Crafting Table': 15,
    'Claw Game Cooker': 15,
    'Jukebox Dryer': 15,
    'Simmering Pot': 15,
    'Phonolfactory Table': 15,
    'Bouncy Brew Keg': 15,
    'Blazing Stove': 15,
    'Pickling Jar': 15,
    'Joy Wheel Loom': 15,
    'Dance Pad Polisher': 30,
    'Aniipod Maker': 30,
    'Woodworking Bench': 15,
    'Chimney Kiln': 15,
};

// Watts one electric unit of `name` draws at facility level `level`; 0 if it can't run on power.
export function facilityWatts(name, level) {
    return (FACILITY_WATTS_PER_LEVEL[name] || 0) * Math.max(1, level || 1);
}

export const DEFAULT_GENERATOR_WATTS = 600;

// The Crackle Generators' watts all together at each RV: as many generators as the RV allows (one
// up to RV 14, two from RV 15, three from RV 18, in the game's home_object_place_data), each at
// the highest level it allows (the Power Module unlocks generator Lv.1–5 at RV 12, 14, 16, 18 and
// 20, in home_car_component_upgrade_data). They all power the same grid.
export const GENERATOR_WATTS_BY_HOME_LEVEL = {
    12: 600,
    13: 600,
    14: 800,
    15: 1600,
    16: 2000,
    17: 2000,
    18: 3600,
    19: 3600,
    20: 4500,
    21: 4500,
    22: 4500,
};

// The generator setups to pick from: `watts` all together, `count` generators at `level`.
export const GENERATOR_CAPACITY_OPTIONS = [
    { watts: 600, level: 1, count: 1, minHomeLevel: 12, label: '600W (Lv.1: RV 12–13)' },
    { watts: 800, level: 2, count: 1, minHomeLevel: 14, label: '800W (Lv.2: RV 14)' },
    { watts: 1600, level: 2, count: 2, minHomeLevel: 15, label: '1600W (Lv.2 ×2: RV 15)' },
    { watts: 2000, level: 3, count: 2, minHomeLevel: 16, label: '2000W (Lv.3 ×2: RV 16–17)' },
    { watts: 3600, level: 4, count: 3, minHomeLevel: 18, label: '3600W (Lv.4 ×3: RV 18–19)' },
    { watts: 4500, level: 5, count: 3, minHomeLevel: 20, label: '4500W (Lv.5 ×3: RV 20–22)' },
];


// Aniipod tiers in Aniipod Maker level order: each level adds a better one for catching Aniimo.
// The "Most Aniipods" strategy makes only the best tier the player's Maker can reach.
export const ANIIPOD_TIERS = ['aniipod', 'aniipod_pro', 'aniipod_mega'];

// Recipes unlocked with a rare currency (a few come from RV level-ups or from collecting one of
// every product). Plans leave them out until the player says they have them.
export const SPECIAL_RECIPES = [
    { name: 'rose_shortbread', facility: 'Claw Game Cooker' },
    { name: 'potato_kvass', facility: 'Bouncy Brew Keg' },
    { name: 'ginseng_porridge', facility: 'Simmering Pot' },
    { name: 'strawberry_candy', facility: 'Blazing Stove' },
    { name: 'flowers_in_a_bottle', facility: 'Crafting Table' },
    { name: 'lotion', facility: 'Phonolfactory Table' },
];

// Home seasons, from RV 10: limited-time events that come round again (the game's
// home_season_data). During one, season crops' seeds cost the season's currency, which season
// orders pay out, and every season item sold counts points on top of its coins. The currency is
// taken as unlimited; plans show how much their seeds use. Each season's recipes and seed costs
// are in data/<id>.csv, which src/wasm.rs embeds under the same id.
export const SEASONS = [
    {
        id: 'harvest_moon_festival',
        name: 'Harvest Moon Festival',
        currency: 'Moonray Wheat',
        points: 'Harvest Moon Points',
        minHomeLevel: 10,
        // When it ran (UTC+8, from the first server's start to the last server's end).
        runs: [{ start: '2026-09-16T04:00:00+08:00', end: '2026-10-28T16:00:00+08:00' }],
        // The season's crops, each with a field (`season-min-<name>`) for the fewest Farmland plots
        // to keep growing it, e.g. to find its variants for season quests.
        crops: ['moondew_radish', 'waxing_moon_pepper'],
        // Recipes unlocked with Recipe Notes; plans only use the ones the player ticks. The season's
        // other recipes come unlocked.
        recipeNotes: [
            { name: 'harvest_platter' },
            { name: 'umbral_pickle' },
            { name: 'umbral_hot_pot' },
            { name: 'umbral_sweet_and_spicy_sauce' },
        ],
    },
    {
        id: 'magical_wonder_night',
        name: 'Magical Wonder Night',
        currency: 'Weird Jelly Beans',
        points: 'Whimsy Points',
        minHomeLevel: 10,
        runs: [{ start: '2026-10-29T10:00:00+08:00', end: '2026-12-10T07:59:59+08:00' }],
        crops: ['magic_pumpkin', 'memory_lanternfruit'],
        // Every one of its recipes takes a Recipe Note in the game files; which ones the season
        // hands out isn't known yet, so they start ticked and the player unticks any they lack.
        notesStartUnlocked: true,
        recipeNotes: [
            { name: 'sea_salt_roasted_pumpkin' },
            { name: 'magic_pumpkin_cake' },
            { name: 'magic_pumpkin_lantern' },
            { name: 'candied_lanternfruit' },
            { name: 'gleam_fruit_nectar' },
            { name: 'memory_lantern' },
            { name: 'golden_lantern_pumpkin_soup' },
            { name: 'honey_glazed_pumpkin_cup' },
            { name: 'glowfruit_lantern_set' },
        ],
    },
];

// The season running at `date`; between seasons, the next one to start, else the last to end.
export function seasonAt(date = new Date()) {
    const time = date.getTime();
    const runs = SEASONS.flatMap(season => season.runs.map(run => ({
        season, start: Date.parse(run.start), end: Date.parse(run.end),
    })));
    const running = runs.find(r => r.start <= time && time <= r.end);
    if (running) return running.season;
    const next = runs.filter(r => r.start > time).sort((a, b) => a.start - b.start)[0];
    if (next) return next.season;
    return runs.sort((a, b) => b.end - a.end)[0].season;
}

// The season with `id`, or null.
export function seasonById(id) {
    return SEASONS.find(season => season.id === id) || null;
}

// What reaching each RV level costs: coins, plus raw Wood Blocks and Mineral Sand up to RV 6 and
// one Woodworking Bench item and one Chimney Kiln item from RV 7.
export const LEVEL_UP_COSTS = {
    2: { coins: 140, items: [['wood_block', 3]] },
    3: { coins: 800, items: [['wood_block', 25]] },
    4: { coins: 2900, items: [['wood_block', 100], ['mineral_sand', 120]] },
    5: { coins: 7300, items: [['wood_block', 550], ['mineral_sand', 250]] },
    6: { coins: 32000, items: [['wood_block', 1300], ['mineral_sand', 700]] },
    7: { coins: 69000, items: [['rough_lumber', 290], ['coarse_sifted_ore', 360]] },
    8: { coins: 180000, items: [['rough_lumber', 1100], ['coarse_sifted_ore', 640]] },
    9: { coins: 260000, items: [['rough_lumber', 1520], ['coarse_sifted_ore', 800]] },
    10: { coins: 510000, items: [['rough_lumber', 2000], ['coarse_sifted_ore', 2400]] },
    11: { coins: 680000, items: [['standard_planks', 320], ['sintered_ore_brick', 350]] },
    12: { coins: 1060000, items: [['standard_planks', 910], ['sintered_ore_brick', 480]] },
    13: { coins: 1930000, items: [['standard_planks', 1230], ['sintered_ore_brick', 760]] },
    14: { coins: 2620000, items: [['standard_planks', 1590], ['sintered_ore_brick', 1060]] },
    15: { coins: 3760000, items: [['laminated_beams', 390], ['refined_ore', 150]] },
    16: { coins: 4900000, items: [['laminated_beams', 480], ['refined_ore', 310]] },
    17: { coins: 8630000, items: [['laminated_beams', 630], ['refined_ore', 380]] },
    18: { coins: 11600000, items: [['laminated_beams', 800], ['refined_ore', 520]] },
    19: { coins: 17100000, items: [['densified_timber_component', 400], ['microcrystalline_ore_plate', 220]] },
    20: { coins: 20800000, items: [['densified_timber_component', 490], ['microcrystalline_ore_plate', 270]] },
    21: { coins: 34300000, items: [['densified_timber_component', 830], ['microcrystalline_ore_plate', 3720]] },
    22: { coins: 52600000, items: [['densified_timber_component', 1190], ['microcrystalline_ore_plate', 10580]] },
};

// The Woodworking Bench and Chimney Kiln chains, lowest tier first: what a player might have in
// stock toward a level-up.
export const LEVEL_UP_CHAINS = [
    ['wood_block', 'rough_lumber', 'standard_planks', 'laminated_beams', 'densified_timber_component'],
    ['mineral_sand', 'coarse_sifted_ore', 'sintered_ore_brick', 'refined_ore', 'microcrystalline_ore_plate'],
];

// How much ground each facility takes, in tiles, measured in game. Not all are square, and
// several sit on half tiles: the Blazing Stove snaps to a gridline of its own. The Storage Unit
// is here too, since a layout has to place it even though it produces nothing.
export const FACILITY_FOOTPRINTS = {
    'Farmland': [2, 2],
    'Woodland': [4, 4],
    'Mine': [5, 5],
    'Well': [2, 2],
    'Tidewhisper Sandcastle': [5, 5],
    'Dewy House': [2, 2],
    'Nimbus Bed': [5, 5],
    'Starfall Hammock': [5, 5],
    'Floral Windmill': [5, 5],
    'Heat Furnace': [1, 1],
    'Cooling Unit': [2, 2],
    'Sunlamp': [1, 1],
    'Carousel Mill': [5.5, 5.5],
    'Crafting Table': [4, 4],
    'Claw Game Cooker': [3.5, 3.5],
    'Simmering Pot': [1.5, 1.5],
    'Phonolfactory Table': [3.5, 3.5],
    'Bouncy Brew Keg': [3, 3],
    'Blazing Stove': [2.5, 1.75],
    'Pickling Jar': [2.5, 2],
    'Jukebox Dryer': [2.5, 2.5],
    'Joy Wheel Loom': [4, 4],
    'Woodworking Bench': [2, 1.5],
    'Chimney Kiln': [5.5, 5.5],
    'Dance Pad Polisher': [2.5, 2.5],
    'Aniipod Maker': [4.5, 4.5],
    'Storage Unit': [2, 2],
    'Crackle Generator': [2, 2],
    'Generator': [2, 2],
    'Crackle Power Pole': [1.5, 1.5],
    'Power Pole': [1.5, 1.5],
};

export const GENERATOR_POWER_RANGE = 11;
export const POLE_POWER_RANGE = 7;
export const POWER_POLE_COUNTS_BY_RV = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 6, 12, 12, 18, 18, 24, 24, 30, 30, 30
];

// The homeland: a 4x4 grid of plots, each 20 tiles wide and 15 tall, plot n opening at RV n (and
// all of them from RV 16). Rows from the top, by plot number; the first opens bottom middle.
export const HOMELAND_PLOT_SIZE = { w: 20, h: 15 };
export const HOMELAND_PLOTS = [
    [13, 14, 15, 16],
    [12, 7, 8, 9],
    [11, 4, 3, 6],
    [10, 2, 1, 5],
];

// An Aniimo carries four personalities at once, one from each of these opposed pairs, which the
// game shows as four letters over its portrait: INFP, ISFJ, ESTJ and so on. So one Aniimo can
// hold the bonus for up to four facilities, and can never hold it for two that want opposite
// personalities. Seven of the names are their own letter; S is Practical, confirmed in game.
export const PERSONALITY_PAIRS = [
    { letters: ['I', 'E'], names: ['Instinctive', 'Energetic'] },
    { letters: ['N', 'S'], names: ['Nimble', 'Practical'] },
    { letters: ['F', 'T'], names: ['Faithful', 'Tenacious'] },
    { letters: ['P', 'J'], names: ['Playful', 'Judicious'] },
];

// Recipes only one family of Aniimo can work, whatever its Leisure level (checked in game): the
// family's id (the game's `ethnicGroup`, the `family` column of `data/aniimo_homeland.csv`; the
// recipe's operation in homeland_operate_data names it). Families, not handbook numbers, since
// each region's handbook starts again from 1. `items` limits it to those recipes; without it,
// every recipe of the facility.
export const RECIPE_FAMILIES = [
    { facility: 'Tidewhisper Sandcastle', items: ['sea_salt', 'quick_sea_salt'], family: 1017 },
    { facility: 'Tidewhisper Sandcastle', items: ['pearl', 'quick_pearl'], family: 1019 },
    { facility: 'Tidewhisper Sandcastle', items: ['sweet_cone'], family: 1059 },
    { facility: 'Dewy House', family: 1035 },
    { facility: 'Nimbus Bed', items: ['wool', 'quick_wool'], family: 1026 },
    { facility: 'Nimbus Bed', items: ['petals'], family: 1021 },
    { facility: 'Starfall Hammock', items: ['star'], family: 1001 },
    { facility: 'Starfall Hammock', items: ['gold_speck_cap'], family: 1063 },
    { facility: 'Floral Windmill', family: 1023 },
];

// The id of the only family that can make `item` at `facility`, or null when any Aniimo with the
// ability can.
export function recipeFamily(facility, item) {
    const base = String(item || '').split('__')[0];
    return RECIPE_FAMILIES.find(f => f.facility === facility && (!f.items || f.items.includes(base)))?.family ?? null;
}

/// The letter the game shows for a personality, and the personality it rules out.
export function personalityLetter(name) {
    const pair = PERSONALITY_PAIRS.find(p => p.names.includes(name));
    return pair ? pair.letters[pair.names.indexOf(name)] : null;
}

export function opposedPersonality(name) {
    const pair = PERSONALITY_PAIRS.find(p => p.names.includes(name));
    return pair ? pair.names[1 - pair.names.indexOf(name)] : null;
}

// Display order for facility categories. Auxiliary facilities (Storage Unit, power/climate
// buildings) are deliberately excluded here: they don't produce items.
export const FACILITY_CATEGORIES = ['Materials', 'Environment', 'Aniimo Materials', 'Materials Processing'];

// Facility name -> category, so other pages can group by the same categories as the facility
// input cards (Materials/Aniimo Materials are grower facilities, Materials Processing is processor
// facilities).
export const FACILITY_CATEGORY_BY_NAME = new Map(FACILITIES.map(f => [f.name, f.category]));

// Highest RV (Homeland) level in the game.
export const MAX_HOME_LEVEL = 22;

// Highest level of each upgrade module at each RV level (index = RV level - 1).
export const MODULE_MAX_LEVELS = {
    ecological_module: [0, 0, 1, 1, 1, 1, 2, 3, 3, 3, 4, 5, 5, 6, 6, 6, 7, 8, 8, 8, 9, 9],
    kitchen_module: [0, 1, 1, 2, 2, 2, 2, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 7],
    resource_detector: [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 4, 5, 5, 6, 6, 7, 7, 8, 9, 9, 10],
    crafting_module: [0, 0, 0, 0, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 4, 4, 5, 6, 7, 7, 7, 8],
};

// The value for RV level `homeLevel` in a per-RV list, keeping the last value past its end.
function atHomeLevel(list, homeLevel) {
    return list[Math.min(homeLevel, list.length) - 1];
}

// How many Aniimo can live on the homeland at each RV level (index = RV level - 1; `null` where
// unknown).
export const ANIIMO_MAX = [null, 8, 11, 14, 17, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 43, 44, 45, 46, 47];

// Everything a player at `homeLevel` could have: each facility at its highest unlocked level, as
// many as that RV level allows (see `counts`), and every module at its cap for that RV level. Returns the same shapes simple
// mode sends to the solver: `{ facilities: { name: [{count, level}] }, modules }`.
export function simpleSetup(homeLevel) {
    const facilities = {};
    FACILITIES.forEach(f => {
        const unlocked = Object.entries(f.unlocks || {})
            .filter(([, need]) => need <= homeLevel)
            .map(([level]) => Number(level));
        if (unlocked.length === 0) {
            facilities[f.name] = [{ count: 0, level: 1 }];
            return;
        }
        facilities[f.name] = [{ count: atHomeLevel(f.counts, homeLevel), level: Math.max(...unlocked) }];
    });
    const modules = Object.fromEntries(
        Object.entries(MODULE_MAX_LEVELS).map(([module, caps]) => [module, atHomeLevel(caps, homeLevel)])
    );
    return { facilities, modules };
}


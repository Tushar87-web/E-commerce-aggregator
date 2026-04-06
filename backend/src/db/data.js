const categories = [
  { id: 'c1', name: 'Electronics', slug: 'electronics', parent_id: null },
  { id: 'c2', name: 'Fashion', slug: 'fashion', parent_id: null },
  { id: 'c3', name: 'Home', slug: 'home', parent_id: null },
];

const platforms = [
  { id: 'pl1', name: 'Amazon', slug: 'amazon', color: '#FF9900' },
  { id: 'pl2', name: 'Flipkart', slug: 'flipkart', color: '#2874F0' },
  { id: 'pl3', name: 'Myntra', slug: 'myntra', color: '#FF3F6C' },
  { id: 'pl4', name: 'Snapdeal', slug: 'snapdeal', color: '#E40046' },
  { id: 'pl5', name: 'Tata CLiQ', slug: 'tata-cliq', color: '#212121' },
];

const products = [
  {
    id: 'p1',
    name: 'Apple iPhone 15 Pro (128GB) - Natural Titanium',
    brand: 'Apple',
    category_slug: 'electronics',
    category_name: 'Electronics',
    description: 'Forged in titanium and featuring the groundbreaking A17 Pro chip, a customizable Action button, and an even more versatile Pro camera system.',
    emoji: '📱',
    specs: { Screen: '6.1-inch Super Retina XDR OLED', Camera: '48MP Main + 12MP Ultra Wide + 12MP Telephoto', Processor: 'A17 Pro chip', Battery: '3274 mAh' },
    listings: [
      { id: 'l1', platform_id: 'pl1', platform_name: 'Amazon', platform_color: '#FF9900', price: 134900, original_price: 144900, rating: 4.8, review_count: 5320 },
      { id: 'l2', platform_id: 'pl2', platform_name: 'Flipkart', platform_color: '#2874F0', price: 135999, original_price: 144900, rating: 4.7, review_count: 4100 },
      { id: 'l3', platform_id: 'pl5', platform_name: 'Tata CLiQ', platform_color: '#212121', price: 133900, original_price: 144900, rating: 4.9, review_count: 1200 },
    ]
  },
  {
    id: 'p2',
    name: 'Sony WH-1000XM5 Noise Cancelling Wireless Headphones',
    brand: 'Sony',
    category_slug: 'electronics',
    category_name: 'Electronics',
    description: 'Industry-leading noise cancellation optimized to you. Magnificent Sound, engineered to perfection. Crystal clear hands-free calling.',
    emoji: '🎧',
    specs: { Type: 'Over-ear', Battery: 'Up to 30 hours', 'Noise Cancellation': 'Active', Connectivity: 'Bluetooth 5.2' },
    listings: [
      { id: 'l4', platform_id: 'pl1', platform_name: 'Amazon', platform_color: '#FF9900', price: 29990, original_price: 34990, rating: 4.6, review_count: 12500 },
      { id: 'l5', platform_id: 'pl2', platform_name: 'Flipkart', platform_color: '#2874F0', price: 29990, original_price: 34990, rating: 4.5, review_count: 3200 },
    ]
  },
  {
    id: 'p3',
    name: 'Nike Air Max 270 Men\\'s Running Shoes',
    brand: 'Nike',
    category_slug: 'fashion',
    category_name: 'Fashion',
    description: 'Nike\\'s first lifestyle Air Max brings you style, comfort and big attitude in the Nike Air Max 270.',
    emoji: '👟',
    specs: { Material: 'Mesh', Sole: 'Rubber', 'Closure Type': 'Lace-Up', Fit: 'Regular' },
    listings: [
      { id: 'l6', platform_id: 'pl3', platform_name: 'Myntra', platform_color: '#FF3F6C', price: 12995, original_price: 14995, rating: 4.4, review_count: 850 },
      { id: 'l7', platform_id: 'pl1', platform_name: 'Amazon', platform_color: '#FF9900', price: 13500, original_price: 14995, rating: 4.2, review_count: 320 },
    ]
  },
  {
    id: 'p4',
    name: 'Dyson V15 Detect Absolute Cord-Free Vacuum Cleaner',
    brand: 'Dyson',
    category_slug: 'home',
    category_name: 'Home',
    description: 'Dyson\\'s most powerful, intelligent cordless vacuum. Counts and measures the size of dust particles.',
    emoji: '🧹',
    specs: { Type: 'Cordless', Suction: '240 AW', Battery: 'Up to 60 mins', Weight: '3.1 kg' },
    listings: [
      { id: 'l8', platform_id: 'pl1', platform_name: 'Amazon', platform_color: '#FF9900', price: 65900, original_price: 65900, rating: 4.8, review_count: 420 },
      { id: 'l9', platform_id: 'pl5', platform_name: 'Tata CLiQ', platform_color: '#212121', price: 62900, original_price: 65900, rating: 4.9, review_count: 150 },
    ]
  },
  {
    id: 'p5',
    name: 'LG 55 inch OLED C3 4K Smart TV',
    brand: 'LG',
    category_slug: 'electronics',
    category_name: 'Electronics',
    description: 'LG OLED evo C3. The benchmark for OLED TVs. Brightness Booster makes it even brighter for a punchier picture.',
    emoji: '📺',
    specs: { Resolution: '4K Ultra HD', 'Refresh Rate': '120Hz', HDR: 'Dolby Vision', OS: 'webOS' },
    listings: [
      { id: 'l10', platform_id: 'pl1', platform_name: 'Amazon', platform_color: '#FF9900', price: 124990, original_price: 159990, rating: 4.7, review_count: 890 },
      { id: 'l11', platform_id: 'pl2', platform_name: 'Flipkart', platform_color: '#2874F0', price: 124000, original_price: 159990, rating: 4.6, review_count: 512 },
    ]
  }
];

module.exports = { categories, platforms, products };

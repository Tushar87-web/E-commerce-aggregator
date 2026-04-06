import sqlite3
import json

def init_database():
    print("Initializing Database...")
    conn = sqlite3.connect('pricemesh.db')
    cursor = conn.cursor()

    cursor.execute('''CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT,
        brand TEXT,
        category_slug TEXT,
        category_name TEXT,
        description TEXT,
        emoji TEXT,
        specs TEXT
    )''')

    cursor.execute('''CREATE TABLE IF NOT EXISTS listings (
        id TEXT PRIMARY KEY,
        product_id TEXT,
        platform_id TEXT,
        platform_name TEXT,
        platform_color TEXT,
        platform_slug TEXT,
        url TEXT,
        price INTEGER,
        original_price INTEGER,
        rating REAL,
        review_count INTEGER,
        FOREIGN KEY (product_id) REFERENCES products (id)
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT
    )''')
    
    # We create tables for cart and wishlist for realism
    cursor.execute('''CREATE TABLE IF NOT EXISTS cart (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        listing_id TEXT,
        quantity INTEGER
    )''')

    # SEED BASE PRODUCTS
    base_products = [
        {
            "id": "p1", "name": "Apple iPhone 15 Blue 128GB", "brand": "Apple", 
            "category_slug": "electronics", "category_name": "Electronics", 
            "description": "Dynamic Island bubbles up alerts.", 
            "emoji": "📱", "specs": json.dumps({"Screen": "6.1"})
        },
        {
            "id": "p2", "name": "Sony WH-1000XM5 Noise Cancelling Headphones", "brand": "Sony", 
            "category_slug": "electronics", "category_name": "Electronics", 
            "description": "Industry leading noise cancellation-two processors control 8 microphones.", 
            "emoji": "🎧", "specs": json.dumps({"Type": "Over-Ear", "Battery": "30 hrs"})
        },
        {
            "id": "p3", "name": "Nike Air Max 270 Men's Running Shoes", "brand": "Nike", 
            "category_slug": "fashion", "category_name": "Fashion", 
            "description": "Nike's first lifestyle Air Max brings you style, comfort and big attitude.", 
            "emoji": "👟", "specs": json.dumps({"Material": "Mesh", "Sole": "Rubber"})
        },
        {
            "id": "p4", "name": "Dyson V15 Detect Absolute Vacuum", "brand": "Dyson", 
            "category_slug": "home", "category_name": "Home", 
            "description": "Dyson's most powerful, intelligent cordless vacuum.", 
            "emoji": "🧹", "specs": json.dumps({"Type": "Cordless", "Suction": "240 AW"})
        }
    ]
    
    base_listings = [
        {"id": "l1", "product_id": "p1", "platform_id": "pl2", "platform_name": "Flipkart", 
         "platform_color": "#2874F0", "platform_slug": "flipkart", 
         "url": "https://www.flipkart.com/apple-iphone-15-blue-128-gb/p/itmbf14ef54f645d", 
         "price": 0, "original_price": 79900, "rating": 4.6, "review_count": 8000},
        {"id": "l2", "product_id": "p2", "platform_id": "pl1", "platform_name": "Amazon", 
         "platform_color": "#FF9900", "platform_slug": "amazon", "url": "", 
         "price": 29990, "original_price": 34990, "rating": 4.8, "review_count": 12000},
        {"id": "l3", "product_id": "p3", "platform_id": "pl3", "platform_name": "Myntra", 
         "platform_color": "#FF3F6C", "platform_slug": "myntra", "url": "", 
         "price": 12995, "original_price": 14995, "rating": 4.4, "review_count": 850},
        {"id": "l4", "product_id": "p4", "platform_id": "pl5", "platform_name": "Tata CLiQ", 
         "platform_color": "#212121", "platform_slug": "tatacliq", "url": "", 
         "price": 62900, "original_price": 65900, "rating": 4.9, "review_count": 150}
    ]

    for p in base_products:
        cursor.execute('''INSERT OR IGNORE INTO products (id, name, brand, category_slug, category_name, description, emoji, specs) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)''', 
            (p['id'], p['name'], p['brand'], p['category_slug'], p['category_name'], p['description'], p['emoji'], p['specs']))
            
    for l in base_listings:
        cursor.execute('''INSERT OR IGNORE INTO listings (id, product_id, platform_id, platform_name, platform_color, platform_slug, url, price, original_price, rating, review_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (l['id'], l['product_id'], l['platform_id'], l['platform_name'], l['platform_color'], l['platform_slug'], l['url'], l['price'], l['original_price'], l['rating'], l['review_count']))

    # Seed Admin User
    cursor.execute('''INSERT OR IGNORE INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)''',
                   ('u1', 'Admin', 'admin@pricemesh.com', 'Password123!', 'admin'))

    conn.commit()
    print("Database Initialized Successfully.")
    conn.close()

if __name__ == '__main__':
    init_database()

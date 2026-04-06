from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import json

app = Flask(__name__)
CORS(app) # Allow frontend to access API

def get_db():
    conn = sqlite3.connect('pricemesh.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/api/categories', methods=['GET'])
def get_categories():
    return jsonify({"data": [
        { "id": 'c1', "name": 'Electronics', "slug": 'electronics', "parent_id": None },
        { "id": 'c2', "name": 'Fashion', "slug": 'fashion', "parent_id": None },
        { "id": 'c3', "name": 'Home', "slug": 'home', "parent_id": None },
    ]})

@app.route('/api/platforms', methods=['GET'])
def get_platforms():
    return jsonify({"data": [
        { "id": 'pl1', "name": 'Amazon', "color": '#FF9900', "slug": 'amazon' },
        { "id": 'pl2', "name": 'Flipkart', "color": '#2874F0', "slug": 'flipkart' },
        { "id": 'pl3', "name": 'Myntra', "color": '#FF3F6C', "slug": 'myntra' },
        { "id": 'pl4', "name": 'Croma', "color": '#00E676', "slug": 'croma' },
        { "id": 'pl5', "name": 'Tata CLiQ', "color": '#212121', "slug": 'tatacliq' }
    ]})

@app.route('/api/products', methods=['GET'])
def get_products():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM products")
    products_db = [dict(row) for row in cur.fetchall()]
    
    # Attach listings
    for p in products_db:
        p['specs'] = json.loads(p['specs']) if p['specs'] else {}
        cur.execute("SELECT * FROM listings WHERE product_id = ?", (p['id'],))
        p['listings'] = [dict(row) for row in cur.fetchall()]
        
    conn.close()
    
    # Basic filtering logic
    query = request.args.get('q', '').lower()
    cat = request.args.get('category', '')
    
    filtered = []
    for p in products_db:
        if cat and p['category_slug'] != cat:
            continue
        if query and query not in p['name'].lower() and query not in p['brand'].lower():
            continue
            
        # Flatten the best listing into the product for the frontend list view
        if p.get('listings'):
            best = min(p['listings'], key=lambda x: x['price'] if x['price'] > 0 else float('inf'))
            p['listing_id'] = best['id']
            p['price'] = best['price']
            p['original_price'] = best['original_price']
            p['platform_id'] = best['platform_id']
            p['platform_name'] = best['platform_name']
            p['platform_color'] = best['platform_color']
            p['url'] = best['url']
            p['rating'] = best['rating']
            p['review_count'] = best['review_count']
        else:
            p['listing_id'] = None
            p['price'] = 0
            p['original_price'] = 0
            
        filtered.append(p)
        
    return jsonify({"data": filtered, "pagination": {"total": len(filtered), "page": 1, "limit": 20}})

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email = ? AND password = ?", (data.get('email'), data.get('password')))
    user = cur.fetchone()
    conn.close()
    if user:
        return jsonify({"token": "mock_jwt_token", "user": dict(user)})
    else:
        return jsonify({"message": "Invalid credentials"}), 401
        
@app.route('/api/cart', methods=['GET', 'POST', 'DELETE'])
def cart():
    # Simplistic mock for the cart using a global var just for the demo
    return jsonify({"items": [], "total_items": 0, "subtotal": 0})

@app.route('/api/wishlist', methods=['GET'])
def wishlist():
    return jsonify({"data": []})

if __name__ == '__main__':
    print("Starting Flask API Server on http://localhost:5000")
    app.run(port=5000, debug=True)

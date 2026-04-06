import sqlite3
import time
import re
from curl_cffi import requests
from bs4 import BeautifulSoup

def scrape_flipkart_price(url):
    print(f"[WORKER] Fetching {url}")
    try:
        response = requests.get(url, impersonate="chrome")
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            matches = soup.find_all(string=re.compile(r'^₹[0-9,]+$'))
            prices = []
            for match in matches:
                val = match.replace('₹', '').replace(',', '').strip()
                if val.isdigit():
                    prices.append(int(val))
            if prices:
                return prices[0]
    except Exception as e:
        print(f"[ERROR] Scraper Exception: {e}")
    return None

def run_worker_loop():
    print("Starting background worker pipeline...")
    conn = sqlite3.connect('pricemesh.db')
    cursor = conn.cursor()

    cursor.execute("SELECT id, url, platform_slug FROM listings WHERE url IS NOT NULL")
    listings = cursor.fetchall()
    
    print(f"Found {len(listings)} listings to update.")
    
    for listing in listings:
        list_id, url, platform = listing
        if platform == 'flipkart':
            live_price = scrape_flipkart_price(url)
            if live_price:
                print(f"[UPDATE] Setting Listing {list_id} to Rs. {live_price}")
                cursor.execute("UPDATE listings SET price = ? WHERE id = ?", (live_price, list_id))
                conn.commit()
            time.sleep(2) # Anti-ban delay
            
    conn.close()
    print("Worker loop finished.")

if __name__ == "__main__":
    # In a real app this would be inside a while True loop or cronjob
    run_worker_loop()

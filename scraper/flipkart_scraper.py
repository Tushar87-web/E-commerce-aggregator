from curl_cffi import requests
from bs4 import BeautifulSoup
import re

def get_flipkart_price(url):
    print(f"[INIT] Initializing Scraper...")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
    }
    
    print(f"[NETWORK] Fetching live HTML from Flipkart...")
    try:
        # Instead of generic headers, we use 'impersonate="chrome"' which perfectly
        # mimics a Chrome browser's TLS fingerprints, bypassing Cloudflare/Bot protection.
        response = requests.get(url, impersonate="chrome")
        
        if response.status_code != 200:
            print(f"[ERROR] Error fetching page. (Status code: {response.status_code})")
            return None
            
        print("[SUCCESS] HTML downloaded successfully! Parsing for price...")
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # We extract using a regular expression checking for pure currency formats (₹<numbers>) 
        # instead of CSS classes because Flipkart randomizes their class names to stop scrapers.
        currency_pattern = re.compile(r'^₹[0-9,]+$')
        matches = soup.find_all(string=currency_pattern)
        
        prices = []
        for match in matches:
            clean_str = match.replace('₹', '').replace(',', '').strip()
            if clean_str.isdigit():
                prices.append(int(clean_str))
                
        if prices:
            # The actual product price is usually the first highly visible one matching this regex format
            # Sometimes it finds EMI options or "Save $X", but the main price is prioritized in DOM.
            main_price = prices[0]
            print("\n" + "="*50)
            print(f"[FOUND] LIVE PRICE EXTRACTED: Rs. {main_price:,}")
            print("="*50 + "\n")
            return main_price
        else:
            print("[ERROR] Could not locate the price in the HTML. Flipkart might have presented a Captcha.")
            return None

    except Exception as e:
        print(f"[ERROR] A network error occurred: {e}")

if __name__ == "__main__":
    # Test URL: iPhone 15 Blue 128GB
    test_url = "https://www.flipkart.com/apple-iphone-15-blue-128-gb/p/itmbf14ef54f645d"
    get_flipkart_price(test_url)

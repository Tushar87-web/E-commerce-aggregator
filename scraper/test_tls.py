from curl_cffi import requests
from bs4 import BeautifulSoup
import re

url = "https://www.flipkart.com/apple-iphone-15-blue-128-gb/p/itmbf14ef54f645d"
# Use Chrome impersonation
response = requests.get(url, impersonate="chrome")

print(response.status_code)
if response.status_code == 200:
    soup = BeautifulSoup(response.text, 'html.parser')
    matches = soup.find_all(string=re.compile(r'^₹[0-9,]+$'))
    prices = []
    for match in matches:
        val = match.replace('₹', '').replace(',', '').strip()
        if val.isdigit():
            prices.append(int(val))
    if prices:
        print(f"Price found! Rs. {prices[0]}")
    else:
        print("No price found in HTML. Check structure / Captcha.")
else:
    print("Failed to fetch.")

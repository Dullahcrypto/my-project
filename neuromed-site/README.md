# Neuromed Medical website

Static website for Neuromed Medical, a neurology and neurodiagnostics clinic in Jabi, Abuja.
Plain HTML, CSS and a little JavaScript: no build step, no server code.

```
index.html      Homepage
privacy.html    Privacy policy (Nigeria Data Protection Act 2023)
404.html        "Page not found" page
css/styles.css  All styles
js/main.js      FAQ accordion and WhatsApp booking form
assets/img/     Logo, icons and photos (see CREDITS.md)
robots.txt, sitemap.xml
```

## Preview locally

```sh
cd neuromed-site
python3 -m http.server 8000
# open http://localhost:8000
```

## How booking works

The booking form does not need a server. When a patient presses
"Send request on WhatsApp", `js/main.js` writes their name, phone, service and symptoms
into a WhatsApp message to **+234 813 102 6221** and opens WhatsApp; the patient presses send.
To change the number, edit `WHATSAPP_NUMBER` in `js/main.js` and the `wa.me` links in the HTML.

## Put it online (free)

Any static host works. Two easy options:

**Netlify**
1. Sign in at netlify.com, choose *Add new site → Deploy manually*.
2. Drag the `neuromed-site` folder onto the page.
3. *Domain management → Add a domain*: `neuromedmedical.com.ng`, then follow
   Netlify's instructions to update the DNS records at your `.com.ng` registrar.

**Cloudflare Pages**
1. Connect this GitHub repository, set the build output directory to `neuromed-site`,
   leave the build command empty.
2. Add the custom domain `neuromedmedical.com.ng` under *Custom domains*.

HTTPS is set up automatically by both.

## After launch

- Submit `https://neuromedmedical.com.ng/sitemap.xml` in Google Search Console.
- Claim or create the clinic's Google Business Profile with the same name, address,
  phone numbers and hours as the site, and link it to the website.
- Send a test booking from a phone to check the WhatsApp message arrives.

## Before launch, confirm with the clinic

- Phone numbers, opening hours and address.
- The neurologist approves the "epilepsy expertise" line and the FAQ answers.
- The privacy policy matches how the clinic actually handles patient data.
- Replace stock photos with real clinic photos when available (get written consent
  from anyone pictured).
- A larger version of the logo (PNG or SVG) to replace `assets/img/logo.jpg`.

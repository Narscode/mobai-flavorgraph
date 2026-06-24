# 📋 Step‑by‑Step Guide: Run **MediaCrawler** via Apify (Free‑Trial China Proxy)

> **Goal** – Connect the open‑source `MediaCrawler` scraper to Apify’s China proxy (free‑trial credits) so you can crawl Xiaohongshu (XHS) despite the geo‑restriction.

---

## 1️⃣ Create an Apify Account & Activate Free Credits
1. Open <https://apify.com/> and click **Sign up**.
2. Register with your email (no credit‑card required).
3. After confirming the email, you land on the **Dashboard**.
4. In the left‑hand menu choose **Billing → Add credit**.
5. Click **“Add free credits (10 USD)”** – the credits are automatically added to your account and are valid for 30 days.
6. *(Optional)* Verify you have a **China proxy** in the plan: go to **Integrations → Apify Proxy** – the list should show `China` as an available region.

---

## 2️⃣ Retrieve Your China Proxy URL & Credentials
1. In the Dashboard, navigate to **Integrations → Apify Proxy**.
2. Click **Generate new proxy**.
3. Set **Country** = **China** (CN).
4. Copy the generated URL – it will look like:
   ```text
   http://proxy.apify.com:8000?country=cn
   ```
5. Note down your **Apify username** and **API token** (found under **Account → API token**). You’ll need them for HTTP‑basic authentication.

---

## 3️⃣ Prepare the MediaCrawler Project
### 3.1 Clone the repo
```bash
# Choose a folder inside your workspace, e.g. ~/mobai-flavorgraph/mobai-poc
cd ~/mobai-flavorgraph
git clone https://github.com/NanmiCoder/MediaCrawler.git
cd MediaCrawler
```
### 3.2 Install dependencies
```bash
# Ensure Node ≥ 18 is installed (macOS comes with it)
npm ci   # installs exact versions from package‑lock.json
```
### 3.3 Create an `.env` file for Apify credentials
Create a file named `.env` in the root of the repo:
```text
APIFY_USER=your_apify_username
APIFY_TOKEN=your_apify_api_token
APIFY_PROXY_URL=http://proxy.apify.com:8000?country=cn
```
*Replace `your_apify_username` and `your_apify_token` with the values from step 2.*

---

## 4️⃣ Wire the China Proxy into MediaCrawler
MediaCrawler uses **axios** for HTTP requests (see `src/request.js`).
1. Open `src/request.js` (or the equivalent request helper).
2. Add the following snippet after the `axios` import:
   ```js
   const axios = require('axios');
   const { APIFY_PROXY_URL, APIFY_USER, APIFY_TOKEN } = process.env;
   const proxyAgent = APIFY_PROXY_URL
       ? {
           host: new URL(APIFY_PROXY_URL).hostname,
           port: Number(new URL(APIFY_PROXY_URL).port),
           auth: { username: APIFY_USER, password: APIFY_TOKEN },
         }
       : null;
   const axiosInstance = axios.create({
       proxy: proxyAgent,
       timeout: 30_000,
   });
   module.exports = axiosInstance; // export the configured instance
   ```
3. Replace any direct `axios.get/post` calls with `axiosInstance.get/post`.
4. Save the file.
> **Tip:** If the repo already exports a custom `httpClient`, just inject the proxy config there.

---

## 5️⃣ Run a Test Crawl (Local – uses Apify free‑trial proxy)
```bash
# From the MediaCrawler root directory
node src/main.js   # or the entry point defined by the repo
```
You should see console output similar to:
```
[INFO] Using Apify proxy: http://proxy.apify.com:8000?country=cn
[INFO] Requesting https://www.xiaohongshu.com/... (via China IP)
[SUCCESS] Received 200 OK – XHS page loaded!
```
If you get a **403/Geo‑restriction** error, double‑check that the `APIFY_PROXY_URL` includes `?country=cn` and that your `.env` values are correctly loaded (restart the process after any change).

---

## 6️⃣ Deploy to Apify (Optional – run as a cloud actor)
1. In the Apify Dashboard click **Actors → Create new**.
2. Choose **Node.js** runtime, give it a name (e.g., `media‑crawler‑xhs`).
3. Set **Source code** → **Git repository** → paste the MediaCrawler repo URL.
4. In **Environment variables** add the same keys from your local `.env`.
5. In the **Settings** tab enable **Apify Proxy** and set **Country** to **China**.
6. Save and click **Run** – the logs will show the same proxy‑connected request.

---

## ✅ Quick Checklist
- [ ] Apify account created & free credits added.
- [ ] China proxy URL & credentials saved in `.env`.
- [ ] MediaCrawler cloned & dependencies installed.
- [ ] Proxy injected into the request layer.
- [ ] Local test run returns **200 OK** from XHS.
- [ ] (Optional) Actor deployed on Apify.
- [ ] Guide saved/exported as PDF.

---

**Now you should be able to scrape Xiaohongshu from Indonesia without hitting the geo‑restriction, using the free‑trial China proxy provided by Apify.**

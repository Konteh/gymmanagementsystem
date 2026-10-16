/**
 * Capture GymFlow screens and print a 16:9 presentation PDF.
 * Usage: node scripts/build-demo-pdf.mjs
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import QRCode from "qrcode";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPdf = path.join(root, "public", "GymFlow-demo-flow.pdf");
const tmpDir = "/tmp/gymflow-demo-deck";
const htmlPath = path.join(tmpDir, "deck.html");
const base = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:43127";
const chrome = process.env.CHROME_PATH ?? "/usr/local/bin/google-chrome";

mkdirSync(tmpDir, { recursive: true });
mkdirSync(path.join(root, "public"), { recursive: true });

const shots = {};

function dataUrl(file) {
  return `data:image/png;base64,${readFileSync(file).toString("base64")}`;
}

async function shot(page, name, options = {}) {
  const file = path.join(tmpDir, `${name}.png`);
  await page.screenshot({ path: file, type: "png", ...options });
  shots[name] = file;
  console.log("shot", name);
}

function parseCookies(headers) {
  const raw = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
  return raw.map((entry) => {
    const [pair] = entry.split(";");
    const eq = pair.indexOf("=");
    return {
      name: pair.slice(0, eq),
      value: pair.slice(eq + 1),
      domain: "127.0.0.1",
      path: "/",
    };
  });
}

async function loginCookies(email) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "gymflow-demo" }),
  });
  if (!response.ok) throw new Error(`login ${email} ${response.status}`);
  return parseCookies(response.headers);
}

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: chrome,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(25000);

  await page.goto(`${base}/`, { waitUntil: "load" });
  await shot(page, "home");

  await page.goto(`${base}/login`, { waitUntil: "load" });
  await shot(page, "login");

  await page.goto(`${base}/signup`, { waitUntil: "load" });
  await shot(page, "signup");

  await page.setCookie(...(await loginCookies("maria.s@example.com")));
  await page.goto(`${base}/owner/members`, { waitUntil: "load" });
  await page.waitForFunction(() => document.body.innerText.includes("Lamin Jallow"));
  await shot(page, "members");

  await page.goto(`${base}/owner`, { waitUntil: "load" });
  await shot(page, "owner");

  await page.deleteCookie({ name: "gf_access" }, { name: "gf_refresh" });
  await page.setCookie(...(await loginCookies("iris.p@example.org")));
  await page.goto(`${base}/admin/owners`, { waitUntil: "load" });
  await page.waitForFunction(() => document.body.innerText.includes("Bakau"));
  await shot(page, "admin");

  const qrPng = await QRCode.toDataURL(`${base}/g/demo-bakau-powerhouse`, {
    width: 640,
    margin: 1,
    color: { dark: "#172b4d", light: "#ffffff" },
  });
  writeFileSync(
    path.join(tmpDir, "qr-poster.html"),
    `<!doctype html><html><head><style>
      body{margin:0;background:#f3f6fa;font-family:ui-sans-serif,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh}
      .card{background:#fff;border:1px solid #e4eaf2;border-radius:24px;padding:40px 48px;text-align:center;width:520px}
      .k{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#16a6a0;font-weight:700}
      h1{margin:12px 0 24px;font-size:32px;color:#172b4d}
      img{width:280px;height:280px}
      p{color:#5b6b82;font-size:14px;line-height:1.45}
    </style></head><body>
      <div class="card">
        <div class="k">Scan to check in</div>
        <h1>Bakau Powerhouse</h1>
        <img src="${qrPng}" alt="QR" />
        <p>Open the camera app, point at the code, then enter the phone number the desk saved for you.</p>
      </div>
    </body></html>`,
  );
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`file://${path.join(tmpDir, "qr-poster.html")}`, { waitUntil: "load" });
  await shot(page, "qr");

  writeFileSync(
    path.join(tmpDir, "phone.html"),
    `<!doctype html><html><head><style>
      body{margin:0;background:#d8dee8;font-family:ui-sans-serif,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh}
      .phone{width:360px;height:740px;background:#f3f6fa;border-radius:36px;border:10px solid #172b4d;padding:28px 20px;box-shadow:0 30px 60px rgba(15,34,56,.25)}
      .brand{font-weight:700;color:#172b4d}
      .k{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#16a6a0;font-weight:700;margin-top:28px}
      h1{margin:8px 0 0;font-size:26px;color:#172b4d}
      .hello{color:#5b6b82;font-size:13px;margin-top:22px}
      .name{font-size:24px;font-weight:700;color:#172b4d}
      .box{background:#fff;border-radius:16px;padding:16px;margin-top:16px;border:1px solid #e4eaf2}
      .row{display:flex;justify-content:space-between;align-items:flex-start}
      .muted{font-size:12px;color:#5b6b82}
      .plan{font-size:18px;font-weight:700;margin-top:4px}
      .badge{background:#e8f7f6;color:#0f766e;font-size:11px;font-weight:700;border-radius:999px;padding:4px 8px}
      .primary{margin-top:16px;background:#16a6a0;color:#fff;border-radius:12px;text-align:center;padding:14px;font-weight:600}
      .ghost{margin-top:10px;border:1px solid #dce3ee;border-radius:12px;text-align:center;padding:12px;font-weight:600;color:#172b4d;background:#fff}
    </style></head><body>
      <div class="phone">
        <div class="brand">GymFlow</div>
        <div class="k">Check in</div>
        <h1>Bakau Powerhouse</h1>
        <p class="muted" style="margin:6px 0 0">Bertil Harding Highway, Bakau</p>
        <div class="hello">Hello</div>
        <div class="name">Lamin Jallow</div>
        <div class="box">
          <div class="row"><div><div class="muted">Membership</div><div class="plan">Strength Monthly</div></div><div class="badge">Active</div></div>
          <p style="margin:12px 0 0;font-size:14px;color:#172b4d">18 days left</p>
          <p class="muted" style="margin:6px 0 0">Renew for D1,500</p>
        </div>
        <div class="primary">Check in</div>
        <div class="ghost">Pay to renew</div>
      </div>
    </body></html>`,
  );
  await page.setViewport({ width: 900, height: 900, deviceScaleFactor: 2 });
  await page.goto(`file://${path.join(tmpDir, "phone.html")}`, { waitUntil: "load" });
  await shot(page, "door-card");

  await browser.close();
}

function img(name) {
  return dataUrl(shots[name]);
}

function slide(inner) {
  return `<section class="slide">${inner}</section>`;
}

function buildHtml() {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>GymFlow demo flow</title>
<style>
  @page { size: 13.333in 7.5in; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #0f2238; }
  body { font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #172b4d; }
  .slide {
    width: 13.333in; height: 7.5in;
    page-break-after: always; break-after: page;
    padding: 0.55in 0.65in; position: relative; overflow: hidden; background: #f3f6fa;
  }
  .slide:last-child { page-break-after: auto; }
  .kicker { font-size: 12px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #16a6a0; }
  h1 { font-size: 42px; line-height: 1.12; margin: 14px 0 0; letter-spacing: -0.03em; }
  h2 { font-size: 28px; line-height: 1.15; margin: 8px 0 0; letter-spacing: -0.03em; }
  p { margin: 10px 0 0; font-size: 16px; line-height: 1.45; color: #5b6b82; }
  .row { display: flex; gap: 22px; margin-top: 22px; align-items: stretch; }
  .col { flex: 1; min-width: 0; }
  .card { background: #fff; border: 1px solid #e4eaf2; border-radius: 18px; padding: 18px 20px; }
  .shot { width: 100%; height: 4.55in; object-fit: cover; object-position: top left; border-radius: 14px; border: 1px solid #dce3ee; background: #fff; }
  .shot.phone { width: auto; height: 5.1in; object-fit: contain; object-position: center; border: 0; background: transparent; display: block; margin: 0 auto; }
  .who { font-size: 12px; font-weight: 700; color: #16a6a0; letter-spacing: 0.08em; text-transform: uppercase; }
  .stepn { font-size: 13px; font-weight: 700; color: #16a6a0; }
  ul { margin: 12px 0 0; padding-left: 18px; color: #203047; font-size: 15px; line-height: 1.55; }
  li { margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 16px; background: #fff; border-radius: 12px; overflow: hidden; }
  th, td { text-align: left; padding: 11px 14px; border-bottom: 1px solid #e4eaf2; }
  th { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #5b6b82; }
  .flow { display: flex; gap: 8px; margin-top: 28px; }
  .flow .box { flex: 1; background: #fff; border-radius: 14px; padding: 12px; border: 1px solid #e4eaf2; min-height: 128px; }
  .flow .n { font-size: 11px; font-weight: 800; color: #16a6a0; }
  .flow b { display: block; margin-top: 6px; font-size: 13px; color: #172b4d; }
  .flow span { display: block; margin-top: 4px; font-size: 12px; color: #5b6b82; line-height: 1.35; }
  .foot { position: absolute; left: 0.65in; right: 0.65in; bottom: 0.32in; display: flex; justify-content: space-between; font-size: 11px; color: #8a97ab; }
  .cover-foot { color: rgba(255,255,255,0.45); }
  .logo { width: 32px; height: 32px; border-radius: 8px; background: #16a6a0; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; }
  .mark { display: flex; align-items: center; gap: 10px; color: #fff; font-weight: 700; }
  .say { background: #eef8f7; border-radius: 12px; padding: 12px 14px; margin-top: 14px; font-size: 14px; color: #172b4d; }
</style>
</head>
<body>
${slide(`
  <div style="position:absolute;inset:0;background:#0f2238;padding:0.65in;color:#fff">
    <div class="mark"><div class="logo">G</div>GymFlow</div>
    <p class="kicker" style="margin-top:1.35in">Prototype · demo &amp; presentation pack</p>
    <h1 style="font-size:50px;max-width:10.2in;color:#fff">The gym desk, a printed QR,<br/>and no member logins.</h1>
    <p style="max-width:8.6in;font-size:18px;color:rgba(255,255,255,.78)">A multi-tenant gym system for independent clubs. Super Admin controls gym owners. Owners add members. Members scan the door QR with the phone camera, check in, see days left, and pay to renew.</p>
    <p style="margin-top:28px;color:rgba(255,255,255,.7)">Bakau Powerhouse demo · amounts in GMD · October 2026</p>
    <div class="foot cover-foot"><span>GymFlow prototype</span><span>01 · Cover</span></div>
  </div>
`)}
${slide(`
  <p class="kicker">The product</p>
  <h2>Three roles. One wall between gyms.</h2>
  <div class="row">
    <div class="card col"><div class="who">Super Admin</div><h3 style="margin:8px 0 0;font-size:20px">Platform</h3><p>Onboards gym owners, approves or suspends gyms, and watches platform invoices. Never opens a member roster.</p></div>
    <div class="card col"><div class="who">Gym owner</div><h3 style="margin:8px 0 0;font-size:20px">The desk</h3><p>Creates the gym, adds members by name and phone, prints one QR, checks people in, and activates payments.</p></div>
    <div class="card col"><div class="who">Member</div><h3 style="margin:8px 0 0;font-size:20px">No account</h3><p>Once the desk adds them, they exist. They scan the printed QR. No app, no password, no typed URL.</p></div>
  </div>
  <p style="margin-top:22px">Simple on purpose. Later modules — staff apps, live payments, classes — can attach without mixing tenants.</p>
  <div class="foot"><span>GymFlow prototype</span><span>02 · Roles</span></div>
`)}
${slide(`
  <p class="kicker">User flow</p>
  <h2>Six moves from empty gym to a check-in at the door.</h2>
  <div class="flow">
    <div class="box"><div class="n">01</div><b>Owner signs up</b><span>Gym name, email, password. Members cannot self-register.</span></div>
    <div class="box"><div class="n">02</div><b>Admin approves</b><span>Super Admin sees gyms, not member phones.</span></div>
    <div class="box"><div class="n">03</div><b>Desk adds people</b><span>Name, phone, plan. They are in immediately.</span></div>
    <div class="box"><div class="n">04</div><b>Print one QR</b><span>One code for the gym, taped at the entrance.</span></div>
    <div class="box"><div class="n">05</div><b>Member scans</b><span>Camera opens check-in, days left, Pay to renew.</span></div>
    <div class="box"><div class="n">06</div><b>Desk activates</b><span>Pending renewal becomes paid. Due date moves.</span></div>
  </div>
  <p>Walk these screens live. Seeded password is <strong>gymflow-demo</strong>.</p>
  <div class="foot"><span>GymFlow prototype</span><span>03 · End-to-end flow</span></div>
`)}
${slide(`
  <div class="row" style="margin:0;height:5.9in">
    <div class="col" style="max-width:40%">
      <p class="stepn">Step 01</p>
      <h2>Gym owner creates an account</h2>
      <div class="say"><strong>Say this.</strong> A gym owner signs up. Members are not invited to create logins.</div>
      <ul>
        <li>Public page at /signup</li>
        <li>Gym is created so the desk can add people</li>
        <li>Super Admin still reviews the tenant</li>
      </ul>
    </div>
    <div class="col"><img class="shot" src="${img("signup")}" alt="Owner signup" /></div>
  </div>
  <div class="foot"><span>GymFlow prototype</span><span>04 · Owner signup</span></div>
`)}
${slide(`
  <div class="row" style="margin:0;height:5.9in">
    <div class="col" style="max-width:40%">
      <p class="stepn">Step 02</p>
      <h2>Super Admin approves the gym</h2>
      <div class="say"><strong>Say this.</strong> The platform operator sees gyms, not member files.</div>
      <ul>
        <li>iris.p@example.org</li>
        <li>Approve, reject, or suspend</li>
        <li>No member PII on this screen</li>
      </ul>
    </div>
    <div class="col"><img class="shot" src="${img("admin")}" alt="Super Admin gym owners" /></div>
  </div>
  <div class="foot"><span>GymFlow prototype</span><span>05 · Super Admin</span></div>
`)}
${slide(`
  <div class="row" style="margin:0;height:5.9in">
    <div class="col" style="max-width:36%">
      <p class="stepn">Step 03</p>
      <h2>The desk adds members</h2>
      <div class="say"><strong>Say this.</strong> Name, phone, plan. They are on the roster with no password.</div>
      <ul>
        <li>Plan, due date, days left</li>
        <li>Desk Check in</li>
        <li>Activate payment by hand</li>
        <li>Pause / resume</li>
      </ul>
    </div>
    <div class="col"><img class="shot" src="${img("members")}" alt="Owner member roster" /></div>
  </div>
  <div class="foot"><span>GymFlow prototype</span><span>06 · Member roster</span></div>
`)}
${slide(`
  <div class="row" style="margin:0;height:5.9in">
    <div class="col" style="max-width:38%">
      <p class="stepn">Step 04</p>
      <h2>Print one door QR</h2>
      <div class="say"><strong>Say this.</strong> One code for the gym. Members use the phone camera — no app, no typed URL.</div>
      <ul>
        <li>Owner → Door QR → Print</li>
        <li>On a real floor, open GymFlow with the LAN IP before printing</li>
      </ul>
    </div>
    <div class="col"><img class="shot" src="${img("qr")}" alt="Door QR poster" /></div>
  </div>
  <div class="foot"><span>GymFlow prototype</span><span>07 · Door QR</span></div>
`)}
${slide(`
  <div class="row" style="margin:0;height:5.9in">
    <div class="col" style="max-width:46%">
      <p class="stepn">Step 05</p>
      <h2>Scan, see days left, check in</h2>
      <div class="say"><strong>Say this.</strong> The camera opens this page. They type the phone the desk saved.</div>
      <ul>
        <li>Demo phone <strong>301 1191</strong> — Lamin Jallow</li>
        <li>Membership type + days left</li>
        <li>Check in</li>
        <li>Pay to renew</li>
      </ul>
    </div>
    <div class="col"><img class="shot phone" src="${img("door-card")}" alt="Member check-in on phone" /></div>
  </div>
  <div class="foot"><span>GymFlow prototype</span><span>08 · Member check-in</span></div>
`)}
${slide(`
  <div class="row" style="margin:0;height:5.9in">
    <div class="col" style="max-width:40%">
      <p class="stepn">Step 06</p>
      <h2>Pay to renew, activate at the desk</h2>
      <div class="say"><strong>Say this.</strong> Pay to renew sends a pending payment. The owner taps Activate when cash or Wave is collected.</div>
      <ul>
        <li>No live card processor in this prototype</li>
        <li>Activate extends the membership due date</li>
        <li>Owner Dues list also shows the pending item</li>
      </ul>
    </div>
    <div class="col"><img class="shot" src="${img("owner")}" alt="Owner dashboard" /></div>
  </div>
  <div class="foot"><span>GymFlow prototype</span><span>09 · Renewal</span></div>
`)}
${slide(`
  <p class="kicker">Live demo</p>
  <h2>Accounts on this prototype</h2>
  <p>Password for every seeded account: <strong>gymflow-demo</strong></p>
  <table>
    <thead><tr><th>Who</th><th>How to enter</th><th>What to show</th></tr></thead>
    <tbody>
      <tr><td>Super Admin</td><td>iris.p@example.org</td><td>Gym owners — approve / suspend</td></tr>
      <tr><td>Gym owner</td><td>maria.s@example.com</td><td>Members, Door QR, Dues, Activate</td></tr>
      <tr><td>Pending owner</td><td>uma.s@example.org</td><td>Waiting on Super Admin</td></tr>
      <tr><td>Member</td><td>No login · /g/demo-bakau-powerhouse</td><td>Phone 301 1191 · Lamin Jallow</td></tr>
    </tbody>
  </table>
  <p>On your PC: stop the old server, then <strong>git pull</strong> · <strong>npm run db:setup</strong> · <strong>npm run dev</strong> → http://127.0.0.1:43127</p>
  <div class="foot"><span>GymFlow prototype</span><span>10 · Credentials</span></div>
`)}
${slide(`
  <div style="position:absolute;inset:0;background:#0f2238;padding:0.65in;color:#fff">
    <p class="kicker">What’s next</p>
    <h1 style="max-width:10in;color:#fff">Simple on purpose.<br/>Ready for the next module.</h1>
    <div class="row" style="margin-top:36px">
      <div class="card col" style="background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.12)">
        <h3 style="margin:0;font-size:18px;color:#fff">Now</h3>
        <p style="color:rgba(255,255,255,0.75)">Super Admin, gym owners, desk members, one door QR, check-in, demo renewals in GMD.</p>
      </div>
      <div class="card col" style="background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.12)">
        <h3 style="margin:0;font-size:18px;color:#fff">Later, without a rewrite</h3>
        <p style="color:rgba(255,255,255,0.75)">Staff apps, live Wave or card payments, classes, reports. Tenant walls stay.</p>
      </div>
    </div>
    <p style="margin-top:48px;color:rgba(255,255,255,.75)">GymFlow · independent clubs · The Gambia</p>
    <div class="foot cover-foot"><span>GymFlow prototype</span><span>11 · Close</span></div>
  </div>
`)}
</body></html>`;
  writeFileSync(htmlPath, html);
}

async function printPdf() {
  const browser = await puppeteer.launch({
    executablePath: chrome,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
  await page.pdf({
    path: outPdf,
    width: "13.333in",
    height: "7.5in",
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  await browser.close();
  if (!existsSync(outPdf)) {
    console.error("PDF was not written");
    process.exit(1);
  }
  console.log("wrote", outPdf, `${Math.round(readFileSync(outPdf).length / 1024)}kb`);
}

await capture();
buildHtml();
await printPdf();

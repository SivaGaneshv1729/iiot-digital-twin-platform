import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'ppt_assets', 'app_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function captureDashboards() {
    console.log('Launching headless browser...');
    const browser = await puppeteer.launch({
        headless: "new",
        defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();
    
    // Inject auth token to bypass login
    console.log('Setting up Authentication...');
    await page.goto('http://localhost:5173/login');
    await page.evaluate(() => {
        // Fake a logged-in admin state
        localStorage.setItem('token', 'fake-jwt-token-for-screenshot-bypass');
        localStorage.setItem('user', JSON.stringify({ id: 1, username: 'admin', role: 'Admin' }));
    });

    // We might need to wait for telemetry to load or charts to animate
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const routes = [
        { url: 'http://localhost:5173/', filename: '1_ExecutiveDashboard.png' },
        { url: 'http://localhost:5173/mlops', filename: '2_MLOpsCenter.png' },
        { url: 'http://localhost:5173/machines', filename: '3_MachinesGrid.png' },
        { url: 'http://localhost:5173/audit', filename: '4_AuditLedger.png' }
    ];

    for (const route of routes) {
        console.log(`Navigating to ${route.url}...`);
        await page.goto(route.url, { waitUntil: 'networkidle2' });
        
        // Wait 3 extra seconds for WebGL, WebSockets, and Recharts animations to finish rendering
        await wait(3000); 
        
        const savePath = path.join(SCREENSHOT_DIR, route.filename);
        await page.screenshot({ path: savePath, fullPage: false });
        console.log(`Captured: ${route.filename}`);
    }

    await browser.close();
    console.log('All screenshots completed successfully!');
}

captureDashboards().catch(err => {
    console.error('Failed to capture screenshots:', err);
    process.exit(1);
});

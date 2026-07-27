const puppeteer = require('puppeteer');

(async () => {
  console.log('Starting puppeteer test...');
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: '/usr/bin/google-chrome'
  });
  const page = await browser.newPage();
  
  // Set local storage directly to simulate the draft
  console.log('Navigating to transactions page with action=new...');
  await page.goto('http://localhost:3000/transactions?action=new');
  
  await page.evaluate(() => {
    localStorage.setItem('sf_draft_transaction', JSON.stringify({
      amount: '999',
      txType: 'EXPENSE',
      date: '2026-07-27',
      description: 'Puppeteer Test Draft',
      merchant: 'Test Merchant',
      notes: 'Test Notes'
    }));
  });
  
  // Reload to let the page read the draft
  await page.goto('http://localhost:3000/transactions?action=new');
  
  console.log('Waiting for dialog to appear...');
  try {
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    console.log('Dialog appeared!');
    
    // Check if amount is 999
    const amountVal = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const amountInput = inputs.find(i => i.type === 'number' || i.placeholder === '0.00');
      return amountInput ? amountInput.value : null;
    });
    console.log('Amount field value:', amountVal);
    
    if (amountVal === '999') {
      console.log('SUCCESS: Draft was successfully loaded into the form!');
    } else {
      console.log('ERROR: Form opened but draft was not loaded.');
    }
  } catch (e) {
    console.log('ERROR: Dialog did not appear!', e.message);
  }

  await browser.close();
})();

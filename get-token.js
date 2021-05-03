const fs = require('fs');
const puppeteer = require('puppeteer');
const fastify = require('fastify');
const cors = require('fastify-cors');

const selectors = {
  mobileInput: 'input[appmobilenumber=true]',
  getOtp: 'ion-button',
  otpInput: '#mat-input-1',
  verifyOtpButton: 'ion-button',
};

function waitForSms() {
  return new Promise((resolve) => {
    const server = fastify();

    server.register(cors, {
      origin: true,
    });

    server.post('/otp', async (request, response) => {
      const query = new URLSearchParams(request.query);

      if (query.has('otp')) {
        response.send();
        setTimeout(() => {
          server.close();
          resolve(query.get('otp'));
        });
      }
    });

    server.listen(8888);
  });
}

function sleep(time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

(async () => {
  const config = require('./config.json');

  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();
  await page.goto('https://selfregistration.cowin.gov.in/');
  await page.waitForSelector(selectors.mobileInput);
  await sleep(2000);
  await page.type(selectors.mobileInput, config.phone);
  await page.click(selectors.getOtp);
  const otp = await waitForSms();

  await page.type(selectors.otpInput, otp);

  page.on('request', async (interceptedRequest) => {
    if (
      interceptedRequest.url().endsWith('/beneficiaries') &&
      interceptedRequest.method() === 'GET'
    ) {
      const headers = interceptedRequest.headers();

      interceptedRequest.abort();

      const auth = headers['authorization'];

      console.log(auth);

      config.auth = auth;

      fs.writeFileSync('config.json', JSON.stringify(config, null, 2));

      await browser.close();
    } else {
      interceptedRequest.continue();
    }
  });

  await page.setRequestInterception(true);

  await Promise.all([
    page.waitForNavigation(),
    page.click(selectors.verifyOtpButton),
  ]);

  await sleep(5000);
})();

import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir:'./e2e',
  fullyParallel:false,
  workers:1,
  timeout:45000,
  expect:{timeout:10000},
  reporter:'list',
  use:{
    ...devices['Desktop Chrome'],
    channel:process.env['CI'] ? undefined : 'msedge',
    baseURL:'http://127.0.0.1:4300',
    headless:true,
    reducedMotion:'reduce',
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
  },
  webServer:{
    command:'npm start -- --host 127.0.0.1 --port 4300',
    url:'http://127.0.0.1:4300',
    reuseExistingServer:!process.env['CI'],
    timeout:120000,
  },
});

const os = require('os');
const fs = require('fs');

const http = require('http');
import axios from 'axios';

const useIsoGit = process.argv.includes('--useIsoGit');
const useOffline = process.argv.includes('--useOffline');

// Function to read JSON file synchronously
function readJSONFileSync(filename: string): any {
  try {
    const data = fs.readFileSync(filename, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    throw err;
  }
}

const packageData: any = readJSONFileSync('package.json');
const version = packageData.version;

let channel: string = ''

if (version.includes('beta')) {
  channel = 'beta';
} else if (version.includes('alpha')) {
  channel = 'alpha';
} else if (version.includes('insiders')) {
  channel = 'insiders';
}

// Determine if running on CircleCI or locally with --e2e-local
const isLocalE2E = process.argv.includes('--e2e-local') && !process.env.CIRCLECI;

module.exports = {
    src_folders: ['build-e2e/remixdesktop/test/tests/app'],
    output_folder: './reports/tests',
    custom_commands_path: ['build-e2e/remix-ide-e2e/src/commands'],
    page_objects_path: '',
    globals_path: '',
    test_settings: {
      default: {
        enable_fail_fast: true,
        selenium_port: 4444,
        selenium_host: 'localhost',
        globals: {
          waitForConditionTimeout: 10000,
          asyncHookTimeout: 100000
        },
        screenshots: {
          enabled: true,
          path: './reports/screenshots',
          on_failure: true,
          on_error: true
        },
        webdriver: {
          start_process: true,
          timeout_options: {
            timeout: 60000,
            retry_attempts: 3
          }
        },
        desiredCapabilities: {
          browserName: 'chrome',
          javascriptEnabled: true,
          acceptSslCerts: true,
          'goog:chromeOptions': (() => {
            const type = os.type();
            const arch = os.arch();
            let binaryPath = "";
            // Check if running on CircleCI or locally
            let args = process.env.CIRCLECI ? ["--e2e"] : ["--e2e-local"];
            
            if(useIsoGit) args = [...args, '--useIsoGit'];
            if(useOffline) args = [...args, '--useOffline'];

            switch (type) {
              case 'Windows_NT':
                binaryPath = `./release/win-unpacked/Remix-Desktop-${channel}.exe`;
                break;
              case 'Darwin':
                binaryPath = arch === 'x64' ? 
                  "release/mac/Remix-Desktop.app/Contents/MacOS/Remix-Desktop" :
                  "release/mac-arm64/Remix-Desktop.app/Contents/MacOS/Remix-Desktop";
                break;
              case 'Linux':
                binaryPath = "release/linux-unpacked/remixdesktop";
                break;
            }
            
            return {
              binary: binaryPath,
              args: args
            };
          })()
        }
      }
    }
};

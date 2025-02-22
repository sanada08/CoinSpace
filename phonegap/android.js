'use strict';

const fse = require('fs-extra');
const path = require('path');
const ejs = require('ejs');
const utils = require('../cli/utils');
const pkg = require('../package.json');
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const buildPath = 'build';
const cordova = utils.cordova(buildPath);

const BUILD_NUMBER = parseInt(process.env.GITHUB_RUN_NUMBER || '1') + 2530;
const BRANCH = process.env.GITHUB_REF && process.env.GITHUB_REF.replace('refs/heads/', '');

async function run() {
  const config = ejs.render(fse.readFileSync('config.xml.template', 'utf-8'), {
    widget: {
      id: 'com.coinspace.app',
      name: 'Coin Wallet',
      version: pkg.version,
      androidVersionCode: BUILD_NUMBER,
    },
  });
  fse.writeFileSync(path.resolve(buildPath, 'config.xml'), config);

  /* eslint-disable max-len */
  cordova('platform add android@11.0.0 --save');
  cordova('plugin add cordova-plugin-androidx-adapter@1.1.3 --save');
  cordova('plugin add cordova-custom-config@5.1.1 --save');
  cordova('plugin add cordova-plugin-geolocation@4.1.0 --save');
  cordova('plugin add https://github.com/js-soft/phonegap-plugin-barcodescanner#57830dc1133e131f6094d6bb9a63175af508ab5c --save --variable ANDROID_SUPPORT_V4_VERSION=28.0.0');
  cordova('plugin add cordova-plugin-dialogs@2.0.2 --save');
  cordova('plugin add cordova-plugin-inappbrowser@5.0.0 --save');
  cordova('plugin add cordova-plugin-x-socialsharing@6.0.4 --save');
  cordova('plugin add cordova-plugin-fingerprint-aio@5.0.1 --save');
  cordova('plugin add cordova-plugin-customurlscheme@5.0.2 --save --variable URL_SCHEME=coinspace');
  cordova('plugin add https://github.com/CoinSpace/cordova-plugin-zendesk#4bf28de7fcd6759450f5fd56f2ec28677bc882da --save');
  cordova('plugin add cordova-plugin-safariviewcontroller@2.0.0 --save');
  cordova('plugin add cordova-plugin-app-review@3.1.0 --save');
  cordova('plugin add cordova-plugin-velda-devicefeedback@0.0.2 --save');

  if (process.env.RELEASE) {
    cordova('build android --release -- --packageType=apk');
    utils.shell(
      'zipalign -f 4 platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk \
      ../deploy/coinspace-release.apk',
      { cwd: buildPath }
    );
    utils.shell(
      'apksigner sign --ks-pass=pass:coinspace -ks ../release.keystore \
      ../deploy/coinspace-release.apk',
      { cwd: buildPath }
    );
    const destination = `${pkg.version}-${BRANCH || 'local'}/${pkg.name}-${process.env.BUILD_PLATFORM}-${pkg.version}.apk`;
    await storage.bucket(process.env.GOOGLE_CLOUD_BUCKET).upload('deploy/coinspace-release.apk', { destination });
  } else {
    cordova('build android');
  }
}

process.on('unhandledRejection', (err) => {
  throw err;
});

run();

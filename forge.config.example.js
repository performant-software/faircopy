const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
    packagerConfig: {
      asar: true,
      icon: './src/render-process/icons/icon',
      osxSign: {
        optionsForFile: (filePath) => {
          return {
            entitlements: 'faircopy_scripts/entitlements.mac.plist'
          };
        }
      },
      osxNotarize: {
        tool: 'notarytool',
        appleId: 'APPLE ID OF ACCOUNT WITH APPLE DEVELOPER SUBSCRIPTION',
        appleIdPassword: 'DEVELOPER APPLICATION PASSWORD',
        teamId: 'APPLE DEVELOPER TEAM ID'
      }
    },
    rebuildConfig: {},
    makers: [
      {
        name: '@electron-forge/maker-dmg',
        config: {
          platform: 'darwin',
          background: './public/img/DMG_background.png',
          icon: './public/icons/icon.icns',
          iconSize: 145,
          format: 'ULFO',
          contents: [
              { "x": 480, "y": 220, "type": "link", "path": "/Applications" },
              { "x": 140, "y": 220, "type": "file", "path": "<YOUR ABSOLUTE PATH TO PROJECT BASE DIR>/out/FairCopy-darwin-x64/FairCopy.app" }
          ]
        }
      },
      {
        name: '@electron-forge/maker-squirrel',
        config: {
          loadingGif: './public/img/install_spinner.gif',
          iconURL: 'https://raw.githubusercontent.com/performant-software/faircopy/main/public/icons/icon.ico',
          setupIcon: './public/icons/icon.ico',
          certificateFile: 'LOCATION OF APP SIGNING CERTIFICATE',
          certificatePassword: 'CERTIFICATE PASSWORD',
          platform: 'win32'
        }
      }
    ],
    publishers: [
      {
        name: '@electron-forge/publisher-github',
        config: {
          authToken: 'GITHUB PERSONAL ACCESS TOKEN WITH WRITE ACCESS TO REPO BELOW',
          repository: {
            owner: 'REPO OWNER',
            name: 'REPO NAME'
          },
          prerelease: true
        }
      }
    ],
    plugins: [
      {
        name: '@electron-forge/plugin-vite',
        config: {
          // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
          // If you are familiar with Vite configuration, it will look really familiar.
          build: [
            {
              // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
              entry: 'src/main.js',
              config: 'vite.main.config.mjs',
            },
            {
              entry: 'src/main-window-preload.js',
              config: 'vite.preload.config.mjs',
            },
            {
              entry: 'src/image-window-preload.js',
              config: 'vite.preload.config.mjs',
            },
            {
              entry: 'src/preview-window-preload.js',
              config: 'vite.preload.config.mjs',
            },
            {
              entry: 'src/project-window-preload.js',
              config: 'vite.preload.config.mjs',
            },
            {
              entry: 'src/worker-window-preload.js',
              config: 'vite.preload.config.mjs',
            }
          ],
          renderer: [
            {
              name: 'main_window',
              config: 'vite.renderer.config.mjs',
            },
          ],
        },
      },
      // Fuses are used to enable/disable various Electron functionality
      // at package time, before code signing the application
      new FusesPlugin({
        version: FuseVersion.V1,
        [FuseV1Options.RunAsNode]: false,
        [FuseV1Options.EnableCookieEncryption]: true,
        [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
        [FuseV1Options.EnableNodeCliInspectArguments]: false,
        [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
        [FuseV1Options.OnlyLoadAppFromAsar]: true,
      }),
    ],
  };
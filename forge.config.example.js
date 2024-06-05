const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
    packagerConfig: {
      asar: true,
      icon: './render/icons/icon',
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
          background: './src/render/img/DMG_background.png',
          icon: './src/render/icons/icon.icns',
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
          loadingGif: './src/render/img/install_spinner.gif',
          iconURL: 'https://raw.githubusercontent.com/performant-software/faircopy/main/render/icons/icon.ico',
          setupIcon: './src/render/icons/icon.ico',
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
        name: '@electron-forge/plugin-auto-unpack-natives',
        config: {},
      },
      {
        name: '@electron-forge/plugin-webpack',
        config: {
          mainConfig: './webpack.main.config.js',
          renderer: {
            config: './webpack.renderer.config.js',
            entryPoints: [
              {
                html: './src/index.html',
                js: './src/main-window-renderer.js',
                nodeIntegration: true,
                name: 'main_window',
                preload: {
                  js: './src/faircopy-preload.js',
                },
              },
              {
                html: './src/index.html',
                js: './src/project-window-renderer.js',
                nodeIntegration: true,
                name: 'project_window',
                preload: {
                  js: './src/faircopy-preload.js',
                },
              },
              {
                html: './src/index.html',
                js: './src/preview-window-renderer.js',
                nodeIntegration: true,
                name: 'preview_window',
                preload: {
                  js: './src/faircopy-preload.js',
                },
              },
              {
                html: './src/index.html',
                js: './src/image-window-renderer.js',
                nodeIntegration: true,
                name: 'image_window',
                preload: {
                  js: './src/faircopy-preload.js',
                },
              },
              {
                html: './src/index.html',
                js: './src/worker-window-renderer.js',
                nodeIntegration: true,
                name: 'worker_window',
                preload: {
                  js: './src/faircopy-preload.js',
                },
              },
            ],
          },
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
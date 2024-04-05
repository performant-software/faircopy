module.exports = {
    packagerConfig: {
      asar: true,
      osxSign: {
        optionsForFile: (filePath) => {
          return {
            entitlements: 'scripts/entitlements.mac.plist'
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
          background: './public/img/DMG_background.png',
          icon: './public/icon.ico',
          format: 'ULFO',
          platform: 'darwin'
        }
      },
      {
        name: '@electron-forge/maker-squirrel',
        config: {
          loadingGif: './public/img/install_spinner.gif',
          icon: './public/img/icon.ico',
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
    ],
  };
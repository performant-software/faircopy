module.exports = {
    packagerConfig: {
      asar: true,
      icon: './public/icons/icon',
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
          icon: './public/icons/icon.icns',
          format: 'ULFO',
          platform: 'darwin'
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
        name: '@electron-forge/plugin-auto-unpack-natives',
        config: {},
      },
    ],
  };
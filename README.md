FairCopy
====

FairCopy is a simple and powerful tool for reading, transcribing, and encoding text using the TEI Guidelines.

FairCopy is an Electron application which uses React and Material UI for its user interface. It also makes extensive use of ProseMirror and OpenSeaDragon. It utilizes a fork of the Annotorious OpenSeaDragon plugin for image annotation.

This README discusses how to set up a development environment on Mac or Windows OS. It also discusses how to build the installers for the product.

Developer Environment
-----------

FairCopy can run in development mode on your local machine, which is useful for debugging the application and previewing functionality. This process has been tested on VSCode on both Mac and Windows. To run Faircopy in development mode, install the necessary dependencies using NPM. Next, set the following ENV variables at a minimum, using the .env file:

* BROWSER=none
* PORT=4000 

After this is done, run `npm run start`. This will start the create react app server on port 4000. To run the Electron main process on VS Code, a debug configuration has been created for the project. Run the debugger and this will allow you to work in the Electron environment. Create React App will hot reload into Electron's browser as you work, but you will need to stop and start the debugger for most changes.

Electron apps have multiple running threads: a main thread and a number of render threads. In FairCopy, there are hidden render threads that run things like serialization to the ZIP file and search indexing. The main thread is the "back end" which handles interprocess communication. This can be debugged using breakpoints in VS Code. All other threads must be debugged using the developer tools in the browser window. To debug worker threads, you must make their browser windows visible first.


Building FairCopy Installers
----------

FairCopy uses Election Forge to create installers for the Mac, Windows, and Linux OSes. The Mac and Linux installers can be created on a Mac, but the Windows installer must be created on a Windows machine. This is because the code signing for Windows requires a physical USB key be connected to the computer during the signing process. The drivers for this device are Windows specific.

Once the installers are built, they are automatically published to either the development or production channels using Electron Forge. The `forge.config.example.js` provides an example of how the `forge.config.js` file should be configured. This file is not checked into git because it contains a number of keys and passwords.

For MacOS, Apple requires us to maintain an Apple Developer subscription in order for them to sign the code of the Mac installers. These credentials are for that account.

For Windows, we need to maintain a valid CV Code signing certifacte. The pss.pfx file is exported from the DigiCert EV Code. The password is set on the USB device. One must have the physical USB key and the password to be able to sign Windows installers.

Once all of this configuration is in place, use the follow command to build the installers:

`npm run publish`

You will need to enter the password for the USB key multiple times during this process.

The installers will be created in the `out` folder.

Deploying to Staging
------

When deploying to staging, in addition to the steps above, the `version` key in the `package.json` file MUST be set to a new, higher, version number, obeying SEMVER standards. It should be formatted like this: `1.0.0-dev.0`.

Deploying to Production
------

When deploying to staging, in addition to the steps above, the `version` key in the `package.json` file MUST be set to a new, higher, version number, obeying SEMVER standards. It should be formatted like this: `1.0.0`.

In `public/main-process/config/dist-config.json`, the `devMode` key MUST be set to false. This hides disables any development and staging related functionality. 

In `public/main-process/release-notes/latest.md`, the release notes should be updated to document any new features, functionality, and bug fixes. This file is displayed to the end user whenever the software is updated.

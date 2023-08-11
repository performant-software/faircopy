FairCopy
====

FairCopy is a simple and powerful tool for reading, transcribing, and encoding text using the TEI Guidelines.

FairCopy is an Electron application which uses React and Material UI for its user interface. It also makes extensive use of ProseMirror and OpenSeaDragon. It utilizes a fork of the Annotorious OpenSeaDragon plugin for image annotation.

This README discusses how to set up a development environment on Mac or Windows OS. It also discusses how to build the installers for the product.

Developer Environment
-----------

FairCopy can run in development mode on your local machine, which is useful for debugging the application and previewing functionality. This process has been tested on VSCode on both Mac and Windows. To run Faircopy in development mode, install the necessary dependencies using `yarn`. Next, set the following ENV variables at a minimum, using the .env file:

* BROWSER=none
* PORT=4000 

After this is done, run `yarn start`. This will start the create react app server on port 4000. To run the Electron main process on VS Code, a debug configuration has been created for the project. Run the debugger and this will allow you to work in the Electron environment. Create React App will hot reload into Electron's browser as you work, but you will need to stop and start the debugger for most changes.

Electron apps have multiple running threads: a main thread and a number of render threads. In FairCopy, there are hidden render threads that run things like serialization to the ZIP file and search indexing. The main thread is the "back end" which handles interprocess communication. This can be debugged using breakpoints in VS Code. All other threads must be debugged using the developer tools in the browser window. To debug worker threads, you must make their browser windows visible first.


Building FairCopy Installers
----------

FairCopy uses Election Builder to create installers for the Mac, Windows, and Linux OSes. The Mac and Linux installers can be created on a Mac, but the Windows installer must be created on a Windows machine (or virtual machine using Parallels Desktop). This is because the code signing for Windows requires a physical USB key be connected to the computer during the signing process. The drivers for this device are Windows specific.

Once the installers are built, they are automatically deployed to the target product and channel on Keygen, using Keygen's integration with Electron Builder. The following ENV variable must be set (in the .env file) for all OSes:

* KEYGEN_TOKEN=*keygen product token api key*

The product token API key is minted using the Keygen dashboard. The following block in the package.json file configures the Electron Builder Keygen integration:

```
 "publish": {
      "provider": "keygen",
      "account": "8a8d3d6a-ab09-4f51-aea5-090bfd025dd8",
      "product": "b2bfc67b-26bf-4407-b3d9-d7ad94d7f225",
      "channel": "dev"
    }
```

For staging, set channel to "dev" and product to the "FairCopy Activate DEV" product ID. For production, set channel to "stable" and product to the "FairCopy Activate" product ID. 

These ENV variables must be set for Mac builds:

* APPLEID=*apple dev user ID*
* APPLEIDPASS=*apple dev pass*

Apple requires us to maintain an Apple Developer subscription in order for them to sign the code of the Mac installers. These credentials are for that account.

These ENV variables must be set for Windows builds:

* CSC_LINK=./certs/pss.pfx
* CSC_PASSWORD=*DigiCert EV Code Signing USB Key Password*

The pss.pfx file is exported from the DigiCert EV Code. The password is set on the USB device. One must have the physical USB key and the password to be able to sign Windows installers.

Once all of this configuration is in place, use the follow command to build the Mac and Linus installers:

`yarn dist`

Use this command on Windows to build the Windows installers:

`yarn dist-win`

You will need to enter the password (same as `CSC_PASSWORD` above) for the USB key multiple times during this process.

The installers will be created in the `dist` folder.

Deploying to Staging
------

When deploying to staging, in addition to the steps above, the `version` key in the `package.json` file MUST be set to a new, higher, version number, obeying SEMVER standards. It should be formatted like this: `1.0.0-dev.0`.

Deploying to Production
------

When deploying to staging, in addition to the steps above, the `version` key in the `package.json` file MUST be set to a new, higher, version number, obeying SEMVER standards. It should be formatted like this: `1.0.0`.

In `public/main-process/config/dist-config.json`, the `devMode` key MUST be set to false. This hides disables any development and staging related functionality. 

In `public/main-process/release-notes/latest.md`, the release notes should be updated to document any new features, functionality, and bug fixes. This file is displayed to the end user whenever the software is updated.

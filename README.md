FairCopy
====

The [TEI P5 Guidelines](https://tei-c.org/) "specify encoding methods for machine-readable texts, chiefly in the humanities, social sciences and linguistics." However, adoption of TEI is limited because of the technical skill set it requires to read and write it. FairCopy is a word processor that can natively read and write TEI encoded texts. 

FairCopy is a word processor for the humanities scholar. It can encode prose, drama, correspondence, and verse. It can express concepts of revision, proper names, attribution, and more. With FairCopy, you can create digital editions of poems, novels, plays, as well as non-fiction works. 

FairCopy can conform to the encoding needs of a particular project and is fully functional ODD processor. Once the user has chosen an ODD schema, FairCopy can use it to read and write XML that is valid in that schema. Users can even specify their own project specific tags via ODD.

FairCopy is desktop software that works with or without an Internet connection on Mac and PC.

Developer Environment
-----------

To run Faircopy in development mode, install the necessary dependencies using `yarn` and then `yarn start-dev`. This will start the create react app server on port 3000. To run the electron main process, you have two options. If you are using VS Code, a debug configuration has been created for the project. Run the debugger an this will allow you to work in the electron environment. Create React App will hot reload into Electron's browser as you work. 

To build the React application for packaging, run:

`yarn build`

To run the built React app:

`yarn start`
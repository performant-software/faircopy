# FairCopy Release Notes

The release notes list the improvements and bug fixes included in each new version of the software.

## Version 0.9.8

### Structure Palette Element Colors (239)

The elements on the structure palette are now color coded the same as they appear when present in the document. Dark purple elements can only contain other elements, while light purple elements can contain other elements or text.

### Default Nodes (240)

All elements which must contain other elements (dark purple ones) now have default contents specified for them. Note that this is a recursive algorithm. For example listPerson is created with a person element, but the person element is in turn created with a p element.

### Improved Node Deletion (241)

Deletion logic has been improved to be more flexible. If one deletes a node that has only one child that is itself empty, it will either promote that child if it can or delete it too if it can't. This prevents nodes like castList and lg from being un-deletable. 

It is now possible to delete everything in a text resource down to the body (or front or back) nodes. If the user deletes all the nodes that can contain text, they must add nodes that can contain text in order to continue editing.

### Choice and Subst Elements (242)

The Choice and Subst elements, located in Stamp->Asides on the toolbar, now work properly. Each requires certain elements to start with. For choice, it must have two elements (corr and sic). For Subst, add and del. Other elements are possible, but there must be two.

### Transcription Structure Elements (243) 

Most of the elements from the Marker->Transcription menu are now also available on the Structure Palette. These elements can work at both a phrase level and in limited circumstances, at the structure level. 


## Version 0.9.6

_Note:_ FairCopy 0.9.6 changes the project save file format. Older versions of FairCopy may have errors opening files generated using 0.9.6 or later. Please ask collaborators to upgrade to 0.9.6 or later.

### Improvements

* FairCopy now supports most of the elements and attributes in TEI Simple, including metadata elements.
* Added TEI Document resource type. You can now create TEI Docs and add facsimile and text resources to them.
* Added the TEI Header resource type. Each TEI Doc automatically contains a header to encode its metadata. 
* Attribute validation errors now displayed on elements in the editor.
* You can now import TEI Facsimile resources.
* Exporting resources that are not in a TEI Document does not include a TEI Header.
* You can move resources in and out of TEI Documents.
* FairCopy now lets you know when a new version is available so you can download it when the time is right for you.
* FairCopy now displays the latest release notes after a new version of the software is installed.
* Project file location is now displayed in the Edit Project dialog.
* There is now a feedback button in the lower right hand corner. Please use it to send us a message!
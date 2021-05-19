# FairCopy Release Notes

The release notes list the improvements and bug fixes included in each new version of the software.

## Version 0.9.9

### Title Bar Breadcrumbs

The title bar now displays the path to the currently displayed resource within the project. The home button has moved to the title bar and now always brings the user to the top level of the project.

### Fix pagination of Facsimile Index

Pagination controls were being obscured by the status bar in the facsimile index, this is fixed.

### Deleting Note while Note is Open

Deleting a note (or subst,choice,fw) while the popup editor is active was crashing the editor. Fixed.

### Copy and Paste with Notes

Copying and pasting a range containing a note would only copy the text up to the note. Fixed.

### New Project Better Explained

Added hint text to the New Project panel to better explain how to create a project.

### Eraser Erases Structures

The eraser on the toolbar can now be used to delete structures (in addition to the DEL key)

### User Feedback when Can't Delete Structure

When a structure cannot be deleted because it contains text, the user is now given a helpful message to that effect.


## Version 0.9.8

### Structure Palette Element Colors

The elements on the structure palette are now color coded the same as they appear when present in the document. Dark purple elements can only contain other elements, while light purple elements can contain other elements or text.

### Default Nodes

All elements which must contain other elements (dark purple ones) now have default contents specified for them. Note that this is a recursive algorithm. For example listPerson is created with a person element, but the person element is in turn created with a p element.

### Improved Node Deletion

Deletion logic has been improved to be more flexible. If one deletes a node that has only one child that is itself empty, it will either promote that child if it can or delete it too if it can't. This prevents nodes like castList and lg from being un-deletable. 

It is now possible to delete everything in a text resource down to the body (or front or back) nodes. If the user deletes all the nodes that can contain text, they must add nodes that can contain text in order to continue editing.

### Choice and Subst Elements

The Choice and Subst elements, located in Stamp->Notes on the toolbar, now work properly. Each requires certain elements to start with. For Choice, it must have two elements (corr and sic). For Subst, add and del. Other elements are possible, but there must be two.

### Transcription Structure Elements 

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
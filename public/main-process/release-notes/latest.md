# FairCopy Release Notes

The release notes list the improvements and bug fixes included in each new version of the software.

## Version 1.0.2

### Bug Fixes

* Fixes issue with Zones not drawing properly on MacOS.

## Version 1.0.1

### Bug Fixes

* Fix issue with placeMark (and other camel cased marks) not being recorded properly.
* Added vertical scroll bar to popup editor for notes and other asides.
* Fixed problem editor text being obscured by status bar during free trial on MacOS.
* Fixed image cropping in facs editor at a fixed width.
* Clicking structure elements could sometimes select wrong element, fixed.
* Fixed crash bug related to adding elements.
* Cut and paste no longer introduces extra space at end of pasted text.

## Version 1.0.0

### Improvements

* Over a dozen new TEI modules. FairCopy now has support for most of the elements in the TEI Guidelines. 
* Support for standoff markup using the standOff resource type. Great for prosopography and bibliography.
* Better support for diplomatic transcription using the sourceDoc resource type.
* Full text search in projects. Filter search by element name or by attribute name/value pairs. 
* Batch import of resources. You can now batch import a directory of TEI/XML or UTF-8 encoded texts.
* Keyboard shortcuts and accessibility. Software now Section 508 compliant. Support for keyboard users and screen readers.
* *Experimental* right-to-left (RTL) language editing. Using the xml:lang attribute, you can now edit texts in LTR or RTL. Support for mixed languages in the same resource.

### Bug Fixes

* Improvements to rendering of structural tree.
* Enhanced placement of inline elements.
* Improved deletion and backspace mechanics.
* Improvements to cut and paste.

## Version 0.11.0

### Improvements

* Project Settings Page - Clicking on the gear in the top left corner now brings up the Project Settings Page.
* Project Schema Editor - The user can now customize the editor menus and the project schema. 
* Schema Validation - The texts in the project are validated against the project schema. 
* Added msdescription module and remaining TEI Simple elements to library. You can now create texts that include these elements.

### Bug Fixes

* Fixed bugs related to XML import 
* Fixed bug with title element not placing.

## Version 0.10.0

### Improvements

* New Structure Palette allows for drag and drop creation of document structure.
* New toolbar layout, includes common editor functions which produce TEI counterparts.
* The title bar now displays the path to the currently displayed resource within the project. The home button has moved to the title bar and now always brings the user to the top level of the project.
* FairCopy now validates the following data types: truthValue, probability, count, and numeric.
* Added hint text to the New Project panel to better explain how to create a project.
* The eraser on the toolbar can now be used to delete structures (in addition to the delete or backspace keys)
* When a structure cannot be deleted because it contains text, the user is now given a helpful message to that effect.
* The elements on the structure palette are now color coded the same as they appear when present in the document. Dark purple elements can only contain other elements, while light purple elements can contain other elements or text.
* All elements which must contain other elements (dark purple ones) now have default contents specified for them.
* Most of the elements from the Marker->Transcription menu are now also available on the Structure Palette. These elements can work at both a phrase level and in limited circumstances, at the structure level. 

### Bug Fixes

* Pagination controls were being obscured by the status bar in the facsimile index, this is fixed.
* Deleting a note (or subst,choice,fw) while the popup editor is active was crashing the editor. Fixed.
* Deletion logic has been improved to be more flexible. If one deletes a node that has only one child that is itself empty, it will either promote that child if it can or delete it too if it can't. This prevents nodes like castList and lg from being un-deletable. 
* It is now possible to delete everything in a text resource down to the body (or front or back) nodes. If the user deletes all the nodes that can contain text, they must add nodes that can contain text in order to continue editing.
* Copying and pasting a range containing a note would only copy the text up to the note. Fixed.
* The Choice and Subst elements, located in Stamp->Notes on the toolbar, now work properly. Each requires certain elements to start with. For Choice, it must have two elements (corr and sic). For Subst, add and del. Other elements are possible, but there must be two.

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
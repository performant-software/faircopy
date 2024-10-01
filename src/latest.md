# FairCopy Release Notes

The release notes list the improvements and bug fixes included in each new version of the software.

## Version 1.2.0

This public release includes all the beta improvements and bug fixes since v1.1.10. 

# Improvements

* Hovering the mouse over a resource name or ID now summons a tooltip with the unabridged name or ID.

# Bug Fixes

* Copying a surface now also copies the associated zones.
* Fixed problem where the structure tree would occasionally disappear
* Fixed TEI Export so that XML is properly formatted.
* Fixed issues with Resource Browser formatting when names and/or IDs are really long.
* Don't allow the user to select Documentary Preview mode if the document has no facsimiles or no surfaces on facsimiles.
* Disable local images, doesn't work presently.
* Fix label on the Copy surface button.


## Version 1.2.0 beta.3

# Improvements
* The user can now preview TEI Documents in either as a reading text or documentary view.
* In the Facs Editor, "Move Surfaces" is now "Copy Surfaces". This creates duplicate surfaces in the target facs instead of moving them.
* Make the project window resizable, increase the max number of remote projects displayed
* Change date element to inter type

# Bug Fixes
* Fixed bugs related to move surfaces function.
* Reimplement getPathBasename() to remove dependency on Node module in render process.
* Fix bug in structure tree alignment
* Remove old gif based spinner in favor of ring spinner
* Refactored application to use Electron Forge Webpack instead of Create React App.
* Improved security of Render Processes using Context Isolation

## Version 1.2.0 beta.2

# Improvements

* The user can now configure the color of the underlines used for mark elements. This allows the user to at a glance identify elements common to their corpus. This is configured in Project Settings -> Editor.
* New application icon and installer assets have been added for Windows and MacOS. There is now a cool spinner that runs while installing on Windows. On Mac, the DMG page has been spiffed up.
* Added a "Find" feature to the editor in remote and offline projects. Disabled the project wide search, which was only available in offline projects. This feature allows you to search the currently open document for a case insensitive match on the search query. Also supports searching for the phrase with a specific element type or with specific attributes.

# Bug Fixes

* Established a max character length for display of names in the resource browser, so that longer names don't break display.
* Fixed a bug where when a user creates a new TEI Document in a remote project and then tries to preview or export it without first checking it in, nothing happened. New TEI Documents now export and preview properly.

## Version 1.2.0-beta.1

## Improvements

* Improvements to the sizing and layout of images in the preview window as they respond to custom CSS.
* Links in the preview window now work, both to external websites and anchor tags within the document. Link behavior is triggered by the use of a ref element with a target attribute.
* You can now sort by ID or by name in the Resource Browser
* The UX for the name filter has been improved, adding a clear filter button and filter as you type functionality
* TEI Schema has been updated to be compatible with TEI v4.7.0, latest version.
* Font Awesome icons have been migrated to CC licensed v6.5.1. Some icons have a different appearance now. The TEI Docs icon is now an open book instead of a stack of books.
* Replace on Import - When you import new resources, you now have the option in the import dialog to replace any existing resources that have the same ID. The existing resources must be checked out if working with a remote project.
* Filter by Name or ID - When using the resource browser, the user can now filter the list based on the name or ID of a resource. Press enter in the field to update the filter.
* Logout and Login buttons moved - The login button is now part of the notice when one is logged out of a remote resource. The logout button has been moved to the settings window.

## Bug Fixes

* XML used by preview window was being pretty formatted, which resulted in extra spaces in some documents. 
* Bug fix for problem on production where thumbnails sometimes don't appear. Was a problem with local ID map getting out of synch with server.  
* Cut and paste was broken in the attribute drawer fields on MacOS. This is now fixed.

## Version 1.1.10

This is a bug fix release to address a problem with the Facsimile Editor not being able to draw zones shapes on MacOS.

## Version 1.1.9

### Improvements

* Users can now move images between facsimiles
* Move Resource function is restored and now works for remote projects

### Bug Fixes

* Long filenames obscure close button
* Limit autocomplete of TEI Pointers to current document
* Fixed intermittent error when checking out resources in remote projects

## Version 1.1.8

### Bug Fixes

* Fixes a problem where facsimile resource viewer will not advance to the next or previous image.

## Version 1.1.7

### Bug Fixes

* Crash bug deleting resource with no parent
* Error message when checking out config

## Version 1.1.6

### Improvements

* Users can now create hotkeys for their favorite Mark elements. Hotkeys must use at least one of: alt, control, meta, or option keys. When used in a remote project, the user must have project config privs to edit the hotkeys, which will be shared by all members of the project.
* User can now pin the attribute drawer in the open position, to prevent the editor from hopping around as they move between elements.

### Bug Fixes

* A number of issues have been addressed around log in to remote projects, include server side session time outs.

## Version 1.1.4

### Improvements

* The IIIF Import Dialog now supports IIIF Presentation API v2 Collection endpoints. The user can navigate a tree of collections to select the correct manifest to import. You can also now import texts that are attached to Sequence and Canvas objects that are plain/text or TEI/XML.
* The Import Text Dialog now allows the user to select between importing a plain text file as a text resource or a source document resource.

## Version 1.1.3

In FairCopy v1.1.3, we add functionality for teams using ArchivEngine. ArchivEngine is our team collaboration server, currently in development at Performant. If you are interested in trying it out, please contact us. This version allows a project lead to configure the schema for the entire project. 

### Improvements

* Users with the appropriate permissions can now configure the schema for the project.
* Performance improvements in the TEI editor on large text resources.
* Improved auto-generated names and IDs for resources on import.
* Simplify TEI Document check in/check out process.
* Display user permissions on the settings page.

## Version 1.1.2

This version addresses a couple of bugs found in recent testing.

### Bug Fixes

* Fixed crash bug related to using arrow keys to navigate the structure tree near inline elements.
* Fixed bug where thumbnails were not appearing for facs IDs in TEI Documents.

## Version 1.1.1

In FairCopy v1.1.1, we add functionality for Remote Projects. Remote Projects make it easy for teams to work together on a project. This feature is currently in closed beta, but if you would like to learn more, please contact us.

### Bug Fixes

* Fixed bug on import where it would incorrectly report the number of files imported.
* Fixed bug on placing margin thumbnails for structure elements in the editor.

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
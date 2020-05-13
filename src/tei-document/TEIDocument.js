import {DOMSerializer} from "prosemirror-model"
import {EditorState, TextSelection} from "prosemirror-state"
import {keymap} from "prosemirror-keymap"
import {history} from "prosemirror-history"
import {baseKeymap} from "./basekeymap"
import {highlighter} from "./highlighter"
import {dropCursor} from "prosemirror-dropcursor"
import {gapCursor} from "prosemirror-gapcursor"

import {buildKeymap} from "./keymap"
import {buildInputRules} from "./inputrules"
import {teiTemplate} from "./tei-template"

const fairCopy = window.fairCopy

export default class TEIDocument {

    constructor( resourceID, filePath, teiSchema, fairCopyConfig ) {
        this.editorView = null
        this.pastedNoteBuffer = []
        this.resourceID = resourceID
        this.teiSchema = teiSchema
        this.fairCopyConfig = fairCopyConfig
        const {schema} = teiSchema
        this.plugins = [
            buildInputRules(schema),
            keymap(buildKeymap(schema)),
            keymap(baseKeymap),
            dropCursor(),
            gapCursor(),
            history(),
            highlighter()
        ]
        this.initialState = filePath  ? this.load( filePath ) : this.editorInitialState()
        this.changedSinceLastSave = false
    }

    editorInitialState() {
        // load blank XML template 
        const parser = new DOMParser();
        this.xmlDom = parser.parseFromString(teiTemplate, "text/xml");        
        const doc = this.createEmptyDocument(document)

        this.fairCopyConfig.createNew()
       
        const selection = TextSelection.create(doc, 0)
        return EditorState.create({ 
            doc, plugins: this.plugins, selection 
        })
    }

    // Extract the note elements from the html so they don't get
    // parsed inline by DOMParser.parseSlice() during a cut and paste
    transformPastedHTML = ( html ) => {

        // Meta element generated by ProseMirror isn't closed, remove it 
        // so we can parse as XML. Put it back at the end.
        const metaRegex = /(<meta [^>]*>)/
        const matches = html.match(metaRegex)
        let metaTag = matches && matches[1] ? matches[1]: ""
        let xml = html.replace(metaRegex,"")
        const parser = new DOMParser();
        // xml might be an array of elements, need to wrap them to form a valid document
        const xmlDom = parser.parseFromString(`<xml>${xml}</xml>`,'text/xml');

        let noteEls = xmlDom.getElementsByTagName('note');
        for( let i=0; i< noteEls.length; i++ ) {
            const el = noteEls[i]
            const noteID = this.teiSchema.issueSubDocumentID()
            const noteEl = el.cloneNode(true)
            noteEl.setAttribute('__id__',noteID)
            const emptyEl = el.cloneNode()
            emptyEl.setAttribute('__id__',noteID)
            // blank is necessary so that serializer doesn't collapse element
            emptyEl.innerHTML = ' '
            el.parentNode.replaceChild(emptyEl,el)
            this.pastedNoteBuffer.push(noteEl)
        }

        let xhtml = new XMLSerializer().serializeToString(xmlDom);
        xhtml = xhtml.replace('<xml>','').replace('</xml>','')
        const nextHTML = `${metaTag}${xhtml}`
        return nextHTML
    }
    
    transformPasted = (slice) => {
        // apply notes after DOMParse.parseSlice()
        while( this.pastedNoteBuffer.length > 0 ) {
            const noteEl = this.pastedNoteBuffer.pop()
            this.parseSubDocument(noteEl,noteEl.getAttribute('__id__'))
        }
        return slice
    }

    // TODO separate module?
    fairCopyKeyMap() {
        // "Enter": chainCommands(newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock),
        // the function of the enter key is dependent upon the current editor mode
        // need to understand how this presently works and then develop a scheme
        // to interrupt and put the correct node type in there depending on the circumstance
        return baseKeymap
    }


    refreshView = () => {
        // dispatch a blank transaction to force a display update of the subcomponents
        if( this.editorView ) {
            const { tr } = this.editorView.state
            this.editorView.dispatch(tr)    
        }
    }

    createEmptyDocument(documentDOM) {
        const div = documentDOM.createElement('DIV')
        div.innerHTML = ""
        const doc = this.teiSchema.domParser.parse(div)
        return doc
    }

    moveSubDocument( oldKey, newKey ) {
        const subDoc = localStorage.getItem(oldKey);
        localStorage.setItem(newKey, subDoc);
        localStorage.setItem(oldKey, null);
    }

    createSubDocument(documentDOM) {
        const subDoc = this.createEmptyDocument(documentDOM)
        const subDocID = this.teiSchema.issueSubDocumentID()
        localStorage.setItem(subDocID, JSON.stringify(subDoc.toJSON()));
        return subDocID
    }

    getXMLIDs() {
        if( this.editorView ) {
            const { doc } = this.editorView.state
            return this.getXMLIDsInDoc(doc)
        }
        return null
    }

    getXMLIDsInDoc(doc) {
        const xmlIDs = []

        const gatherID = (element) => {
            const xmlID = element.attrs['xml:id']
            if( xmlID ) xmlIDs.push(`#${xmlID}`)
        }
        
        // gather up all xml:ids and their nodes/marks
        doc.descendants((node) => {
            gatherID(node)
            for( const mark of node.marks ) {
                gatherID(mark)
            }        
            return true
        })

        return xmlIDs.sort()
    }

    findID(targetID) {
        if( this.editorView ) {
            const { doc } = this.editorView.state
            return this.findIDInDoc(doc,targetID)
        }
        return null
    }

    findIDInDoc(doc,targetID) {

        const findID = (element) => {
            const xmlID = element.attrs['xml:id']
            return ( xmlID && xmlID === targetID ) ? element : null
        }
        
        let result = null

        doc.descendants((node) => {
            if( !result ) {
                result = findID(node)
                if( !result ) {
                    for( const mark of node.marks ) {
                        result = findID(mark)
                        if( result ) break 
                    }        
                }
            } 
            return (result === null)
        })

        return result
    }

    load( filePath ) {
        const text = fairCopy.services.readFileSync(filePath)
        const parser = new DOMParser();
        this.xmlDom = parser.parseFromString(text, "text/xml");
        const bodyEl = this.xmlDom.getElementsByTagName('body')[0]
        const doc = this.teiSchema.domParser.parse(bodyEl)
        const selection = TextSelection.create(doc, 0)
        this.changedSinceLastSave = false
        return EditorState.create({ 
            doc, plugins: this.plugins, selection 
        })
    }

    openNote( noteID ) {
        const noteJSON = JSON.parse( localStorage.getItem(noteID) )
        const doc = this.teiSchema.schema.nodeFromJSON(noteJSON);
        return EditorState.create({
            doc,
            selection: TextSelection.create(doc, 0),
            plugins: this.plugins
        })
    }

    save(saveFilePath) {
        // Override save file for testing
        if( fairCopy.services.isDebugMode() ) {
            saveFilePath = 'test-docs/je_example_out.xml'
        }

        // TODO - program should clear sub docs from local storage before exiting or when loading a different document

        const editorState = this.editorView.state
        this.teiSchema.teiMode = true

        // take the body of the document from prosemirror and reunite it with 
        // the rest of the xml document, then serialize to string
        // TODO add application element with config ID
        const domSerializer = DOMSerializer.fromSchema( this.teiSchema.schema )
        const domFragment = domSerializer.serializeFragment(editorState.doc.content)
        const bodyEl = this.xmlDom.getElementsByTagName('body')[0]
        var div = document.createElement('div')
        div.appendChild( domFragment.cloneNode(true) )
        bodyEl.innerHTML = div.innerHTML
        const fileContents = new XMLSerializer().serializeToString(this.xmlDom);

        fairCopy.services.writeFileSync(saveFilePath, fileContents)
        this.teiSchema.teiMode = false
        this.changedSinceLastSave = false
    }
}
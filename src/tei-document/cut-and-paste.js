import {DOMSerializer} from "prosemirror-model"
import TEISchema from "../tei-document/TEISchema"

// buffer for storing subdocuments 
const pastedNoteBuffer = []

// Extract the note elements from the html so they don't get
// parsed inline by DOMParser.parseSlice() during a cut and paste
export function transformPastedHTMLHandler( teiSchema, teiDocument ) {
    return (html) => {
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
            const noteID = teiDocument.issueSubDocumentID()
            const noteEl = el.cloneNode(true)
            noteEl.setAttribute('__id__',noteID)
            const emptyEl = el.cloneNode()
            emptyEl.setAttribute('__id__',noteID)
            // blank is necessary so that serializer doesn't collapse element
            emptyEl.innerHTML = ' '
            el.parentNode.replaceChild(emptyEl,el)
            pastedNoteBuffer.push(noteEl)
        }

        // schema needs access to this document while running parseSlice()
        // pops off in transformPastedHandler()
        teiSchema.teiDocuments.push(teiDocument)

        let xhtml = new XMLSerializer().serializeToString(xmlDom);
        xhtml = xhtml.replace('<xml>','').replace('</xml>','')
        const nextHTML = `${metaTag}${xhtml}`
        return nextHTML
    }
}

export function transformPastedHandler(teiSchema,teiDocument) {
    return (slice) => {
        // apply notes after DOMParse.parseSlice()
        while( pastedNoteBuffer.length > 0 ) {
            const noteEl = pastedNoteBuffer.pop()
            teiDocument.parseSubDocument(noteEl,noteEl.getAttribute('__id__'))
        }

        // done parsing, disassociate this teidocument from schema parser
        teiSchema.teiDocuments.pop()
        return slice
    }
}

export function createClipboardSerializer(teiSchema,teiDocument) {
    // clipboard serialize always serializes to TEI XML
    const clipboardSchema = new TEISchema(teiSchema.schemaJSON);

    // the clipboard schema is always associated with this one document and
    // is always in teiMode
    clipboardSchema.teiMode = true
    clipboardSchema.teiDocuments.push(teiDocument)
    return DOMSerializer.fromSchema( clipboardSchema.schema )    
}
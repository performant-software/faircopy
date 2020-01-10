import {Schema} from "prosemirror-model"
import {DOMSerializer} from "prosemirror-model"
import {DOMParser as PMDOMParser } from "prosemirror-model"
import {elementSpecs} from './element-specs'

const fs = window.fairCopy.fs

export default class TEISchema {

    constructor(issueSubDocumentID) {
        this.teiMode = false
        this.issueSubDocumentID = issueSubDocumentID

        this.elementSpecs = elementSpecs
        this.pastedNoteBuffer = []

        this.defaultAttrSpec = {
            "type": "text"
        }

        const schemaSpec = this.createSchemaSpec()
        this.schema = new Schema(schemaSpec)
        this.domParser = PMDOMParser.fromSchema(this.schema)
    }

    createSchemaSpec() {
        const json = fs.readFileSync('config/tei-simple.json', "utf8")
        const teiSimple = JSON.parse(json)

        const nodes = {
            doc: {
                content: "(chunk|block)*",
                group: "block"
            },
            text: {
                group: "inline"
            }
        }
        
        const marks = {}

        for( const element of teiSimple.elements ) {
            const { pmType } = element
            if( pmType === 'mark') {
                const { name, defaultAttrs } = element
                marks[name] = this.createTEIMark({ name, attrs: defaultAttrs })
            } else if( pmType === 'node' ) {
                const { name } = element
                nodes[name] = this.createTEINode(element)
            } else if( pmType === 'inline-node' ) {
                const { name } = element
                if( name === 'note' ) {
                    nodes[name] = this.createTEINote()
                } else if( name === 'pb') {
                    nodes[name] = this.createTEIPb()
                }
            } else {
                console.log('unrecognized pmType')
            }
        }

        return { nodes, marks }
    }

    filterOutBlanks( attrObj ) {
        // don't save blank attrs
        const attrs = {}
        for( const key of Object.keys(attrObj) ) {
            const value = attrObj[key]
            if( value && value.length > 0 ) {
                attrs[key] = value
            }
        }
        return attrs
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
            const noteID = this.issueSubDocumentID()
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

    parseSubDocument(node, noteID) {
        const subDoc = this.domParser.parse(node)
        localStorage.setItem(noteID, JSON.stringify(subDoc.toJSON()));
    }

    createTEINode(teiNodeSpec) {
        const { name, content, group } = teiNodeSpec
        return {
            content,
            group,
            parseDOM: [{tag: name}],
            toDOM: () => this.teiMode ? [name,0] : [`tei-${name}`,0]        
        }
    }

    createTEINote() {
        return {
            inline: true,
            atom: true,
            group: "inline",
            attrs: {
                id: {},
                __id__: {}
            },
            parseDOM: [
                {
                    tag: "note",
                    getAttrs: (domNode) => {
                        const xmlID = domNode.getAttribute("xml:id")
                        const existingID = domNode.getAttribute('__id__')
                        const noteID = existingID ? existingID : this.issueSubDocumentID()
                        this.parseSubDocument(domNode, noteID)
                        return { id: xmlID, __id__: noteID }
                    },
                }
            ],
            toDOM: (node) => { 
                if( this.teiMode ) {
                    return this.serializeSubDocument(node.attrs)
                } else {
                    const noteAttrs = { ...node.attrs, class: "fas fa-xs fa-sticky-note" }
                    return ["tei-note",noteAttrs,0]
                }
            }
        }          
    }

    createTEIPb() {
        return {
            inline: true,
            atom: true,
            group: "inline",
            attrs: {
                facs: { default: '' }
            },
            parseDOM: [{
                tag: "pb",
                getAttrs: (domNode) => {
                    const facs = domNode.getAttribute("facs")
                    return { facs }
                }
            }],
            toDOM: (node) => {
                if( this.teiMode ) {
                    const attrs = this.filterOutBlanks(node.attrs)
                    return ["pb",attrs]
                } else {
                    const pbAttrs = { ...node.attrs, class: "fa fa-file-alt" }
                    return ["tei-pb",pbAttrs,0]  
                }
            }  
        }
    }

    createTEIMark(teiMarkSpec) {
        const { name } = teiMarkSpec

        let attrs = {}
        for( let attr of teiMarkSpec.attrs ) {
            attrs[attr] = { default: '' }
        }

        return {
            attrs,
            parseDOM: [
                {
                    tag: name,
                    getAttrs(dom) {
                        let parsedAttrs = {}
                        for( let attr of teiMarkSpec.attrs ) {
                            parsedAttrs[attr] = dom.getAttribute(attr)
                        }
                        return parsedAttrs
                    }
                } 
            ],
            toDOM: (mark) => {
                if( this.teiMode ) {
                    const attrs = this.filterOutBlanks(mark.attrs)
                    return [name,attrs,0]
                } else {
                    const displayAttrs = { ...mark.attrs, phraseLvl: true }
                    return [`tei-${name}`,displayAttrs,0]
                }
            } 
        }       
    }

    serializeSubDocument(attrs) {
        let {__id__} = attrs; 
        const noteJSON = JSON.parse( localStorage.getItem(__id__) )
        const subDoc = this.schema.nodeFromJSON(noteJSON);
        const domSerializer = DOMSerializer.fromSchema( this.schema )
        const domFragment = domSerializer.serializeFragment(subDoc.content)
        let note = document.createElement('note')
        note.appendChild( domFragment.cloneNode(true) )
        for( const attrKey of Object.keys(attrs)) {
            if( attrKey !== '__id__') {
                const attrVal = attrs[attrKey]
                note.setAttribute(attrKey,attrVal)
            }
        }
        return note
    }
}
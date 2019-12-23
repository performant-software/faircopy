import {Schema} from "prosemirror-model"
import {DOMSerializer} from "prosemirror-model"
import {DOMParser as PMDOMParser } from "prosemirror-model"
import {elementSpecs} from './element-specs'

export default class TEISchema {

    constructor() {
        this.teiMode = false

        this.elementSpecs = elementSpecs
        this.pastedNoteBuffer = []

        this.defaultAttrSpec = {
            "type": "text"
        }

        const nodes = {
            doc: {
                content: "block+"
            },
            p: {
                content: "inline*",
                group: "block",
                parseDOM: [{tag: "p"}],
                toDOM: () => this.teiMode ? ["p",0] : ["tei-p",0]        
            },
            pb: {
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
            },
            note: {
                inline: true,
                atom: true,
                group: "inline",
                attrs: {
                    id: { }
                },
                parseDOM: [
                    {
                        tag: "note",
                        getAttrs: (domNode) => {
                            const noteID = domNode.getAttribute("xml:id")
                            this.parseSubDocument(domNode, noteID)
                            return { id: noteID }
                        },
                    }
                ],
                toDOM: (node) => { 
                    let {id} = node.attrs; 
                    if( this.teiMode ) {
                        return this.serializeSubDocument(id)
                    } else {
                        const noteAttrs = { ...node.attrs, class: "fas fa-xs fa-sticky-note" }
                        return ["tei-note",noteAttrs,0]
                    }
                }
            },   
            text: {
                group: "inline"
            },
        }

        const marks = {   
            hi: this.createTEIMark({ name: 'hi', attrs: [ "rend" ] }),
            ref: this.createTEIMark({ name: 'ref', attrs: [ "target" ] }),
            name: this.createTEIMark({ name: 'name', attrs: [ "id", "type" ] })
        }

        this.schema = new Schema({ nodes, marks })
        this.domParser = PMDOMParser.fromSchema(this.schema)
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

        const cloneNoteEl = (noteEl,empty) => {
            const nextNoteEl = document.createElement('note')
            nextNoteEl.setAttribute('xml:id','TEST1')
            if(!empty) nextNoteEl.innerHTML = noteEl.innerHTML
            return nextNoteEl
        }

        // Meta tag from ProseMirror isn't closed, remove it 
        // so we can parse as XML. Put it back at the end.
        const metaRegex = /(<meta [^>]*>)/
        const matches = html.match(metaRegex)
        let metaTag = matches && matches[1] ? matches[1]: ""
        let xml = html.replace(metaRegex,"")
        const parser = new DOMParser();
        const xmlDom = parser.parseFromString(xml,'text/xml');

        let noteEls = xmlDom.getElementsByTagName('note');
        for( let i=0; i< noteEls.length; i++ ) {
            const el = noteEls[i]
            const noteEl = cloneNoteEl(el)
            const emptyEl = cloneNoteEl(el,true)
            this.pastedNoteBuffer.push(noteEl)
            el.parentNode.replaceChild(emptyEl,el)
        }

        const nextHTML = new XMLSerializer().serializeToString(xmlDom);
        return `${metaTag}${nextHTML}`
    }
    
    transformPasted = (slice) => {
        // apply notes after DOMParse.parseSlice()
        while( this.pastedNoteBuffer.length > 0 ) {
            const noteEl = this.pastedNoteBuffer.pop()
            this.parseSubDocument(noteEl,noteEl.getAttribute('xml:id'))
        }
        return slice
    }

    parseSubDocument(node, noteID) {
        const subDoc = this.domParser.parse(node)
        localStorage.setItem(noteID, JSON.stringify(subDoc.toJSON()));
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

    serializeSubDocument(noteID) {
        const noteJSON = JSON.parse( localStorage.getItem(noteID) )
        const subDoc = this.schema.nodeFromJSON(noteJSON);
        const domSerializer = DOMSerializer.fromSchema( this.schema )
        const domFragment = domSerializer.serializeFragment(subDoc.content)
        let note = document.createElement('note')
        note.setAttribute('xml:id', noteID)
        note.appendChild( domFragment.cloneNode(true) )
        return note
    }
}
import {Schema} from "prosemirror-model"
import {DOMSerializer} from "prosemirror-model"
import {DOMParser as PMDOMParser } from "prosemirror-model"

export default class TEISchema {

    constructor() {
        this.teiMode = false

        this.elementSpecs = {
            "p": {
                "doc": "marks paragraphs in prose.",
            },
            "pb": {
                "docs": "marks the beginning of a new page in a paginated document."
            },
            "note": {
                "docs": "contains a note or annotation.",
            },
            "hi": {
                "attrs": {
                    "rend": {
                        "type": "select",
                        "options": ["bold","italic","caps"]
                    }
                },
                "docs": "marks a word or phrase as graphically distinct from the surrounding text, for reasons concerning which no claim is made.",
            },
            "ref": {
                "docs": "defines a reference to another location, possibly modified by additional text or comment.",
            },
            "name": {
                "docs": "contains a proper noun or noun phrase.",
                "attrs": {
                    "type": {
                        "type": "select",
                        "options": ["person","place","artwork"]
                    }
                },
            }
        }
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
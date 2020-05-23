import {Schema} from "prosemirror-model"
import {DOMSerializer} from "prosemirror-model"
import {DOMParser as PMDOMParser } from "prosemirror-model"

export default class TEISchema {

    constructor(json) {
        this.subDocIDs = []
        this.subDocCounter = 0
        this.subDocPrefix = `note-${Date.now()}-`
        this.teiMode = false
        const { schemaSpec, elements, attrs } = this.parseSchemaConfig(json)
        this.elements = elements
        this.attrs = attrs
        this.schema = new Schema(schemaSpec)
        this.domParser = PMDOMParser.fromSchema(this.schema)
        this.schemaJSON = json
    }

    issueSubDocumentID = () => {
        const nextID = `${this.subDocPrefix}${this.subDocCounter++}`
        this.subDocIDs.push(nextID)
        return nextID
    }

    parseSchemaConfig(json) {
        const teiSimple = JSON.parse(json)

        const elements = {}
        const attrs = {
            ...teiSimple.attrs,
            "__id__": { hidden: true }
        }

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
            const { pmType, name } = element
            const validAttrs = element.validAttrs ? element.validAttrs : []
            if( pmType === 'mark') {
                marks[name] = this.createMarkSpec({ name, attrs: validAttrs })
            } else if( pmType === 'node' ) {
                nodes[name] = this.createNodeSpec(element)
            } else if( pmType === 'inline-node' ) {
                if( name === 'note' ) {
                    nodes[name] = this.createNoteSpec(validAttrs)
                } else if( name === 'pb') {
                    nodes[name] = this.createPbSpec(validAttrs)
                }
            } else {
                console.log('unrecognized pmType')
            }
            elements[name] = element            
        }

        return { schemaSpec: { nodes, marks }, elements, attrs }
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

    filterOutErrors( attrObj ) {
        // don't save error flags
        const attrs = {}
        for( const key of Object.keys(attrObj) ) {
            const value = attrObj[key]
            if( key !== '__error__' ) {
                attrs[key] = value
            }
        }
        return attrs
    }

    parseSubDocument(node, noteID) {
        const subDoc = this.domParser.parse(node)
        localStorage.setItem(noteID, JSON.stringify(subDoc.toJSON()));
    }

    createNodeSpec(teiNodeSpec) {
        const { name, content, group } = teiNodeSpec
        // TODO add attrSpec
        return {
            content,
            group,
            parseDOM: [{tag: name}],
            toDOM: () => this.teiMode ? [name,0] : [`tei-${name}`,0]        
        }
    }

    createNoteSpec(validAttrs) {

        let attrs = this.getAttrSpec(validAttrs)
        attrs['__id__'] = {}

        return {
            inline: true,
            atom: true,
            group: "inline",
            attrs,
            parseDOM: [
                {
                    tag: "note",
                    getAttrs: (domNode) => {
                        const attrParser = this.getAttrParser(validAttrs)
                        const existingID = domNode.getAttribute('__id__')
                        const noteID = existingID ? existingID : this.issueSubDocumentID()
                        this.parseSubDocument(domNode, noteID)
                        return { ...attrParser(domNode), __id__: noteID }
                    },
                }
            ],
            toDOM: (node) => { 
                if( this.teiMode ) {
                    let attrs = this.filterOutBlanks(node.attrs)
                    attrs = this.filterOutErrors(attrs)
                    return this.serializeSubDocument(attrs)
                } else {
                    const noteAttrs = { ...node.attrs, class: "fas fa-xs fa-sticky-note" }
                    return ["tei-note",noteAttrs,0]
                }
            }
        }          
    }

    createPbSpec(validAttrs) {

        const attrs = this.getAttrSpec(validAttrs)

        return {
            inline: true,
            atom: true,
            group: "inline",
            attrs: attrs,
            parseDOM: [{
                tag: "pb",
                getAttrs: this.getAttrParser(validAttrs)
            }],
            toDOM: (node) => {
                if( this.teiMode ) {
                    let attrs = this.filterOutBlanks(node.attrs)
                    attrs = this.filterOutErrors(attrs)
                    return ["pb",attrs]
                } else {
                    const pbAttrs = { ...node.attrs, class: "fa fa-file-alt" }
                    return ["tei-pb",pbAttrs,0]  
                }
            }  
        }
    }

    getAttrSpec( validAttrs ) {
        let attrs = {}
        for( const attr of validAttrs ) {
            attrs[attr] = { default: '' }
        }
        attrs['__error__'] = { default: 'false' }
        return attrs
    }

    getAttrParser( validAttrs ) {
        return (dom) => {
            let parsedAttrs = {}
            for( const attr of validAttrs ) {
                parsedAttrs[attr] = dom.getAttribute(attr)
            }
            // all ids should be in xml namespace
            const bareID = parsedAttrs['id']
            if( bareID ) {
                parsedAttrs['xml:id'] = bareID
                parsedAttrs['id'] = null
            }
            return parsedAttrs    
        }
    }

    createMarkSpec(teiMarkSpec) {
        const { name } = teiMarkSpec

        const attrs = this.getAttrSpec(teiMarkSpec.attrs)

        return {
            attrs,
            parseDOM: [
                {
                    tag: name,
                    getAttrs: this.getAttrParser(teiMarkSpec.attrs)
                } 
            ],
            toDOM: (mark) => {
                if( this.teiMode ) {
                    let attrs = this.filterOutBlanks(mark.attrs)
                    attrs = this.filterOutErrors(attrs)
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
import {Schema} from "prosemirror-model"
import {DOMParser as PMDOMParser } from "prosemirror-model"
import {DOMSerializer} from "prosemirror-model"

export default class TEISchema {

    constructor(json) {
        this.teiDocuments = []
        this.teiMode = false
        const { schemaSpec, elements, attrs } = this.parseSchemaConfig(json)
        this.elements = elements
        this.attrs = attrs
        this.schema = new Schema(schemaSpec)
        this.domParser = PMDOMParser.fromSchema(this.schema)
        this.schemaJSON = json
    }

    parseBody(bodyEl, teiDocument) {
        // make the TEIDocument visible to the node spec parser for access to sub docs
        this.teiDocuments.push(teiDocument)
        const doc = this.domParser.parse(bodyEl)
        this.teiDocuments.pop()
        return doc
    }

    serializeBody( content, teiDocument ) {
        // make the TEIDocument visible to the serialize for access to sub docs
        this.teiDocuments.push(teiDocument)
        const domSerializer = DOMSerializer.fromSchema( this.schema )
        const domFragment = domSerializer.serializeFragment(content)
        this.teiDocuments.pop()
        return domFragment
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
                        const teiDocument = this.teiDocuments[this.teiDocuments.length-1]
                        const noteID = existingID ? existingID : teiDocument.issueSubDocumentID()
                        teiDocument.parseSubDocument(domNode, noteID)
                        return { ...attrParser(domNode), __id__: noteID }
                    },
                }
            ],
            toDOM: (node) => { 
                if( this.teiMode ) {
                    let attrs = this.filterOutBlanks(node.attrs)
                    attrs = this.filterOutErrors(attrs)
                    const teiDocument = this.teiDocuments[this.teiDocuments.length-1]
                    return teiDocument.serializeSubDocument(attrs)
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
            inclusive: false,
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
}
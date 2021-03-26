import {Schema} from "prosemirror-model"
import { DOMParser as PMDOMParser } from "prosemirror-model"

export default class TEISchema {

    constructor(json) {
        this.teiDocuments = []
        this.schemaJSON = json
        this.teiMode = false
        const { schemaSpec, elements, attrs, elementGroups } = this.parseSchemaConfig(json)
        this.elementGroups = elementGroups
        this.elements = elements
        this.attrs = attrs
        this.schema = new Schema(schemaSpec)
        this.domParser = PMDOMParser.fromSchema(this.schema)
        this.createSubDocSchemas(schemaSpec)
    }

    // Each subdoc type needs its own schema that has the docNode as its top level node and a parser that uses that schema
    createSubDocSchemas(schemaSpec) {
        this.docNodeSchemas = {}
        this.docNodeParsers = {}
        const { docNodes } = this.elementGroups
        for( const docNode of docNodes ) {
            if( docNode !== 'doc' ) {
                const docNodeSchemaSpec = { ...schemaSpec, topNode: docNode }
                const asideName = docNode.slice(0,-3) // Slice off 'Doc' to get node name
                this.docNodeSchemas[asideName] = new Schema(docNodeSchemaSpec)
                this.docNodeParsers[asideName] = PMDOMParser.fromSchema(this.docNodeSchemas[asideName])    
            }
        }
    }

    parseSchemaConfig(json) {
        const teiSimple = JSON.parse(json)

        const elements = {}
        const attrs = {
            ...teiSimple.attrs,
            "__id__": { hidden: true }
        }

        // These nodes must always be present.
        // ProseMirror cannot mix inline and block types in content expressions, so we have to 
        // wrap text in a block and then unwrap it when we save the file. see xml.js
        const nodes = {
            text: {
                inline: true
            },
            textNode: {
                content: "(inline_node|text)*",
                selectable: false,
                draggable: false,
                parseDOM: [
                    {
                        tag: "textNode"
                    } 
                ],
                toDOM: () => ["textNode",0]   
            },
            globalNode: {
                content: "inline_node+",
                group: "model_milestoneLike model_noteLike model_global",
                atom: true,
                selectable: false,
                parseDOM: [
                    {
                        tag: "globalNode"
                    } 
                ],
                toDOM: () => ["globalNode",0]
            }
        }
        
        const marks = {}

        for( const element of teiSimple.elements ) {
            const { pmType, name, content, group, isolating, icon } = element
            const validAttrs = element.validAttrs ? element.validAttrs : []
            if( pmType === 'mark' || pmType === 'node') {
                const phraseLvl = (pmType === 'mark')
                const elSpec = this.createElementSpec({ name, attrs: validAttrs, content, group, phraseLvl, isolating })
                if( pmType === 'mark' ) {
                    marks[name] = elSpec
                } else {
                    nodes[name] = elSpec
                }
            } else if( pmType === 'inline-node' ) {
                if( teiSimple.elementGroups.asides.includes(name) ) {
                    nodes[name] = this.createAsideSpec(name, icon, validAttrs, content, group)
                } else {
                    nodes[name] = this.createAtomSpec(name, icon, validAttrs, group)
                }
            } else {
                console.log('unrecognized pmType')
            }
            elements[name] = element            
        }

        return { schemaSpec: { nodes, marks }, elements, attrs, elementGroups: teiSimple.elementGroups }
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

    createElementSpec(elSpec) {
        const { name, content, group, phraseLvl, isolating } = elSpec
        const attrs = this.getAttrSpec(elSpec.attrs)
        return {
            content,
            group,
            attrs,
            isolating,
            marks: "",
            parseDOM: [
                {
                    tag: name,
                    getAttrs: this.getAttrParser(elSpec.attrs)
                } 
            ],
            toDOM: (el) => {
                if( this.teiMode ) {
                    let attrs = this.filterOutBlanks(el.attrs)
                    attrs = this.filterOutErrors(attrs)
                    return [name,attrs,0]
                } else {
                    const displayAttrs = { ...el.attrs, phraseLvl }
                    return [`tei-${name}`,displayAttrs,0]
                }
            } 
        }
    }

    createAsideSpec(name, icon, validAttrs, content, group) {

        let attrs = this.getAttrSpec(validAttrs)
        attrs['__id__'] = {}

        return {
            inline: true,
            atom: true,
            content,
            group,
            attrs,
            parseDOM: [
                {
                    tag: name,
                    getAttrs: (domNode) => {
                        const attrParser = this.getAttrParser(validAttrs)
                        const existingID = domNode.getAttribute('__id__')
                        const teiDocument = this.teiDocuments[this.teiDocuments.length-1]
                        const noteID = existingID ? existingID : teiDocument.issueSubDocumentID()
                        teiDocument.parseSubDocument(domNode, name, noteID)
                        return { ...attrParser(domNode), __id__: noteID }
                    },
                }
            ],
            toDOM: (node) => { 
                if( this.teiMode ) {
                    let attrs = this.filterOutBlanks(node.attrs)
                    attrs = this.filterOutErrors(attrs)
                    const teiDocument = this.teiDocuments[this.teiDocuments.length-1]
                    return teiDocument.serializeSubDocument(name, attrs)
                } else {
                    const noteAttrs = { ...node.attrs, class: `far fa-xs ${icon} inline-node` }
                    return [`tei-${name}`,noteAttrs]
                }
            }
        }          
    }

    createAtomSpec(name, icon, validAttrs, group) {
        const attrs = this.getAttrSpec(validAttrs)

        return {
            inline: true,
            atom: true,
            content: "",
            group,
            attrs: attrs,
            parseDOM: [{
                tag: name,
                getAttrs: this.getAttrParser(validAttrs)
            }],
            toDOM: (node) => {
                if( this.teiMode ) {
                    let attrs = this.filterOutBlanks(node.attrs)
                    attrs = this.filterOutErrors(attrs)
                    return [name,attrs]
                } else {
                    const atomAttrs = { ...node.attrs, class: `far ${icon} inline-node` }
                    return [`tei-${name}`,atomAttrs]  
                }
            }  
        }
    }

    getAttrSpec( validAttrs ) {
        let attrs = {}
        for( const attr of validAttrs ) {
            attrs[attr] = { default: '' }
        }
        attrs['__error__'] = { default: false }
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
}
import {Schema} from "prosemirror-model"
import { DOMParser as PMDOMParser } from "prosemirror-model"
import { createValidationSet } from "./element-validators"
import { synthNameToElementName } from "./xml"

const pmTypeToMenu = {
    "node": ['structure'],
    "mark": ['mark'],
    "inline-node": [ 'structure', 'inline' ]
}

const elementTypeToPmTypes = {
    'docNodes': [],
    'embed':[],
    'exclude':[],
    'hard': ['node'],
    'soft': ['node'],
    'marks': ['mark'],
    'inter': ['node','mark'],
    'inlines': ['inline-node'],
    'asides': ['inline-node']
}

export const systemElements = [
    'text'
]

export const systemAttributes = [
    '__id__',
    '__error__',
    '__border__' 
]

export default class TEISchema {

    constructor(json) {
        this.teiDocuments = []
        this.schemaJSON = json
        this.teiMode = false
        const { schemaSpec, elements, attrs, elementGroups, modules } = this.parseSchemaConfig(json)
        this.elementGroups = elementGroups
        this.elements = elements
        this.attrs = attrs
        this.modules = modules
        this.schema = new Schema(schemaSpec)
        this.domParser = PMDOMParser.fromSchema(this.schema)
        this.createSubDocSchemas(schemaSpec)
        this.validationSet = createValidationSet(this.elements,this.schema)
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
        const nodes = {
            text: {
                inline: true
            }
        }
        
        const marks = {}

        for( const element of teiSimple.elements ) {
            const { pmType, name, marks: markContent, content, group, isolating, icon } = element
            const validAttrs = element.validAttrs ? element.validAttrs : []
            if( pmType === 'mark' || pmType === 'node') {
                const phraseLvl = (pmType === 'mark')
                const elSpec = this.createElementSpec({ name, attrs: validAttrs, content, group, markContent, phraseLvl, isolating })
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

        return { schemaSpec: { nodes, marks }, elements, attrs, elementGroups: teiSimple.elementGroups, modules: teiSimple.modules }
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

    filterInternal( attrObj ) {
        // don't save error flags
        const attrs = {}
        for( const key of Object.keys(attrObj) ) {
            const value = attrObj[key]
            if( !systemAttributes.includes(key)) {
                attrs[key] = value
            }
        }
        return attrs
    }

    createElementSpec(elSpec) {
        const { name, markContent, content, group, phraseLvl, isolating } = elSpec
        const attrs = this.getPMAttrSpec(elSpec.attrs)
        return {
            content,
            group,
            attrs,
            isolating,
            marks: markContent,
            parseDOM: [
                {
                    tag: name,
                    getAttrs: this.getAttrParser(elSpec.attrs)
                } 
            ],
            toDOM: (el) => {
                if( this.teiMode ) {
                    let attrs = this.filterOutBlanks(el.attrs)
                    attrs = this.filterInternal(attrs)
                    return [name,attrs,0]
                } else {
                    const displayAttrs = { ...el.attrs, phraseLvl }
                    return [`tei-${name}`,displayAttrs,0]
                }
            } 
        }
    }

    createAsideSpec(name, icon, validAttrs, content, group) {

        let attrs = this.getPMAttrSpec(validAttrs)
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
                    const subDocID = attrs['__id__']
                    attrs = this.filterInternal(attrs)
                    const teiDocument = this.teiDocuments[this.teiDocuments.length-1]
                    return teiDocument.serializeSubDocument( subDocID, name, attrs)
                } else {
                    const noteAttrs = { ...node.attrs, class: `far fa-xs ${icon} inline-node` }
                    return [`tei-${name}`,noteAttrs]
                }
            }
        }          
    }

    createAtomSpec(name, icon, validAttrs, group) {
        const attrs = this.getPMAttrSpec(validAttrs)

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
                    attrs = this.filterInternal(attrs)
                    return [name,attrs]
                } else {
                    const atomAttrs = { ...node.attrs, class: `far ${icon} inline-node` }
                    return [`tei-${name}`,atomAttrs]  
                }
            }  
        }
    }

    getPMAttrSpec( validAttrs ) {
        let attrs = {}
        for( const attr of validAttrs ) {
            attrs[attr] = { default: '' }
        }
        attrs['__error__'] = { default: false }
        attrs['__border__'] = { default: false }
        return attrs
    }

    // if there is a definition of this attr specific to this element, use that, otherwise use the global def.
    getAttrSpec( attrID, elementID ) {
        const elementName = synthNameToElementName(elementID)
        if( !elementName ) return this.attrs[attrID]
        const elementSpec = this.elements[elementName]
        return elementSpec.derivedAttrs.includes(attrID) ? this.attrs[`${attrID}-${elementName}`] : this.attrs[attrID]
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

    getElementType(elementID) {
        for( const groupID of Object.keys(this.elementGroups) ) {
            if( this.elementGroups[groupID].includes(elementID) ) {
                return groupID
            }
        }
        return null
    }

    getElementMenu(pmType) {
        return pmTypeToMenu[pmType]
    }

    validElementMenu(elementMenu,elementID) {
        const elementType = this.getElementType(elementID)
        const pmTypes = elementTypeToPmTypes[elementType]
        const menus = pmTypes.map( pmType => pmTypeToMenu[pmType] ).flat()
        return menus.includes(elementMenu)
    }

    getElementIcon(elementID) {
        const elementSpec = this.elements[elementID]
        return elementSpec ? `far ${elementSpec.icon}` : null
    }
    
}
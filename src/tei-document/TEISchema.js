import {Schema} from "prosemirror-model"
import {DOMParser as PMDOMParser } from "prosemirror-model"
import {DOMSerializer} from "prosemirror-model"
import { NodeRange } from 'prosemirror-model'

// These elements are processed in XSLT by the xsl:strip-space command. This list is from xml/tei/odd/stripspace.xsl.model
const xmlStripSpaceNames = "TEI abstract additional address adminInfo altGrp altIdentifier alternate analytic annotation annotationBlock app appInfo application arc argument att attDef attList availability back biblFull biblStruct bicond binding bindingDesc body broadcast cRefPattern calendar calendarDesc castGroup castList category certainty char charDecl charProp choice cit classDecl classSpec classes climate cond constraintSpec content correction correspAction correspContext correspDesc custodialHist dataRef dataSpec datatype decoDesc dimensions div div1 div2 div3 div4 div5 div6 div7 divGen docTitle eLeaf eTree editionStmt editorialDecl elementSpec encodingDesc entry epigraph epilogue equipment event exemplum fDecl fLib facsimile figure fileDesc floatingText forest front fs fsConstraints fsDecl fsdDecl fvLib gap gi glyph graph graphic group handDesc handNotes history hom hyphenation iNode if imprint incident index interpGrp interpretation join joinGrp keywords kinesic langKnowledge langUsage layoutDesc leaf lg linkGrp list listAnnotation listApp listBibl listChange listEvent listForest listNym listObject listOrg listPerson listPlace listPrefixDef listRef listRelation listTranspose listWit location locusGrp macroSpec media metDecl model modelGrp modelSequence moduleRef moduleSpec monogr msContents msDesc msFrag msIdentifier msItem msItemStruct msPart namespace node normalization notatedMusic notesStmt nym object objectDesc objectIdentifier org paramList paramSpec particDesc performance person personGrp persona physDesc place population postscript precision prefixDef profileDesc projectDesc prologue publicationStmt punctuation quotation rdgGrp recordHist recording recordingStmt refsDecl relatedItem relation remarks respStmt respons revisionDesc root row samplingDecl schemaRef schemaSpec scriptDesc scriptStmt seal sealDesc segmentation sequence seriesStmt set setting settingDesc sourceDesc sourceDoc sp spGrp space spanGrp specGrp specList standOff state stdVals styleDefDecl subst substJoin superEntry supportDesc surface surfaceGrp table tagsDecl taxonomy teiCorpus teiHeader terrain text textClass textDesc timeline titlePage titleStmt trait transcriptionDesc transpose tree triangle typeDesc unitDecl unitDef vAlt vColl vDefault vLabel vMerge vNot vRange valItem valList vocal".split(' ')

export default class TEISchema {

    constructor(json) {
        this.teiDocuments = []
        this.teiMode = false
        const { schemaSpec, elements, attrs, elementGroups } = this.parseSchemaConfig(json)
        this.elementGroups = elementGroups
        this.elements = elements
        this.attrs = attrs
        this.schema = new Schema(schemaSpec)
        this.domParser = PMDOMParser.fromSchema(this.schema)
        this.schemaJSON = json
    }

    parseText(textEl, teiDocument) {
        const { hard, soft, inter } = this.elementGroups
        const nodes = [...hard,...soft]
        const markPrefix = 'mark'

        function isInterMark(markEl) {
            // are there any node descendants of markEl?
            for( const node of nodes ) {
                const nodeEls = markEl.querySelectorAll(node)
                if( nodeEls.length > 0 ) return false
            }
            return true
        }

        // pre-parse inter nodes, separating would be marks from nodes
        for( const xmlTag of inter ) {
            const markEls = textEl.querySelectorAll(xmlTag)
            for( let i=0; i < markEls.length; i++ ) {
                const markEl = markEls[i]
                // if this is a mark.. rename to interMark tag
                if( isInterMark(markEl) ) {
                    const interEl = document.createElement(`${markPrefix}${xmlTag}`)
                    interEl.innerHTML = markEl.innerHTML
                    markEl.parentNode.replaceChild(interEl,markEl)
                }
            }
        }

        // Remove whitespace from children of xmlStripSpaceNames elements, 
        // as per TEI Guidelines section 1.3.1.1.6 
        for( const xmlStripSpaceName of xmlStripSpaceNames ) {
            const stripEls = textEl.querySelectorAll(xmlStripSpaceName)
            for( let i=0; i < stripEls.length; i++ ) {
                const stripEl = stripEls[i]
                const nextEl = document.createElement(stripEl.nodeName)
                for( let j=0; j < stripEl.childNodes.length; j++ ) {
                    const child = stripEl.childNodes[j]
                    if( child.nodeName === '#text' ) {
                        const nextContent = child.textContent.replace(/\s+/g, '')
                        if( nextContent.length > 0 ) {                            
                            nextEl.appendChild(nextContent)
                        }
                    } else {
                        nextEl.appendChild(child)
                    }
                }
                stripEl.parentNode.replaceChild(nextEl,stripEl)
            }
        }

        // make the TEIDocument visible to the node spec parser for access to sub docs
        this.teiDocuments.push(teiDocument)
        const doc = this.domParser.parse(textEl)
        this.teiDocuments.pop()
        return doc
    }

    serializeText( content, teiDocument ) {
        const { inter } = this.elementGroups

        // remove textNodes from the DOM and replace each with its children
        function removeTextNodes(documentFragment) {
            const textNodes = documentFragment.querySelectorAll("textNode")
            for( let i=0; i < textNodes.length; i++ ) {
                const textNode = textNodes[i]
                const texts = []
                for( let j=0; j < textNode.childNodes.length; j++ ) {
                    texts.push(textNode.childNodes.item(j))
                } 
                textNode.before(...texts)
                textNode.remove()
            }
        }

        // convert all intermarks back to their XML node names
        function renameInterMarks(documentFragment) {
            for( const interMark of inter ) {
                const interMarkName = `mark${interMark}`
                const markEls = documentFragment.querySelectorAll(interMarkName)
                for( let i=0; i < markEls.length; i++ ) {
                    const markEl = markEls[i]
                    const interEl = document.createElement(interMark)
                    interEl.innerHTML = markEl.innerHTML
                    markEl.parentNode.replaceChild(interEl,markEl)
                }
            }
        }

        // make the TEIDocument visible to the serialize for access to sub docs
        this.teiDocuments.push(teiDocument)
        const domSerializer = DOMSerializer.fromSchema( this.schema )
        const domFragment = domSerializer.serializeFragment(content)
        removeTextNodes(domFragment)
        renameInterMarks(domFragment)
        this.teiDocuments.pop()
        return domFragment
    }

    addTextNodes(editorView) {
        const { state } = editorView
        const { tr, doc } = state
        const textNodeType = this.schema.nodes['textNode'] 

        doc.descendants((node,pos) => {
            const contentExp = node.type.spec.content
            // if an element could have a textnode, but is instead empty, add a textnode to it
            if( node.childCount === 0 && contentExp && contentExp.includes('textNode') ) {
                const $start = tr.doc.resolve(tr.mapping.map(pos+1))
                const nodeRange = new NodeRange($start,$start,$start.depth)
                tr.wrap(nodeRange, [{type: textNodeType}])
            }
            return true
        })
        editorView.dispatch(tr)
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
        // wrap text in a block and then unwrap it when we save the file. see removeTextNodes()
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
                draggable: false,
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
                if( name === 'note' ) {
                    nodes[name] = this.createNoteSpec(validAttrs, content, group)
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
                    const displayAttrs = { ...el.attr, phraseLvl }
                    return [`tei-${name}`,displayAttrs,0]
                }
            } 
        }
    }

    createNoteSpec(validAttrs, content, group) {

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
                    const noteAttrs = { ...node.attrs, class: "far fa-xs fa-comment-alt inline-node" }
                    return ["tei-note",noteAttrs]
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
}
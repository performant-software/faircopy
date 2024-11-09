import { DOMSerializer, Fragment } from "prosemirror-model"

// These elements are processed in XSLT by the xsl:strip-space command. This list is from xml/tei/odd/stripspace.xsl.model, TEI v4.1.0
const xmlStripSpaceNames = "TEI abstract additional address adminInfo altGrp altIdentifier alternate analytic annotation annotationBlock app appInfo application arc argument att attDef attList availability back biblFull biblStruct bicond binding bindingDesc body broadcast cRefPattern calendar calendarDesc castGroup castList category certainty char charDecl charProp choice cit classDecl classSpec classes climate cond constraintSpec content correction correspAction correspContext correspDesc custodialHist dataRef dataSpec datatype decoDesc dimensions div div1 div2 div3 div4 div5 div6 div7 divGen docTitle eLeaf eTree editionStmt editorialDecl elementSpec encodingDesc entry epigraph epilogue equipment event exemplum fDecl fLib facsimile figure fileDesc floatingText forest front fs fsConstraints fsDecl fsdDecl fvLib gap gi glyph graph graphic group handDesc handNotes history hom hyphenation iNode if imprint incident index interpGrp interpretation join joinGrp keywords kinesic langKnowledge langUsage layoutDesc leaf lg linkGrp list listAnnotation listApp listBibl listChange listEvent listForest listNym listObject listOrg listPerson listPlace listPrefixDef listRef listRelation listTranspose listWit location locusGrp macroSpec media metDecl model modelGrp modelSequence moduleRef moduleSpec monogr msContents msDesc msFrag msIdentifier msItem msItemStruct msPart namespace node normalization notatedMusic notesStmt nym object objectDesc objectIdentifier org paramList paramSpec particDesc performance person personGrp persona physDesc place population postscript precision prefixDef profileDesc projectDesc prologue publicationStmt punctuation quotation rdgGrp recordHist recording recordingStmt refsDecl relatedItem relation remarks respStmt respons revisionDesc root row samplingDecl schemaRef schemaSpec scriptDesc scriptStmt seal sealDesc segmentation sequence seriesStmt set setting settingDesc sourceDesc sourceDoc sp spGrp space spanGrp specGrp specList standOff state stdVals styleDefDecl subst substJoin superEntry supportDesc surface surfaceGrp table tagsDecl taxonomy teiCorpus teiHeader terrain text textClass textDesc timeline titlePage titleStmt trait transcriptionDesc transpose tree triangle typeDesc unitDecl unitDef vAlt vColl vDefault vLabel vMerge vNot vRange valItem valList vocal".split(' ')

export function parseText(textEl, teiDocument, teiSchema, subDocName) {
    // make the TEIDocument visible to the node spec parser for access to sub docs
    teiSchema.teiDocuments.push(teiDocument)
    stripSpaces(textEl)
    parseInterNodes(textEl,teiSchema,teiDocument.xmlDom)
    const domParser = subDocName !== 'text' ? teiSchema.docNodeParsers[subDocName] : teiSchema.domParser
    const doc = domParser.parse(textEl)
    teiSchema.teiDocuments.pop()
    return doc
}

export function serializeText(doc, teiDocument, teiSchema) {
    const { resourceType, xmlDom } = teiDocument
    teiSchema.teiMode = true
    let textEl, domFragment
    if( resourceType === 'header' ) {
        domFragment = proseMirrorToDOM(doc.content, teiDocument, teiSchema, 'header')
        textEl = xmlDom.getElementsByTagName('teiHeader')[0]    
    } else if( resourceType === 'text' ) {
        domFragment = proseMirrorToDOM(doc.content, teiDocument, teiSchema)
        textEl = xmlDom.getElementsByTagName('text')[0]    
    } else if( resourceType === 'standOff' ) {
        domFragment = proseMirrorToDOM(doc.content, teiDocument, teiSchema)
        textEl = xmlDom.getElementsByTagName('standOff')[0]    
    } else if( resourceType === 'sourceDoc' ) {
        domFragment = proseMirrorToDOM(doc.content, teiDocument, teiSchema)
        textEl = xmlDom.getElementsByTagName('sourceDoc')[0]         
    }

    // take the body of the document from prosemirror and reunite it with 
    // the rest of the xml document, then serialize to string
    var div = document.createElement('div')
    div.appendChild( domFragment.cloneNode(true) )
    textEl.innerHTML = htmlToXML(div.innerHTML,teiSchema.elements,teiSchema.attrs)
    const fileContents = new XMLSerializer().serializeToString(teiDocument.xmlDom);
    teiSchema.teiMode = false
 
    return fileContents
}

export function proseMirrorToDOM( content, teiDocument, teiSchema, subDocName ) {
    const { inter } = teiSchema.elementGroups

    // make the TEIDocument visible to the serialize for access to sub docs
    teiSchema.teiDocuments.push(teiDocument)
    const schema = subDocName ? teiSchema.docNodeSchemas[subDocName] : teiSchema.schema
    const domSerializer = DOMSerializer.fromSchema( schema )
    const domFragment = domSerializer.serializeFragment(content)

    // remove all text node channels TODO: what is max i?
    for( let i=0; i<99; i++ )  {
        removeNodes(domFragment, `textNode${i}`)
        removeNodes(domFragment, `globalNode${i}`)
    }

    renameInterMarks(inter, domFragment, teiDocument.xmlDom)
    teiSchema.teiDocuments.pop()
    return domFragment
}

export function getTextNodeName(content) {
    // find the text node in the content expression
    const matches = content.match(/textNode[0-9]+/)
    const textNodeName = matches && matches[0] ? matches[0] : null
    return textNodeName
}

export function findNoteNode( doc, noteID ) {
    let noteNode, notePos
    doc.descendants( (node,pos) => {
        if( node.attrs['__id__'] === noteID ) {
            noteNode = node
            notePos = pos
        }
        if( noteNode ) return false
    })
    return { noteNode, notePos }
}

export function synthNameToElementName(nodeName) {
    if( nodeName.includes('textNode') || nodeName.includes('globalNode') ) return null
    return nodeName.endsWith('X') ? nodeName.slice(0,-1) : nodeName.startsWith('mark') ? nodeName.slice('mark'.length) : nodeName
}

// Internodes are a set of elements that can be processed as either nodes or marks, depending on their
// location in the document structure. They have to be determined before parsing with ProseMirror.
function parseInterNodes(textEl,teiSchema,xmlDom) {
    const { elements, elementGroups } = teiSchema
    const { hard, soft, inter, asides } = elementGroups
    const nodes = [...hard,...soft]
    const markPrefix = 'mark'

    // asides which can't have textNode direct children
    const hardAsides = asides.filter( aside => { 
        return !elements[`${aside}X`].content.includes('textNode')
    })

    // Node names are uppercase, so these are uppercased. Also, need to test against
    // both aside node name and the 'X' variant used in sub documents
    const interMarkSet = [ ...hard.map(i => i.toUpperCase()), ...hardAsides.map(i => i.toUpperCase()), ...hardAsides.map(i => `${i.toUpperCase()}X`) ]

    function isMark(markEl) {
        let parentNodeName = markEl.parentNode.nodeName.toUpperCase()

        // is its parent a node that precludes it from being a mark?
        if( interMarkSet.includes(parentNodeName) ) return false

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
            if( isMark(markEl) ) {
                const elName = `${markPrefix}${xmlTag}`
                const interEl = xmlDom.createElement(elName)
                interEl.innerHTML = markEl.innerHTML
                cloneAttributes(interEl,markEl)
                markEl.parentNode.replaceChild(interEl,markEl)
            }
        }
    }
}

// Remove whitespace from children of xmlStripSpaceNames elements, 
// as per TEI Guidelines section 1.3.1.1.6 
function stripSpaces(textEl) {
    for( const xmlStripSpaceName of xmlStripSpaceNames ) {
        const stripEls = textEl.querySelectorAll(xmlStripSpaceName)
        for( let i=0; i < stripEls.length; i++ ) {
            const stripEl = stripEls[i]
            for( let j=0; j < stripEl.childNodes.length; j++ ) {
                const child = stripEl.childNodes[j]
                if( child.nodeName === '#text' ) {
                    stripEl.removeChild(child)
                }
            }
        }
    }   
}

// remove temporary nodes from the DOM and replace each with its children
function removeNodes(documentFragment,nodeName) {
    const nodes = documentFragment.querySelectorAll(nodeName)
    for( let i=0; i < nodes.length; i++ ) {
        const node = nodes[i]
        const items = []
        for( let j=0; j < node.childNodes.length; j++ ) {
            items.push(node.childNodes.item(j))
        } 
        node.before(...items)
        node.remove()
    }
}

// convert all intermarks back to their XML node names
function renameInterMarks(inter, documentFragment, xmlDom) {
    for( const interMark of inter ) {
        const interMarkName = `mark${interMark}`
        const markEls = documentFragment.querySelectorAll(interMarkName)
        for( let i=0; i < markEls.length; i++ ) {
            const markEl = markEls[i]
            const interEl = xmlDom.createElement(interMark)
            interEl.innerHTML = markEl.innerHTML
            cloneAttributes(interEl,markEl)
            markEl.parentNode.replaceChild(interEl,markEl)
        }
    }
}

// Apply various transformations to move from HTML -> XML
export function htmlToXML(html,elements,attrs) {
    // This entitiy is not valid XML
    const nextHTML = html.replaceAll('&nbsp;',' ')
    // this has to be done here because HTML is case insenitive, while XML is not.
    return renameCamelCase(nextHTML,elements,attrs)
}

export function addTextNodes(state, dispatch=null) {
    const { tr, schema, doc } = state

    // if an element could have a textnode, but is instead empty, add a textnode to it
    doc.descendants((node,pos) => {
        const contentExp = node.type.spec.content
        if( node.childCount === 0 && contentExp && contentExp.includes('textNode') ) {
            const textNodeName = getTextNodeName(contentExp)
            const textNodeType = schema.nodes[textNodeName]
            const insertPos = tr.mapping.map(pos+1)
            tr.setMeta('addToHistory',false)
            tr.insert( insertPos, textNodeType.create() )
        }
        return true
    })

    // split text nodes at line beginnings
    splitOnLineBeginnings(doc,tr)

    if( dispatch ) { 
        dispatch(tr)
    } else {
        const {state: nextState} = state.applyTransaction(tr)
        return nextState.doc
    }
}

// take content fragment and replace any text nodes in there with text node type
export function replaceTextNodes( textNodeType, fragment ) {
    let siblings = []
    for( let i=0; i < fragment.childCount; i++ ) { 
        const sibling = fragment.child(i)
        if( sibling.type.name.includes('textNode') && sibling.type.name !== textNodeType.name ) {
            const textNodeContent = sibling.content
            for( let i=0; i < textNodeContent.childCount; i++ ) {
                const node = textNodeContent.child(i)
                for( const mark of node.marks ) {
                    if( !textNodeType.allowsMarkType(mark.type) ) {
                        // if any marks are not allowed for this textNode
                        return null
                    }
                }
            }
            const nextSib = textNodeType.create(sibling.attr, sibling.content )
            siblings.push( nextSib ) 
        } else {
            siblings.push( sibling ) 
        }
    }

    // return new content fragment 
    return Fragment.from(siblings) 
}

// Repair camel cased attrs that React munged
function renameCamelCase(html,elements,attrs) {
    let htmlBuffer = html
    for( const attr of Object.values(attrs) ) {
        if( attr.ident ) {
            htmlBuffer = renameAttrs(htmlBuffer, attr.ident.toLowerCase(), attr.ident)
        }
    }
    for( const el of Object.values(elements) ) {
        if( el.name ) {
            htmlBuffer = renameEls(htmlBuffer, el.name.toLowerCase(), el.name)
        }
    }
    return htmlBuffer
}

function renameAttrs(htmlFragment, oldAttrName, newAttrName) {
    const regex = new RegExp(`${oldAttrName}=`,'g')
    return htmlFragment.replace(regex,`${newAttrName}=`)
}

function renameEls(htmlFragment, oldElName, newElName) {
    // capture any attributes 
    const regexOpen = new RegExp(`<${oldElName}(\\s+[^>]*)*>`,'g')
    const regexClose = new RegExp(`</${oldElName}>`,'g')
    return htmlFragment.replace(regexOpen,(match,attrs) => `<${newElName}${attrs ? attrs : ''}>`).replace(regexClose,`</${newElName}>`)
}

// copy all the attributes from one element to another
function cloneAttributes(target, source) {
    [...source.attributes].forEach( attr => { target.setAttribute(attr.nodeName ,attr.nodeValue) })
}

// Honor line beginning elements by splitting the 
// parent node at the line break
function splitOnLineBeginnings(doc,tr) {
    doc.descendants( (node, pos, parent) => {
        const nodeType = node.type.name
        const parentType = parent ? parent.type.name : null
        if( parentType && 
            parentType.startsWith('textNode') && 
            nodeType === 'lb' ) {
            const lbPos = tr.mapping.map(pos)
            console.log(`split at ${lbPos}`)
            tr.split(lbPos)
        }
    })
}
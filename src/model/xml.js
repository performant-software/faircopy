import { DOMSerializer } from "prosemirror-model"

// These elements are processed in XSLT by the xsl:strip-space command. This list is from xml/tei/odd/stripspace.xsl.model, TEI v4.1.0
const xmlStripSpaceNames = "TEI abstract additional address adminInfo altGrp altIdentifier alternate analytic annotation annotationBlock app appInfo application arc argument att attDef attList availability back biblFull biblStruct bicond binding bindingDesc body broadcast cRefPattern calendar calendarDesc castGroup castList category certainty char charDecl charProp choice cit classDecl classSpec classes climate cond constraintSpec content correction correspAction correspContext correspDesc custodialHist dataRef dataSpec datatype decoDesc dimensions div div1 div2 div3 div4 div5 div6 div7 divGen docTitle eLeaf eTree editionStmt editorialDecl elementSpec encodingDesc entry epigraph epilogue equipment event exemplum fDecl fLib facsimile figure fileDesc floatingText forest front fs fsConstraints fsDecl fsdDecl fvLib gap gi glyph graph graphic group handDesc handNotes history hom hyphenation iNode if imprint incident index interpGrp interpretation join joinGrp keywords kinesic langKnowledge langUsage layoutDesc leaf lg linkGrp list listAnnotation listApp listBibl listChange listEvent listForest listNym listObject listOrg listPerson listPlace listPrefixDef listRef listRelation listTranspose listWit location locusGrp macroSpec media metDecl model modelGrp modelSequence moduleRef moduleSpec monogr msContents msDesc msFrag msIdentifier msItem msItemStruct msPart namespace node normalization notatedMusic notesStmt nym object objectDesc objectIdentifier org paramList paramSpec particDesc performance person personGrp persona physDesc place population postscript precision prefixDef profileDesc projectDesc prologue publicationStmt punctuation quotation rdgGrp recordHist recording recordingStmt refsDecl relatedItem relation remarks respStmt respons revisionDesc root row samplingDecl schemaRef schemaSpec scriptDesc scriptStmt seal sealDesc segmentation sequence seriesStmt set setting settingDesc sourceDesc sourceDoc sp spGrp space spanGrp specGrp specList standOff state stdVals styleDefDecl subst substJoin superEntry supportDesc surface surfaceGrp table tagsDecl taxonomy teiCorpus teiHeader terrain text textClass textDesc timeline titlePage titleStmt trait transcriptionDesc transpose tree triangle typeDesc unitDecl unitDef vAlt vColl vDefault vLabel vMerge vNot vRange valItem valList vocal".split(' ')

export function parseText(textEl, teiDocument, teiSchema, subDocName) {
    // make the TEIDocument visible to the node spec parser for access to sub docs
    teiSchema.teiDocuments.push(teiDocument)
    parseInterNodes(textEl,teiSchema)
    stripSpaces(textEl)
    const domParser = subDocName ? teiSchema.docNodeParsers[subDocName] : teiSchema.domParser
    const doc = domParser.parse(textEl)
    teiSchema.teiDocuments.pop()
    return doc
}

export function serializeText(doc, teiDocument, teiSchema) {
    teiSchema.teiMode = true
    let textEl, domFragment
    if( teiDocument.resourceType === 'header' ) {
        domFragment = proseMirrorToDOM(doc.content, teiDocument, teiSchema, 'header')
        textEl = teiDocument.xmlDom.getElementsByTagName('teiHeader')[0]    
    } else {
        domFragment = proseMirrorToDOM(doc.content, teiDocument, teiSchema)
        textEl = teiDocument.xmlDom.getElementsByTagName('text')[0]    
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
    removeNodes(domFragment, 'textNode')
    removeNodes(domFragment, 'globalNode')
    renameInterMarks(inter, domFragment)
    teiSchema.teiDocuments.pop()
    return domFragment
}

// Internodes are a set of elements that can be processed as either nodes or marks, depending on their
// location in the document structure. They have to be determined before parsing with ProseMirror.
function parseInterNodes(textEl,teiSchema) {
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
                const interEl = document.createElement(`${markPrefix}${xmlTag}`)
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
            const nextEl = stripEl.cloneNode(false)
            for( let j=0; j < stripEl.childNodes.length; j++ ) {
                const child = stripEl.childNodes[j]
                const nextChild = child.cloneNode(true)
                if( child.nodeName === '#text' ) {
                    const nextChildContent = child.textContent.replace(/\s+/g, '')
                    nextChild.innerHTML = nextChildContent
                    if( nextChildContent.length > 0 ) nextEl.appendChild(nextChild)
                } else {
                    nextEl.appendChild(nextChild)
                }
            }
            stripEl.parentNode.replaceChild(nextEl,stripEl)
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
function renameInterMarks(inter, documentFragment) {
    for( const interMark of inter ) {
        const interMarkName = `mark${interMark}`
        const markEls = documentFragment.querySelectorAll(interMarkName)
        for( let i=0; i < markEls.length; i++ ) {
            const markEl = markEls[i]
            const interEl = document.createElement(interMark)
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

export function addTextNodes(editorView) {
    const { tr, schema } = editorView.state
    const textNodeType = schema.nodes['textNode'] 

    // if an element could have a textnode, but is instead empty, add a textnode to it
    tr.doc.descendants((node,pos) => {
        const contentExp = node.type.spec.content
        if( node.childCount === 0 && contentExp && contentExp.includes('textNode') ) {
            const insertPos = tr.mapping.map(pos+1)
            tr.insert( insertPos, textNodeType.create() )
        }
        return true
    })

    editorView.dispatch(tr)
}

// Repair camel cased attrs that React munged
function renameCamelCase(html,elements,attrs) {
    const regex = /[a-z]+[A-Z]/
    let htmlBuffer = html
    for( const attr of Object.values(attrs) ) {
        if( attr.ident && attr.ident.match(regex) ) {
            htmlBuffer = renameAttrs(htmlBuffer, attr.ident.toLowerCase(), attr.ident)
        }
    }
    for( const el of Object.values(elements) ) {
        if( el.name && el.name.match(regex) ) {
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
    const regexOpen = new RegExp(`<${oldElName}`,'g')
    const regexClose = new RegExp(`</${oldElName}`,'g')
    return htmlFragment.replace(regexOpen,`<${newElName}`).replace(regexClose,`</${newElName}`)
}

// copy all the attributes from one element to another
function cloneAttributes(target, source) {
    [...source.attributes].forEach( attr => { target.setAttribute(attr.nodeName ,attr.nodeValue) })
}
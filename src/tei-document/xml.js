import {DOMSerializer} from "prosemirror-model"

// These elements are processed in XSLT by the xsl:strip-space command. This list is from xml/tei/odd/stripspace.xsl.model
const xmlStripSpaceNames = "TEI abstract additional address adminInfo altGrp altIdentifier alternate analytic annotation annotationBlock app appInfo application arc argument att attDef attList availability back biblFull biblStruct bicond binding bindingDesc body broadcast cRefPattern calendar calendarDesc castGroup castList category certainty char charDecl charProp choice cit classDecl classSpec classes climate cond constraintSpec content correction correspAction correspContext correspDesc custodialHist dataRef dataSpec datatype decoDesc dimensions div div1 div2 div3 div4 div5 div6 div7 divGen docTitle eLeaf eTree editionStmt editorialDecl elementSpec encodingDesc entry epigraph epilogue equipment event exemplum fDecl fLib facsimile figure fileDesc floatingText forest front fs fsConstraints fsDecl fsdDecl fvLib gap gi glyph graph graphic group handDesc handNotes history hom hyphenation iNode if imprint incident index interpGrp interpretation join joinGrp keywords kinesic langKnowledge langUsage layoutDesc leaf lg linkGrp list listAnnotation listApp listBibl listChange listEvent listForest listNym listObject listOrg listPerson listPlace listPrefixDef listRef listRelation listTranspose listWit location locusGrp macroSpec media metDecl model modelGrp modelSequence moduleRef moduleSpec monogr msContents msDesc msFrag msIdentifier msItem msItemStruct msPart namespace node normalization notatedMusic notesStmt nym object objectDesc objectIdentifier org paramList paramSpec particDesc performance person personGrp persona physDesc place population postscript precision prefixDef profileDesc projectDesc prologue publicationStmt punctuation quotation rdgGrp recordHist recording recordingStmt refsDecl relatedItem relation remarks respStmt respons revisionDesc root row samplingDecl schemaRef schemaSpec scriptDesc scriptStmt seal sealDesc segmentation sequence seriesStmt set setting settingDesc sourceDesc sourceDoc sp spGrp space spanGrp specGrp specList standOff state stdVals styleDefDecl subst substJoin superEntry supportDesc surface surfaceGrp table tagsDecl taxonomy teiCorpus teiHeader terrain text textClass textDesc timeline titlePage titleStmt trait transcriptionDesc transpose tree triangle typeDesc unitDecl unitDef vAlt vColl vDefault vLabel vMerge vNot vRange valItem valList vocal".split(' ')

export function parseText(textEl, teiDocument, teiSchema) {
    // make the TEIDocument visible to the node spec parser for access to sub docs
    teiSchema.teiDocuments.push(teiDocument)
    parseInterNodes(textEl,teiSchema)
    stripSpaces(textEl)
    const doc = teiSchema.domParser.parse(textEl)
    teiSchema.teiDocuments.pop()
    return doc
}

export function serializeText( content, teiDocument, teiSchema ) {
    const { inter } = teiSchema.elementGroups

    // make the TEIDocument visible to the serialize for access to sub docs
    teiSchema.teiDocuments.push(teiDocument)
    const domSerializer = DOMSerializer.fromSchema( teiSchema.schema )
    const domFragment = domSerializer.serializeFragment(content)
    removeNodes(domFragment, 'textNode')
    removeNodes(domFragment, 'globalNode')
    renameInterMarks(inter, domFragment)
    teiSchema.teiDocuments.pop()
    return domFragment
}

function parseInterNodes(textEl,teiSchema) {
    const { hard, soft, inter } = teiSchema.elementGroups
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
}

// Remove whitespace from children of xmlStripSpaceNames elements, 
// as per TEI Guidelines section 1.3.1.1.6 
function stripSpaces(textEl) {
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
            markEl.parentNode.replaceChild(interEl,markEl)
        }
    }
}

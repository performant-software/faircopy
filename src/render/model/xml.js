import { DOMSerializer, Fragment } from "prosemirror-model"

// These elements are processed in XSLT by the xsl:strip-space command. This list is from xml/tei/odd/stripspace.xsl.model, TEI v4.1.0
const xmlStripSpaceNames = "TEI abstract additional address adminInfo altGrp altIdentifier alternate analytic annotation annotationBlock app appInfo application arc argument att attDef attList availability back biblFull biblStruct bicond binding bindingDesc body broadcast cRefPattern calendar calendarDesc castGroup castList category certainty char charDecl charProp choice cit classDecl classSpec classes climate cond constraintSpec content correction correspAction correspContext correspDesc custodialHist dataRef dataSpec datatype decoDesc dimensions div div1 div2 div3 div4 div5 div6 div7 divGen docTitle eLeaf eTree editionStmt editorialDecl elementSpec encodingDesc entry epigraph epilogue equipment event exemplum fDecl fLib facsimile figure fileDesc floatingText forest front fs fsConstraints fsDecl fsdDecl fvLib gap gi glyph graph graphic group handDesc handNotes history hom hyphenation iNode if imprint incident index interpGrp interpretation join joinGrp keywords kinesic langKnowledge langUsage layoutDesc leaf lg linkGrp list listAnnotation listApp listBibl listChange listEvent listForest listNym listObject listOrg listPerson listPlace listPrefixDef listRef listRelation listTranspose listWit location locusGrp macroSpec media metDecl model modelGrp modelSequence moduleRef moduleSpec monogr msContents msDesc msFrag msIdentifier msItem msItemStruct msPart namespace node normalization notatedMusic notesStmt nym object objectDesc objectIdentifier org paramList paramSpec particDesc performance person personGrp persona physDesc place population postscript precision prefixDef profileDesc projectDesc prologue publicationStmt punctuation quotation rdgGrp recordHist recording recordingStmt refsDecl relatedItem relation remarks respStmt respons revisionDesc root row samplingDecl schemaRef schemaSpec scriptDesc scriptStmt seal sealDesc segmentation sequence seriesStmt set setting settingDesc sourceDesc sourceDoc sp spGrp space spanGrp specGrp specList standOff state stdVals styleDefDecl subst substJoin superEntry supportDesc surface surfaceGrp table tagsDecl taxonomy teiCorpus teiHeader terrain text textClass textDesc timeline titlePage titleStmt trait transcriptionDesc transpose tree triangle typeDesc unitDecl unitDef vAlt vColl vDefault vLabel vMerge vNot vRange valItem valList vocal".split(' ')

export function parseText(textEl, teiDocument, teiSchema, subDocName) {
    // make the TEIDocument visible to the node spec parser for access to sub docs
    teiSchema.teiDocuments.push(teiDocument)
    stripSpaces(textEl)
    parseInterNodes(textEl, teiSchema, teiDocument.xmlDom)
    const domParser = subDocName !== 'text' ? teiSchema.docNodeParsers[subDocName] : teiSchema.domParser
    const doc = domParser.parse(textEl)
    teiSchema.teiDocuments.pop()
    return doc
}

export function serializeText(doc, teiDocument, teiSchema) {
    const { resourceType, xmlDom } = teiDocument
    teiSchema.teiMode = true
    let textEl, domFragment
    if (resourceType === 'header') {
        domFragment = proseMirrorToDOM(doc.content, teiDocument, teiSchema, 'header')
        textEl = xmlDom.getElementsByTagName('teiHeader')[0]
    } else if (resourceType === 'text') {
        domFragment = proseMirrorToDOM(doc.content, teiDocument, teiSchema)
        textEl = xmlDom.getElementsByTagName('text')[0]
    } else if (resourceType === 'standOff') {
        domFragment = proseMirrorToDOM(doc.content, teiDocument, teiSchema)
        textEl = xmlDom.getElementsByTagName('standOff')[0]
    } else if (resourceType === 'sourceDoc') {
        domFragment = proseMirrorToDOM(doc.content, teiDocument, teiSchema)
        textEl = xmlDom.getElementsByTagName('sourceDoc')[0]
    }

    // take the body of the document from prosemirror and reunite it with 
    // the rest of the xml document, then serialize to string
    var div = document.createElement('div')
    div.appendChild(domFragment.cloneNode(true))
    textEl.innerHTML = htmlToXML(div.innerHTML, teiSchema.elements, teiSchema.attrs)
    const fileContents = new XMLSerializer().serializeToString(teiDocument.xmlDom);
    teiSchema.teiMode = false

    return fileContents
}

export function proseMirrorToDOM(content, teiDocument, teiSchema, subDocName) {
    const { inter } = teiSchema.elementGroups

    // make the TEIDocument visible to the serialize for access to sub docs
    teiSchema.teiDocuments.push(teiDocument)
    const schema = subDocName ? teiSchema.docNodeSchemas[subDocName] : teiSchema.schema
    const domSerializer = DOMSerializer.fromSchema(schema)
    const domFragment = domSerializer.serializeFragment(content)

    // remove all text node channels TODO: what is max i?
    for (let i = 0; i < 99; i++) {
        removeNodes(domFragment, `textNode${i}`)
        removeNodes(domFragment, `globalNode${i}`)
    }

    renameInterMarks(inter, domFragment, teiDocument.xmlDom)
    const annoUpdate = processAnnotations(domFragment, teiDocument.annotationData)
    if (Object.keys(annoUpdate).length > 0) {
        teiDocument.updateAnnotationData(annoUpdate)
    }
    teiSchema.teiDocuments.pop()
    return domFragment
}

export function getTextNodeName(content) {
    // find the text node in the content expression
    const matches = content.match(/textNode[0-9]+/)
    const textNodeName = matches && matches[0] ? matches[0] : null
    return textNodeName
}

export function findNoteNode(doc, noteID) {
    let noteNode, notePos
    doc.descendants((node, pos) => {
        if (node.attrs['__id__'] === noteID) {
            noteNode = node
            notePos = pos
        }
        if (noteNode) return false
    })
    return { noteNode, notePos }
}

export function synthNameToElementName(nodeName) {
    if (nodeName.includes('textNode') || nodeName.includes('globalNode') || nodeName.includes('__ANNOMARK__')) return null
    return nodeName.endsWith('X') ? nodeName.slice(0, -1) : nodeName.startsWith('mark') ? nodeName.slice('mark'.length) : nodeName
}

// Internodes are a set of elements that can be processed as either nodes or marks, depending on their
// location in the document structure. They have to be determined before parsing with ProseMirror.
function parseInterNodes(textEl, teiSchema, xmlDom) {
    const { elements, elementGroups } = teiSchema
    const { hard, soft, inter, asides } = elementGroups
    const nodes = [...hard, ...soft]
    const markPrefix = 'mark'

    // asides which can't have textNode direct children
    const hardAsides = asides.filter(aside => {
        return !elements[`${aside}X`].content.includes('textNode')
    })

    // Node names are uppercase, so these are uppercased. Also, need to test against
    // both aside node name and the 'X' variant used in sub documents
    const interMarkSet = [...hard.map(i => i.toUpperCase()), ...hardAsides.map(i => i.toUpperCase()), ...hardAsides.map(i => `${i.toUpperCase()}X`)]

    function isMark(markEl) {
        let parentNodeName = markEl.parentNode.nodeName.toUpperCase()

        // is its parent a node that precludes it from being a mark?
        if (interMarkSet.includes(parentNodeName)) return false

        // are there any node descendants of markEl?
        for (const node of nodes) {
            const nodeEls = markEl.querySelectorAll(node)
            if (nodeEls.length > 0) return false
        }

        return true
    }

    // pre-parse inter nodes, separating would be marks from nodes
    for (const xmlTag of inter) {
        const markEls = textEl.querySelectorAll(xmlTag)
        for (let i = 0; i < markEls.length; i++) {
            const markEl = markEls[i]
            // if this is a mark.. rename to interMark tag
            if (isMark(markEl)) {
                const elName = `${markPrefix}${xmlTag}`
                const interEl = xmlDom.createElement(elName)
                interEl.innerHTML = markEl.innerHTML
                cloneAttributes(interEl, markEl)
                markEl.parentNode.replaceChild(interEl, markEl)
            }
        }
    }
}

// Find the annotation marks (__ANNOMARK__) and update the annotation data
// and remove from the xml DOM
function processAnnotations(textEl, annotationData) {

    function getXPath(element) {
        let xpath = '';
        let currentElement = element;

        while (currentElement !== null && currentElement.localName) {
            let tagName = currentElement.localName;
            let index = 1;

            // Check for siblings with the same tag name
            for (let sibling = currentElement.previousSibling; sibling; sibling = sibling.previousSibling) {
                if (sibling.nodeType === 1 && sibling.localName === tagName) {
                    index++;
                }
            }

            // Add the tag name and index to the XPath
            xpath = `/${tagName}[${index}]` + xpath;
            currentElement = currentElement.parentNode;
        }

        return xpath;
    }

    function removeTags(str) {
        if ((str === null) || (str === ''))
            return '';
        else
            str = str.toString();

        // Regular expression to identify XML tags in
        // the input string. Replacing the identified
        // XML tag with a null string.
        return str.replace(/(<([^>]+)>)/ig, '');
    }

    // Get all the annoMarks in the doc
    let findMap = {}

    if (annotationData.length === 0) {
        return findMap
    }

    const annoMarks = textEl.querySelectorAll('__ANNOMARK__');
    for (let i = 0; i < annoMarks.length; i++) {
        const annoMark = annoMarks[i]

        const parentEl = annoMark.parentElement
        console.log('annoMark: ', annoMark)
        // Get the current path
        const xpath = getXPath(parentEl)
        console.log('XPath: ', xpath)

        // Convert to a path map
        let newPath = getNodeMap(`${xpath} ${xpath}`)
        console.log('New Paths: ', newPath)

        // Find the matching annotation
        const findMatch = annotationData.find(a => a.id === annoMark.getAttribute('id'))

        if (findMatch) {
            console.log(`Found Anno: ${JSON.stringify(findMatch, null, 2)}`)
            const parentText = parentEl.innerText

            if (!findMap[findMatch.id]) {
                findMap[findMatch.id] = {
                    id: findMap.id,
                    start: newPath.start,
                    end: [],
                    mark: annoMark,
                    markEnd: undefined
                }
            }

            // Update the end path
            findMap[findMatch.id].end = newPath.end
            findMap[findMatch.id].markEnd = annoMark

        } else {
            console.log('Matching annotation not found!!')
        }
    }

    console.log('Inner: ', textEl.innerHTML)

    // We now use the innerHTML string to find offsets and remove the annomarks
    let innerString = textEl.firstChild.innerHTML
    let curIndex = 0

    if (!innerString) {
        return
    }

    console.log('Inner: ', innerString)
    while (curIndex !== -1) {
        // Find the next anno mark
        curIndex = innerString.indexOf('<__annomark__', curIndex)
        if (curIndex > -1) {
            console.log('Anno Found!')
            // get the id of the anno
            const idLoc = innerString.indexOf('id="', curIndex)
            if (idLoc > -1) {
                // ID is a fixed size of 44, the +4 accounts for 'id="'
                const idAnno = innerString.substring(idLoc + 4, idLoc + 44)
                console.log('Anno ID: ', idAnno)

                // Find the tag that contains this tag
                // It should be the current index minus the index of the previous node
                // const annoOffsetTagStart = findPreviousStartTagIndex(innerString, curIndex)
                const annoOffsetTagStart = innerString.lastIndexOf(`<${findMap[idAnno].mark.parentElement.localName}`, curIndex)
                const annoOffsetStart = innerString.indexOf('>', annoOffsetTagStart)
                if (annoOffsetStart > -1) {
                    // Remove this tag, all annoMarks opening tags are 60 chatacters long
                    // <__annomark__ id = "uid-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
                    innerString = innerString.slice(0, curIndex) + innerString.slice(curIndex + 60)

                    // We may have already have the beginning of this one
                    if (!findMap[idAnno].startOffset) {
                        // Remove any tags, the +1 accounts for the '>'
                        const offset = removeTags(innerString.slice(annoOffsetStart + 1, curIndex)).length
                        findMap[idAnno].startOffset = offset
                    }

                    // We now have to find the end of the annotation
                    // This will work for annotations within annotations since 
                    // this is accomplished with multiple tag blocks,
                    const annoEndIndex = innerString.indexOf('</__annomark__>')
                    const annoOffsetTagStart = innerString.lastIndexOf(`<${findMap[idAnno].markEnd.parentElement.localName}`, annoEndIndex)
                    const annoOffsetEnd = innerString.indexOf('>', annoOffsetTagStart)

                    // The + 1 accounts for the '>'
                    // Remove any tags
                    const offset = removeTags(innerString.slice(annoOffsetEnd + 1, annoEndIndex)).length
                    findMap[idAnno].endOffset = offset

                    // Remove the end tag, all annoMarks closing tags are 15 characters log
                    innerString = innerString.slice(0, annoEndIndex) + innerString.slice(annoEndIndex + 15)
                }

            }
        }
    }

    console.log('Old Data: ', JSON.stringify(annotationData, null, 2))
    console.log('New Data: ', JSON.stringify(findMap, null, 2))

    textEl.firstChild.innerHTML = innerString

    return findMap
}

// Remove whitespace from children of xmlStripSpaceNames elements, 
// as per TEI Guidelines section 1.3.1.1.6 
function stripSpaces(textEl) {
    for (const xmlStripSpaceName of xmlStripSpaceNames) {
        const stripEls = textEl.querySelectorAll(xmlStripSpaceName)
        for (let i = 0; i < stripEls.length; i++) {
            const stripEl = stripEls[i]
            for (let j = 0; j < stripEl.childNodes.length; j++) {
                const child = stripEl.childNodes[j]
                if (child.nodeName === '#text') {
                    stripEl.removeChild(child)
                }
            }
        }
    }
}

// remove temporary nodes from the DOM and replace each with its children
function removeNodes(documentFragment, nodeName) {
    const nodes = documentFragment.querySelectorAll(nodeName)
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        const items = []
        for (let j = 0; j < node.childNodes.length; j++) {
            items.push(node.childNodes.item(j))
        }
        node.before(...items)
        node.remove()
    }
}

// convert all intermarks back to their XML node names
function renameInterMarks(inter, documentFragment, xmlDom) {
    for (const interMark of inter) {
        const interMarkName = `mark${interMark}`
        const markEls = documentFragment.querySelectorAll(interMarkName)
        for (let i = 0; i < markEls.length; i++) {
            const markEl = markEls[i]
            const interEl = xmlDom.createElement(interMark)
            interEl.innerHTML = markEl.innerHTML
            cloneAttributes(interEl, markEl)
            markEl.parentNode.replaceChild(interEl, markEl)
        }
    }
}

// Apply various transformations to move from HTML -> XML
export function htmlToXML(html, elements, attrs) {
    // This entitiy is not valid XML
    const nextHTML = html.replaceAll('&nbsp;', ' ')
    // this has to be done here because HTML is case insenitive, while XML is not.
    return renameCamelCase(nextHTML, elements, attrs)
}

export function addTextNodes(state, dispatch = null) {
    const { tr, schema, doc } = state

    // if an element could have a textnode, but is instead empty, add a textnode to it
    doc.descendants((node, pos) => {
        const contentExp = node.type.spec.content
        if (node.childCount === 0 && contentExp && contentExp.includes('textNode')) {
            const textNodeName = getTextNodeName(contentExp)
            const textNodeType = schema.nodes[textNodeName]
            const insertPos = tr.mapping.map(pos + 1)
            tr.setMeta('addToHistory', false)
            tr.insert(insertPos, textNodeType.create())
        }
        return true
    })

    if (dispatch) {
        dispatch(tr)
    } else {
        const { state: nextState } = state.applyTransaction(tr)
        return nextState.doc
    }
}

export function getNodeMap(path) {
    const arr = path.split(' ')
    const start = arr[0]
    const end = arr[1]
    const ret = { start: [], end: [] }

    for (let i = 0; i < 2; i++) {
        let str, input;
        if (i === 0) {
            str = start;
            input = ret.start;
        } else {
            str = end;
            input = ret.end;
        }

        // Always assume that first character is /
        let index = 1
        let next = str.substring(index).indexOf('/')
        while (next !== -1) {
            if (str.substring(index, index + 1) === '/') {
                index += 1
            }

            next = str.substring(index).indexOf('/')
            if (next === -1) {
                const parse = str.substring(index).split('[');
                const id = parse[1].split(']')
                const offset = id[1].split("::")
                input.push({ node: parse[0], id: id[0], offset: offset[1] })
            } else {
                const parse = str.substring(index, index + next).split('[');
                const id = parse[1].split(']')
                input.push({ node: parse[0], id: id[0] })
            }

            index = index + next + 1;
        }
    }

    return ret;
}

export function addAnnotations(state, annotationData = [], dispatch = null) {

    const { doc, tr } = state

    function findMarkPositionInDescendant(markType, parent) {
        let markPos = { start: -1, end: -1 };
        parent.descendants((node, pos) => {
            // stop recursing if result is found
            if (markPos.start > -1) {
                return false;
            }
            if (markPos.start === -1 && node.marks.find(m => m.type.name === markType)) {
                // expect to see something like `markhi('my text')`
                console.log(node.toString())
                markPos = {
                    start: pos,
                    end: pos + Math.max(node.textContent.length, 1),
                };
            }
        });

        return markPos;
    }

    function findNode(startNode, path, index, findCount) {
        const idCount = parseInt(path[index].id) === NaN ? -1 : parseInt(path[index].id);
        const idMatch = idCount < 0 ? path[index].id : ''

        for (let i = 0; i < startNode.childCount; i++) {
            const node = startNode.child(i);
            if (node.type.name === path[index].node) {
                if ((idCount < 0 && node.attrs['@xml:id'] === idMatch) || (idCount > -1 && findCount === idCount)) {
                    index++
                    if (index < path.length) {
                        return findNode(node, path, index, 1)
                    } else {
                        let textStartPos = 0;
                        node.descendants(function (n, pos) {
                            //console.log('Descendant Pos: ', pos, ', Node: ', n.type.name)
                            if (n.type.name === 'text') {
                                // We only want the starting text node
                                // This may have multiple nodes broken up by marks
                                // Since this node matched the path, we want the offset to
                                // begin from the begining of the fragments
                                textStartPos = (textStartPos === 0 ? pos : textStartPos)
                                //console.log('textStartPos: ', textStartPos)
                                return false
                            }
                        })
                        // the + 1 is to account for this node's token
                        return { node, offset: textStartPos + 1 }
                    }
                }

                findCount++
            }
        }

        // If you made it here, it did not find the node name...Maybe a mark instead?
        // Looking at the startNode, see if it has 'mark${name} in its descendants'
        const markPos = findMarkPositionInDescendant(`mark${path[index].node}`, startNode)
        if (markPos.start > -1) {
            //console.log('Child mark found: ', markPos)
            index++
            if (index < path.length) {
                return findNode(startNode, path, index, 1)
            } else {
                // The +1 accounts for the mark token
                return { node: startNode, offset: markPos.start + 1 }
            }
        }
    }

    annotationData.forEach(d => {
        const paths = getNodeMap(d.path)

        // We want to start at the children of text node as that
        // should always be present and should be the first nodes in the document
        const startIndex = paths.start.findIndex(p => p.node === 'text') + 1;
        const endIndex = paths.end.findIndex(p => p.node === 'text') + 1;
        const startNode = findNode(doc, paths.start, startIndex, 1, 0);
        const endNode = findNode(doc, paths.end, endIndex, 1, 0)

        if (startNode && endNode) {
            let startPosition = 0
            doc.descendants((node, pos) => {
                if (node === startNode.node) {
                    startPosition = pos;
                }
            })

            //console.log('Alt Start Position: ', startPosition)

            let endPosition = 0
            doc.descendants((node, pos) => {
                if (node === endNode.node) {
                    endPosition = pos;
                }
            })

            //console.log('Alt End Position: ', endPosition)

            const markStart = startPosition + startNode.offset + parseInt(paths.start[paths.start.length - 1].offset)
            const markEnd = endPosition + endNode.offset + parseInt(paths.end[paths.end.length - 1].offset)

            //console.log('markStart: ', markStart, ', markEnd: ', markEnd)
            console.log('Text Annotated: ', doc.textBetween(markStart, markEnd))

            let mark = doc.type.schema.marks['__ANNOMARK__'].create({ id: d.id })
            tr.addMark(markStart, markEnd, mark)
        }
    })

    if (dispatch) {
        dispatch(tr)
    }
}

// take content fragment and replace any text nodes in there with text node type
export function replaceTextNodes(textNodeType, fragment) {
    let siblings = []
    for (let i = 0; i < fragment.childCount; i++) {
        const sibling = fragment.child(i)
        if (sibling.type.name.includes('textNode') && sibling.type.name !== textNodeType.name) {
            const textNodeContent = sibling.content
            for (let i = 0; i < textNodeContent.childCount; i++) {
                const node = textNodeContent.child(i)
                for (const mark of node.marks) {
                    if (!textNodeType.allowsMarkType(mark.type)) {
                        // if any marks are not allowed for this textNode
                        return null
                    }
                }
            }
            const nextSib = textNodeType.create(sibling.attr, sibling.content)
            siblings.push(nextSib)
        } else {
            siblings.push(sibling)
        }
    }

    // return new content fragment 
    return Fragment.from(siblings)
}

// Repair camel cased attrs that React munged
function renameCamelCase(html, elements, attrs) {
    let htmlBuffer = html
    for (const attr of Object.values(attrs)) {
        if (attr.ident) {
            htmlBuffer = renameAttrs(htmlBuffer, attr.ident.toLowerCase(), attr.ident)
        }
    }
    for (const el of Object.values(elements)) {
        if (el.name) {
            htmlBuffer = renameEls(htmlBuffer, el.name.toLowerCase(), el.name)
        }
    }
    return htmlBuffer
}

function renameAttrs(htmlFragment, oldAttrName, newAttrName) {
    const regex = new RegExp(`${oldAttrName}=`, 'g')
    return htmlFragment.replace(regex, `${newAttrName}=`)
}

function renameEls(htmlFragment, oldElName, newElName) {
    // capture any attributes 
    const regexOpen = new RegExp(`<${oldElName}(\\s+[^>]*)*>`, 'g')
    const regexClose = new RegExp(`</${oldElName}>`, 'g')
    return htmlFragment.replace(regexOpen, (match, attrs) => `<${newElName}${attrs ? attrs : ''}>`).replace(regexClose, `</${newElName}>`)
}

// copy all the attributes from one element to another
function cloneAttributes(target, source) {
    [...source.attributes].forEach(attr => { target.setAttribute(attr.nodeName, attr.nodeValue) })
}
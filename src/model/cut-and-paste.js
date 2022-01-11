import {DOMSerializer, Fragment, Slice} from "prosemirror-model"
import TEISchema from "./TEISchema"

const fairCopy = window.fairCopy

// Note about Cut and Paste:
// When the users focus is on the EditorGutter, the cut and paste handlers defined here (cutSelectedNode) are operative.
// When ProseMirror has focus, the ProseMirror editor view callbacks defined below are operative.

export function transformPastedHTMLHandler( teiSchema, teiDocument ) {
    return (html) => {
        // Meta element generated by ProseMirror isn't closed, remove it 
        // so we can parse as XML. Put it back at the end.
        const metaRegex = /(<meta [^>]*>)/
        const matches = html.match(metaRegex)
        const parser = new DOMParser();
        let metaTag = matches && matches[1] ? matches[1]: ""
        // also, replace all the non breaking spaces w/spaces, since &nbsp; isn't in schema
        let xml = html.replace(metaRegex,"").replaceAll('&nbsp;',' ')
        // detect if this is an internal cut and paste
        if( xml.includes('data-pm-slice') ) {
            // xml might be an array of elements, need to wrap them to form a valid document
            const xmlDom = parser.parseFromString(`<xml>${xml}</xml>`,'text/xml');
    
            // HTML doesn't have self closing elements, so preserve them here with this hack
            const inlines = teiSchema.elementGroups.inlines
            for( const inline of inlines ) {
                let inlineEls = xmlDom.getElementsByTagName(inline)
                for( let i=0; i < inlineEls.length; i++ ) {
                    const inlineEl = inlineEls[i]
                    // blank is necessary so that serializer doesn't collapse element
                    inlineEl.innerHTML = ' '
                }    
            }
    
            // schema needs access to this document while running parseSlice()
            // pops off in transformPastedHandler()
            teiSchema.teiDocuments.push(teiDocument)

            // also set a flag to show the type of copy operation
            const topLevelNode = xmlDom.firstChild.firstChild
            if( topLevelNode.getAttribute('data-fc-node') === 'true' ) {
                topLevelNode.removeAttribute('data-fc-node')
                teiSchema.nodeCopyFlag = true
            }

            let xhtml = new XMLSerializer().serializeToString(xmlDom);
            xhtml = xhtml.replace('<xml>','').replace('</xml>','')
            const nextHTML = `${metaTag}${xhtml}`
            return nextHTML
        } else {
            // this is from an external source, drop markup
            const xmlDom = parser.parseFromString(xml,'text/html');
            const nextHTML = `<html><head>${metaTag}</head><body>${xmlDom.documentElement.textContent}</body></html>`
            return nextHTML
        }
    }
}

export function transformPastedHandler(teiSchema) {
    return (slice) => {
        // done parsing, disassociate this teidocument from schema parser
        teiSchema.teiDocuments.pop()

        // perform transforms based on type of operation
        let nextSlice
        if( teiSchema.nodeCopyFlag ) {   
            nextSlice = slice         
            teiSchema.nodeCopyFlag = false
        } else {
            nextSlice = transformInlineCopy(slice)
        }
        return nextSlice
    }
}

export function createClipboardSerializer(teiSchema,teiDocument) {
    // clipboard serialize always serializes to TEI XML
    const clipboardSchema = new TEISchema(teiSchema.schemaJSON);

    // the clipboard schema is always associated with this one document and
    // is always in teiMode
    clipboardSchema.teiMode = true
    clipboardSchema.teiDocuments.push(teiDocument)
    return DOMSerializer.fromSchema( clipboardSchema.schema )    
}

export function cutSelectedNode(teiDocument) {
    copyNode(teiDocument,true)
}

export function copySelectedNode(teiDocument) {
    copyNode(teiDocument)
}

// This function is from https://github.com/ProseMirror/prosemirror-view/blob/master/src/clipboard.js
// slightly modified for this context.
function serializeForClipboard(view, slice) {
    let context = [], {content, openStart, openEnd} = slice
    while (openStart > 1 && openEnd > 1 && content.childCount === 1 && content.firstChild.childCount === 1) {
      openStart--
      openEnd--
      let node = content.firstChild
      context.push(node.type.name, node.attrs !== node.type.defaultAttrs ? node.attrs : null)
      content = node.content
    }
  
    let serializer = view.someProp("clipboardSerializer") || DOMSerializer.fromSchema(view.state.schema)
    let doc = document, wrap = doc.createElement("div")
    wrap.appendChild(serializer.serializeFragment(content, {document: doc}))
  
    let firstChild = wrap.firstChild

    if (firstChild && firstChild.nodeType === 1) {
        firstChild.setAttribute("data-pm-slice", `${openStart} ${openEnd} ${JSON.stringify(context)}`)
        firstChild.setAttribute('data-fc-node','true')
    }
  
    let text = view.someProp("clipboardTextSerializer", f => f(slice)) ||
        slice.content.textBetween(0, slice.content.size, "\n\n")
  
    return {dom: wrap, text}
}

function copyNode(teiDocument,cut=false) {
    const editorView = teiDocument.getActiveView()
    const { doc } = editorView.state
    const {inlines} = teiDocument.fairCopyProject.teiSchema.elementGroups
    const { currentTreeNode } = teiDocument
    const { editorGutterPos } = currentTreeNode

    if( editorGutterPos !== null ) {
        const $pos = doc.resolve(editorGutterPos)
        const node = $pos.node().child($pos.index())
        
        if( node && !inlines.includes(node.type.name)  ) {
            const start = editorGutterPos
            const end = start + node.nodeSize
            const slice = doc.slice(start,end)
            const clips = serializeForClipboard(editorView,slice)
            fairCopy.services.copyToClipBoardHTML(clips.dom.innerHTML)
            if( cut ) {
                const {tr} = editorView.state
                tr.delete(start,end)
                currentTreeNode.editorGutterPos = null
                currentTreeNode.editorGutterPath = null
                editorView.dispatch(tr)    
            }
        }    
    }
}

// Handle paste events when the node is selected via the EditorGutter
export function pasteSelectedNode(teiDocument) {
    const html = fairCopy.services.readClipBoardHTML()    
    if( html ) {
        const editorView = teiDocument.getActiveView()
        const {inlines} = teiDocument.fairCopyProject.teiSchema.elementGroups
        const selection = (editorView) ? editorView.state.selection : null  
        if( selection && selection.node && !inlines.includes(selection.node.type.name)  ) {
            // make the paste happen in the editor view
            editorView.focus()
            fairCopy.services.ipcSend('requestPaste')
        }
    }
}

function transformInlineCopy(slice) {
    
    // remove structure nodes and concat inlines
    const fragment = slice.content
    const {schema} = fragment.firstChild.type
    const inlineNodes = []

    for( let i=0; i < fragment.childCount; i++ ) {
        const child = fragment.child(i)
        child.descendants( (node) => {
            // if this is text node or global node, add it to the list
            const nodeName = node.type.name
            if( nodeName.includes('textNode') || nodeName.includes('globalNode') ) {
                for( let j=0; j < node.childCount; j++ ) {
                    const inlineNode = node.child(j) 
                    inlineNodes.push(inlineNode)
                    const spaceNode = schema.text(' ')
                    inlineNodes.push(spaceNode)                    
                }
            }
            return true
        })
    }

    // if we didn't find any textnodes or globalnodes nodes, this could be from an external source, 
    // bring over just the text content
    if( inlineNodes.length === 0 ) {
        for( let i=0; i < fragment.childCount; i++ ) {
            const child = fragment.child(i)
            const txtNode = schema.text(child.textContent)
            inlineNodes.push(txtNode)
        }
    }

    return new Slice( Fragment.from(inlineNodes), 0, 0 )
}
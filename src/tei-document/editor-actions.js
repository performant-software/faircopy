import { NodeRange, Fragment } from 'prosemirror-model'
import { addMark, insertNodeAt } from "./commands"

export function createElement( elementID, teiDocument ) {
    const { fairCopyProject } = teiDocument
    const editorView = teiDocument.getActiveView()
    const {schema} = fairCopyProject.teiSchema

    switch( elementID ) {
        case 'pb': 
            return createPb( editorView )
        case 'note': 
            return createNote( teiDocument, editorView )
        default: 
            const markType = schema.marks[elementID]
            return createMark( markType, editorView )
    }                
}

// changes the NodeType for a node element at a given pos
export function replaceElement( elementID, teiDocument, pos ) {
    const editorView = teiDocument.getActiveView()
    const { tr, doc } = editorView.state
    const nodeType = teiDocument.fairCopyProject.teiSchema.schema.nodes[elementID]
    const node = doc.nodeAt(pos)

    // change this node to target nodeType
    if( nodeType.validContent(node.content) ) {
        try {
            tr.setNodeMarkup(pos, nodeType)
            editorView.dispatch(tr)        
        } catch(err) {
            return err.message
        }
    }
    return null 
}

export function addInside( elementID, teiDocument, pos ) {
    const editorView = teiDocument.getActiveView()
    const { tr, doc } = editorView.state

    const parentNode = doc.nodeAt(pos)
    const nodeType = teiDocument.fairCopyProject.teiSchema.schema.nodes[elementID]
    const fragment = parentNode.content

    // if this is a valid action
    if( parentNode.type.validContent(nodeType) && 
        nodeType.validContent(fragment) ) {
        try {
            const $start = doc.resolve(pos+1)
            const $end = doc.resolve(pos+1+fragment.size)
            const nodeRange = new NodeRange($start,$end,$start.depth)
        
            // take the content of the parent and put it inside the new node
            editorView.dispatch(tr
                .wrap(nodeRange, [{type: nodeType}])
                .scrollIntoView()
            )
            editorView.focus()            
        } catch(err) {
            return err.message
        }
    }
    return null 
}
    
export function addOutside( elementID, teiDocument, pos ) {
    const editorView = teiDocument.getActiveView()
    const { doc, tr } = editorView.state

    const $pos = doc.resolve(pos)
    const targetNode = doc.nodeAt(pos)
    const nodeType = teiDocument.fairCopyProject.teiSchema.schema.nodes[elementID]

    // if this is a valid action
    if( nodeType.validContent(Fragment.from(targetNode)) ) {
        try {
            const $start = doc.resolve($pos.start($pos.depth+1))
            const $end = doc.resolve($start.end($start.depth)+1)
            const nodeRange = new NodeRange($start,$end,$pos.depth)
            tr.wrap(nodeRange,[{type: nodeType}])
            tr.scrollIntoView()
            editorView.dispatch(tr)
            editorView.focus()        
        } catch(err) {
            return err.message
        }
    }
    return null 
}

export function addAbove( elementID, teiDocument, pos ) {
    const editorView = teiDocument.getActiveView()
    const { schema } = teiDocument.fairCopyProject.teiSchema
    const { doc } = editorView.state

    const nodeType = schema.nodes[elementID]
    const $targetPos = doc.resolve(pos)
    const parentNode = $targetPos.parent

    if( parentNode.type.validContent(nodeType) ) {
        return insertNodeAt(nodeType, pos, editorView, schema )
    } else {
        return "Cannot place here"
    }
}

export function addBelow( elementID, teiDocument, pos ) {
    const editorView = teiDocument.getActiveView()
    const { schema } = teiDocument.fairCopyProject.teiSchema
    const { doc } = editorView.state

    const nodeType = schema.nodes[elementID]
    const $targetPos = doc.resolve(pos)
    const parentNode = $targetPos.parent

    if( parentNode.type.validContent(nodeType) ) {
        const targetNode = doc.nodeAt(pos)
        const insertPos = pos + targetNode.nodeSize
        return insertNodeAt(nodeType, insertPos, editorView, schema )
    } else {
        return "Cannot place here"
    }
}

export function onClippy() {
    // const html = fairCopy.services.readClipBoardHTML()
    // console.log( `clippy: ${html}`) 
}

export function eraseSelection(teiDocument) {
    const editorView = teiDocument.getActiveView()
    const { tr, selection } = editorView.state

    let {empty, $cursor, ranges} = selection
    if (empty || $cursor) return
    for (let i = 0; i < ranges.length; i++) {
        let {$from, $to} = ranges[i]
        tr.removeMark($from.pos, $to.pos)
    }
    editorView.dispatch(tr)
    editorView.focus()
}

function createMark(markType, editorView) {
    const cmd = addMark( markType )
    cmd( editorView.state, editorView.dispatch ) 
    editorView.focus()
}

function createPb( editorView ) {
    const { state } = editorView
    const { tr, selection } = state
    const { $anchor } = selection
    const pbNode = state.schema.node('pb')
    tr.insert($anchor.pos, pbNode) 
    editorView.dispatch(tr)
    editorView.focus()
}

function createNote( teiDocument, editorView ) {
    const { state } = editorView
    const { tr, selection } = state
    const { $anchor } = selection

    const subDocID = teiDocument.createSubDocument(document)
    const noteNode = state.schema.node('note', { id: '', __id__: subDocID })
    tr.insert($anchor.pos, noteNode) 
    editorView.dispatch(tr)
}
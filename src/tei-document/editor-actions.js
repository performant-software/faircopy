import { NodeRange, Fragment } from 'prosemirror-model'
import { wrapIn } from 'prosemirror-commands'
import { addMark } from "./commands"

export function createElement( elementID, teiDocument ) {
    const { fairCopyProject } = teiDocument
    const editorView = teiDocument.getActiveView()
    const {schema} = fairCopyProject.teiSchema

    switch( elementID ) {
        case 'div': 
            return createDiv( schema.nodes['div'], editorView )
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

    // first, see if we can just change this node to target nodeType
    if( nodeType.validContent(node.content) ) {
        try {
            tr.setNodeMarkup(pos, nodeType)
            editorView.dispatch(tr)        
        } catch(err) {
            return err.message
        }
    } else {
        // if not, can nodeType wrap the node? 
        const fragment = Fragment.from(node)
        if( nodeType.validContent(fragment) ) {
            try {
                const $start = doc.resolve(pos)
                const $end = doc.resolve(pos+node.nodeSize)
                const nodeRange = new NodeRange($start,$end,$start.depth)
                tr.wrap(nodeRange, [{type: nodeType}])
                editorView.dispatch(tr)
                editorView.focus()            
            } catch(err) {
                return err.message
            }
        } else {
            return "can't replace"
        }
    }
    return null
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

function createDiv( divNodeType, editorView ) {
    const cmd = wrapIn(divNodeType)
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
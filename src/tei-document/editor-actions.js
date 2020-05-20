import { wrapIn } from 'prosemirror-commands'
import { addMark } from "./commands"

export function createElement( elementID, teiDocument ) {
    const { editorView } = teiDocument
    const { schema } = teiDocument.teiSchema

    switch( elementID ) {
        case 'div': 
            return createDiv( schema.nodes['div'], editorView )
        case 'sp': 
            return createSp( schema.nodes['sp'], editorView )
        case 'pb': 
            return createPb( editorView )
        case 'note': 
            return createNote( teiDocument, editorView )
        default: 
            const markType = schema.marks[elementID]
            return createMark( markType, editorView )
    }                
}

export function onClippy() {
    // const html = fairCopy.services.readClipBoardHTML()
    // console.log( `clippy: ${html}`) 
}


export function eraseSelection(teiDocument) {
    const { editorView } = teiDocument
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

function createSp( spNodeType, editorView ) {
    const cmd = wrapIn(spNodeType)
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
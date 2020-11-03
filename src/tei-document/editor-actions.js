import { NodeRange, Fragment } from 'prosemirror-model'
import { addMark, insertNodeAt } from "./commands"

export function createElement( elementID, teiDocument ) {
    const { fairCopyProject } = teiDocument
    const editorView = teiDocument.getActiveView()
    const {schema} = fairCopyProject.teiSchema
    const {pmType} = fairCopyProject.teiSchema.elements[elementID]
    const { inter } = fairCopyProject.teiSchema.elementGroups

    if( pmType === 'inline-node' ) {
        if( elementID === 'note' ) {
            return createNote( teiDocument, editorView )
        } else {
            const inlineType = schema.nodes[elementID]
            return createInline( inlineType, editorView )
        }    
    } else if( pmType === 'mark' ) {
        const markType = schema.marks[elementID]
        return createMark( markType, editorView )
    } else {
        if( inter.includes(elementID) ) {
            createInterNode( elementID, teiDocument )
        } else {
            const nodeType = schema.nodes[elementID]
            return createNode( nodeType, editorView )
        }
    }
}

export function determineRules( elementID, teiDocument ) {
    const teiSchema = teiDocument.fairCopyProject.teiSchema
    const {elements,schema} = teiSchema
    const targetType = schema.nodes[elementID]

    const mayContainIDs = []
    for( const element of Object.values(elements) ) {
        const { name, pmType } = element
        if( pmType === 'node' ) {
            const testNode = schema.nodes[name].create() 
            if( targetType.validContent(Fragment.from(testNode)) ) {
                mayContainIDs.push(name)
            }
        }
    }
    const mayContain = mayContainIDs.join(', ')

    const containedByIDs = []
    const testFragment = Fragment.from(targetType.create())
    for( const element of Object.values(elements) ) {
        const { name, pmType } = element
        if( pmType === 'node' ) {
            const parentType = schema.nodes[name]
            if( parentType.validContent(testFragment) ) {
                containedByIDs.push(name)
            }
        }
    }
    const containedBy = containedByIDs.join(', ')

    return {
        containedBy,
        mayContain,
        notes: null    
    }
}

export function validAction( actionType, elementID, teiDocument, selection ) {
    const { fairCopyProject } = teiDocument
    const { inter } = fairCopyProject.teiSchema.elementGroups
    const {pmType} = fairCopyProject.teiSchema.elements[elementID]

    if( actionType === 'info' || pmType === 'mark' ) return true

    if( inter.includes(elementID) ) {
        return true // TODO validate inters 
    } else {
        if( pmType === 'node' ) {
            if( selection.node ) {
                return validNodeAction( actionType, elementID, teiDocument, selection.anchor )
            } else {
                const { $from } = selection
                const pos = $from.before(-1)
                return validNodeAction('addInside', elementID, teiDocument, pos )    
            }
        } else {
            // inline-nodes
            if( pmType === 'inline-node' && selection.$cursor ) return true
        }
    }
    return false
}

function validNodeAction( actionType, elementID, teiDocument, pos ) {
    const editorView = teiDocument.getActiveView()
    const { doc } = editorView.state
    const nodeType = teiDocument.fairCopyProject.teiSchema.schema.nodes[elementID]
    const node = doc.nodeAt(pos)
    const $targetPos = doc.resolve(pos)
    const parentNode = $targetPos.parent
    const nodeIndex = $targetPos.index()
    const testNode = nodeType.create() 

    // create a fragment that places the created node in position with its future siblings
    let testFragment
    if( actionType === 'addAbove' || actionType === 'addBelow' ) {
        const { content } = parentNode
        let siblings = []
        for( let i=0; i < content.childCount; i++ ) { siblings.push( content.child(i) ) }
        let before, after
        if( actionType === 'addAbove' ) {
            before = siblings.slice(0,nodeIndex)
            after = siblings.slice(nodeIndex)
        } else {
            before = siblings.slice(0,nodeIndex+1)
            after = siblings.slice(nodeIndex+1)
        }   
        siblings = before.concat([testNode]).concat(after)
        testFragment = Fragment.from(siblings)  
    } else if( actionType === 'replace' || actionType === 'addOutside' ) {
        testFragment = parentNode.content.replaceChild(nodeIndex, testNode)
    } else {
        // addInside
        testFragment = Fragment.from(testNode)
    }

    switch(actionType) {
        case 'replace':
            return nodeType.validContent(node.content) && parentNode.type.validContent(testFragment)
        case 'addInside':
            return nodeType.validContent(node.content) && node.type.validContent(testFragment) 
        case 'addOutside':
            return nodeType.validContent(Fragment.from(node)) && parentNode.type.validContent(testFragment)
        case 'addAbove':
        case 'addBelow':
            return parentNode.type.validContent(testFragment)
        default:
            throw new Error('Unrecognized action type.')
    }
}

// changes the NodeType for a node element at a given pos
export function replaceElement( elementID, teiDocument, pos ) {
    const editorView = teiDocument.getActiveView()
    const { doc, tr } = editorView.state
    const nodeType = teiDocument.fairCopyProject.teiSchema.schema.nodes[elementID]
    const node = doc.nodeAt(pos)

    tr.setNodeMarkup(pos, nodeType, node.attrs)
    editorView.dispatch(tr)        
}

export function createInterNode( elementID, teiDocument ) {
    const { fairCopyProject } = teiDocument
    const editorView = teiDocument.getActiveView()
    const {schema} = fairCopyProject.teiSchema

    // TODO determine if this should create a node or a mark
    const markType = schema.marks[`mark${elementID}`]
    return createMark( markType, editorView )
}

export function createNode( nodeType, editorView ) {
    const { tr, selection } = editorView.state
    const { $from, $to } = selection

    tr.split($to.pos)
    tr.split($from.pos)
    const pos = tr.mapping.map($from.pos)-1
    const textNode = tr.doc.nodeAt(pos)
    const fragment = textNode.content
    const $start = tr.doc.resolve(pos)
    const $end = tr.doc.resolve(pos+1+fragment.size)
    const nodeRange = new NodeRange($start,$end,$start.depth)
    tr.wrap(nodeRange,[{type: nodeType}])
    editorView.dispatch(tr)
    editorView.focus()      
}

export function addInside( elementID, teiDocument, pos ) {
    const editorView = teiDocument.getActiveView()
    const { tr, doc } = editorView.state

    const parentNode = doc.nodeAt(pos)
    const nodeType = teiDocument.fairCopyProject.teiSchema.schema.nodes[elementID]
    const fragment = parentNode.content

    const $start = doc.resolve(pos+1)
    const $end = doc.resolve(pos+1+fragment.size)
    const nodeRange = new NodeRange($start,$end,$start.depth)

    // take the content of the parent and put it inside the new node
    editorView.dispatch(tr
        .wrap(nodeRange, [{type: nodeType}])
        .scrollIntoView()
    )
    editorView.focus()            
}
    
export function addOutside( elementID, teiDocument, pos ) {
    const editorView = teiDocument.getActiveView()
    const { doc, tr } = editorView.state

    const $pos = doc.resolve(pos)
    const nodeType = teiDocument.fairCopyProject.teiSchema.schema.nodes[elementID]

    const $start = doc.resolve($pos.start($pos.depth+1))
    const $end = doc.resolve($start.end($start.depth)+1)
    const nodeRange = new NodeRange($start,$end,$pos.depth)
    tr.wrap(nodeRange,[{type: nodeType}])
    tr.scrollIntoView()
    editorView.dispatch(tr)
    editorView.focus()        
}

export function addAbove( elementID, teiDocument, pos ) {
    const editorView = teiDocument.getActiveView()
    const { schema } = teiDocument.fairCopyProject.teiSchema

    const nodeType = schema.nodes[elementID]
    insertNodeAt(nodeType, pos, editorView, schema )
}

export function addBelow( elementID, teiDocument, pos ) {
    const editorView = teiDocument.getActiveView()
    const { schema } = teiDocument.fairCopyProject.teiSchema
    const { doc } = editorView.state

    const nodeType = schema.nodes[elementID]
    const targetNode = doc.nodeAt(pos)
    const insertPos = pos + targetNode.nodeSize
    insertNodeAt(nodeType, insertPos, editorView, schema )
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

function createInline( nodeType, editorView ) {
    const { state } = editorView
    const { tr, selection } = state
    const { $anchor } = selection
    const node = nodeType.create()
    tr.insert($anchor.pos, node) 
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
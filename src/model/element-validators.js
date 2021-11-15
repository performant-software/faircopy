import { Fragment } from "prosemirror-model"
import { getTextNodeName, replaceTextNodes } from './xml'
import { markApplies } from "./commands"

export function createValidationSet(elements, schema) {
    const validationSet = {}

    for( const element of Object.values(elements) ) {
        if( inValidationSet(element) ) {
            const { name } = element
            validationSet[name] = Fragment.from( createValidNode( name, {}, Fragment.empty, schema, elements ) )
        }
    }

    return validationSet
}

function inValidationSet(element) {
    const { fcType, pmType, synth } = element
    return !synth && fcType !== 'docNodes' && pmType !== 'mark'
}

export function validAction( elementID, teiDocument ) {
    const { fairCopyProject } = teiDocument
    const { pmType } = fairCopyProject.teiSchema.elements[elementID]
    const { inter } = fairCopyProject.teiSchema.elementGroups

    if( pmType === 'mark' ) {
        return validRangeAction(elementID, teiDocument)
    } else if( inter.includes(elementID) ) {
        return validRangeAction(`mark${elementID}`, teiDocument)
    } else {
        return validInlineAction(elementID, teiDocument)
    }
}

function validRangeAction(elementID, teiDocument) {
    const editorView = teiDocument.getActiveView()
    const { doc, schema, selection } = editorView.state
    const markType = schema.marks[elementID]

    let {empty, $cursor, ranges} = selection
    if ((empty && !$cursor) || !markApplies(doc, ranges, markType)) {
        return false
    } else {
        return true
    }
}

export function validNodeAction( actionType, elementID, teiDocument, pos ) {
    const editorView = teiDocument.getActiveView()
    const { doc, schema } = editorView.state
    const { elements } = teiDocument.fairCopyProject.teiSchema
    const node = doc.nodeAt(pos)
    const $targetPos = doc.resolve(pos)
    const parentNode = $targetPos.parent
    const nodeIndex = $targetPos.index()
    const isAtom = elements[elementID].pmType === 'inline-node'

    // create a fragment that places the created node in position with its future siblings
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
        const testNode = createValidNode( elementID, {}, Fragment.empty, schema, elements )
        siblings = before.concat([testNode]).concat(after)
        const testFragment = Fragment.from(siblings)  
        return parentNode.type.validContent(testFragment)
    } else if( actionType === 'replace' ) {
        if( isAtom ) return false
        const testNode = createValidNode( elementID, {}, node.content, schema, elements )
        if( !testNode ) return false
        const testFragment = parentNode.content.replaceChild(nodeIndex, testNode)
        return parentNode.type.validContent(testFragment)
    } else if( actionType === 'addOutside' ) {
        if( isAtom ) return false
        const testNode = createValidNode( elementID, {}, Fragment.from(node), schema, elements )
        if( !testNode ) return false
        const testFragment = parentNode.content.replaceChild(nodeIndex, testNode)
        return parentNode.type.validContent(testFragment)
    } else if( actionType === 'addInside') {
        if( isAtom && node.childCount > 0 ) return false
        const testNode = createValidNode( elementID, {}, node.content, schema, elements )
        return testNode && node.type.validContent(Fragment.from(testNode))
    } else {
        throw new Error('Unrecognized action type.')
    }
}

function validInlineAction(elementID, teiDocument ) {
    const editorView = teiDocument.getActiveView()
    const { doc, schema, selection } = editorView.state
    const nodeType = schema.nodes[elementID]

    let {empty, $cursor} = selection
    if (empty && $cursor) {
        const pos = $cursor.pos
        const $targetPos = doc.resolve(pos)
        const parentNode = $targetPos.parent
        const testFragment = Fragment.from(nodeType.create({__id__: 'test'}))
        return parentNode.type.validContent(testFragment)
    } else {
        return true
    }
}

export function createValidNode( elementID, attrs, content, schema, elements, createSubDocument = () => { return '___TEMPID___' } ) {
    const { fcType, pmType, defaultNodes } = elements[elementID]
    const nodeType = schema.nodes[elementID]
    let node

    if( fcType === 'hard' ) {
        // if default nodes are provided, use them to wrap the text node
        let fragment
        if( content.childCount === 0 ) {
            const nodes = []
            for( const defaultNode of defaultNodes ) {
                const node = createValidNode( defaultNode, {}, content, schema, elements, createSubDocument )
                if( !node ) return null
                nodes.push(node)
            }    
            fragment = Fragment.from(nodes)
        } else {
            let hasTextNode = false
            for( let i=0; i < content.childCount; i++ ) {
                const contentChild = content.child(i)
                if( contentChild.type.name.startsWith('textNode') ) {
                    hasTextNode = true
                    break
                }
            }
            if( hasTextNode ) {
                // if any of the nodes in the fragment are text nodes, 
                // the content must be wrapped in the first valid default node
                let nodes = [], seekingFirstValid = true
                for( const defaultNode of defaultNodes ) {
                    const childContent = seekingFirstValid ? content : Fragment.empty
                    let node = createValidNode( defaultNode, {}, childContent, schema, elements, createSubDocument )
                    if( node ) {
                        // found a place for the content
                        seekingFirstValid = false
                    } else {
                        // if this is the last node and we haven't found a home
                        // for content, this is not a valid node
                        if( seekingFirstValid && defaultNode === defaultNodes[defaultNodes.length-1] ) {
                            return null
                        } else {
                            node = createValidNode( defaultNode, {}, Fragment.empty, schema, elements, createSubDocument )
                            if( !node ) return null    
                        }
                    }                    
                    nodes.push(node)
                }    
                fragment = Fragment.from(nodes)
            } else {
                fragment = content
            }
        }
        if( !nodeType.validContent(fragment) ) return null
        node = nodeType.create(attrs, fragment)
    } else {
        if( pmType === 'inline-node' ) {
            let inlineNode
            if( fcType === 'asides' ) {
                const subDocID = createSubDocument(document,elementID,attrs)
                inlineNode = nodeType.create({ id: '', __id__: subDocID, ...attrs })
            } else {
                inlineNode = nodeType.create(attrs)
            }
            // search the global nodes for one that can contain this group
            const groups = nodeType.spec.group.split(' ')
            groups.push(elementID)
            const globalNodeElement = Object.values(elements).find( element => {
                const { name, content } = element
                if( name.startsWith('globalNode') ) {
                    const matchingGroup = groups.find(group => group !== '' && content.includes(group))
                    if( matchingGroup ) return true
                }
                return false
            })
            // wrap the inline node in the appropriate globalNode
            if( !globalNodeElement ) return null
            const globalNodeType = schema.nodes[globalNodeElement.name]
            node = globalNodeType.create({},inlineNode)
        } else {
            // soft nodes must have a textNode as a descendant
            const textNodeName = getTextNodeName(nodeType.spec.content)
            if( textNodeName ) {
                if( content.childCount > 0 ) {
                    // make sure it is the right sort of text node
                    const fragment = replaceTextNodes(schema.nodes[textNodeName], content)
                    if( !fragment || !nodeType.validContent(fragment) ) return null
                    node = nodeType.create(attrs, fragment)    
                } else {
                    // if no text node exists, create one
                    const textNodeType = schema.nodes[textNodeName]
                    node = nodeType.create(attrs, textNodeType.create() )
                }
            } else {
                throw new Error(`${elementID} is required to have a textNode as a descendant.`)
            }
        }
    }
    return node
}    

// Can the selected node move up or down the document?
export function validMove(direction,teiDocument,metaKey) {
    const editorView = teiDocument.getActiveView()
    const {hard, inlines} = teiDocument.fairCopyProject.teiSchema.elementGroups
    const { selection } = editorView.state
    const { $anchor } = selection
    const nodeIndex = $anchor.index()
    const parentNode = $anchor.node()
    const grandParentNode = $anchor.node(-1)
    const selectedNode = selection.node

    // do nothing if root node, or can't move in requested direction
    // also, this doesn't apply to inline nodes
    if( !parentNode || inlines.includes(selectedNode.type.name) ) return false

    const nodes = []
    for( let i=0; i < parentNode.childCount; i++ ) {
        const child = parentNode.child(i)
        if( child !== selectedNode ) nodes.push(child)
    }

    if( direction === 'up' ) { 
        // if first sibling, see if we can move up and out of this parent
        if( nodeIndex === 0 ) {
            if( !grandParentNode ) return false
            const greatNodes = []
            for( let i=0; i < grandParentNode.childCount; i++ ) {
                const child = grandParentNode.child(i)
                greatNodes.push(child)
            }
            const insertIndex = greatNodes.indexOf(parentNode)
            greatNodes.splice(insertIndex,0,selectedNode)
            return parentNode.type.validContent(Fragment.fromArray(nodes)) && grandParentNode.type.validContent(Fragment.fromArray(greatNodes)) 
        // otherwise, we can move around within the parent  
        } else {
            const nodeBefore = $anchor.nodeBefore
            const parentType = nodeBefore.type.name
            // if the prev sibling is a hard node, join it as last sibling, if metakey is down, try to anyway
            if( metaKey || hard.includes( parentType ) ) {
                const nodeBeforeNodes = []
                for( let i=0; i < nodeBeforeNodes.childCount; i++ ) {
                    const child = nodeBeforeNodes.child(i)
                    nodeBeforeNodes.push(child)
                }
                nodeBeforeNodes.push(selectedNode)
                if( parentNode.type.validContent(Fragment.fromArray(nodes)) && nodeBefore.type.validContent(Fragment.fromArray(nodeBeforeNodes)) ) {
                    return 'join'
                } 
            } 
            const insertIndex = nodes.indexOf(nodeBefore)
            nodes.splice(insertIndex,0,selectedNode)
            if( parentNode.type.validContent(Fragment.fromArray(nodes)) ) {
                return 'skip'
            }
        }
    } else {
        // if we are the last sibling, try to move down and out of this parent
        if(nodeIndex >= parentNode.childCount-1) {
            if( !grandParentNode ) return false
            const greatNodes = []
            for( let i=0; i < grandParentNode.childCount; i++ ) {
                const child = grandParentNode.child(i)
                greatNodes.push(child)
            }
            const insertIndex = greatNodes.indexOf(parentNode) + 1
            greatNodes.splice(insertIndex,0,selectedNode)
            return parentNode.type.validContent(Fragment.fromArray(nodes)) && grandParentNode.type.validContent(Fragment.fromArray(greatNodes)) 
        // otherwise, move around within this parent
        } else {
            const swapNode = parentNode.child(nodeIndex+1)
            const parentType = swapNode.type.name
            // if next sibling is a hard node, join it as the first sibling, if metakey is down, try to anyway
            if( metaKey || hard.includes( parentType ) ) {
                const nodeAfterNodes = []
                for( let i=0; i < swapNode.childCount; i++ ) {
                    const child = swapNode.child(i)
                    nodeAfterNodes.push(child)
                }
                nodeAfterNodes.splice(0,0,selectedNode)
                if( parentNode.type.validContent(Fragment.fromArray(nodes)) && swapNode.type.validContent(Fragment.fromArray(nodeAfterNodes)) ) {
                    return 'join'
                }
             } 
            const insertIndex = nodes.indexOf(swapNode) + 1
            nodes.splice(insertIndex,0,selectedNode)
            if( parentNode.type.validContent(Fragment.fromArray(nodes)) ) {
                return 'skip'
            }      
        }
    }

    return false
}

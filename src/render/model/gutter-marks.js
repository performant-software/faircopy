import { ReplaceStep, ReplaceAroundStep } from "prosemirror-transform"

export function generateGutterMarks( editorView, expandedGutter, docNodes, gutterTop ) {
    const { doc } = editorView.state
    const scrollTop = editorView.dom.parentNode.parentNode.scrollTop

    // recursively build subtree of visible structure nodes from slice
    const processNode = (pmNode,pos=0) => {
        const children = []
        const nodeType = pmNode.type ? pmNode.type.name : 'root'
        let top = null, bottom = null

        if( nodeType.startsWith('textNode') || nodeType.startsWith('globalNode') ) {
            top = editorView.coordsAtPos(pos).top - gutterTop+scrollTop-5
            bottom = editorView.coordsAtPos(pos+pmNode.nodeSize-1).bottom - gutterTop+scrollTop-5   
        }

        let offset = 1
        for( let i=0; i < pmNode.childCount; i++ ) {
            const pmChildNode = pmNode.child(i)
            const childPos = pos+offset
            if( pmChildNode.type.isBlock ) {
                children.push( processNode(pmChildNode,childPos) )
            } 
            offset += pmChildNode.nodeSize
        }    

        return {
            pmNode,
            pos,
            top,
            bottom,
            children
        }
    }
    
    // turn the PM slice into a tree with screen positions
    const subTree = processNode(doc)

    const gutterMarks = []
    const columnPositions = []
    const computedWidths = {}
    const canvas = document.createElement("canvas")

    function getTextWidth(text) {
        if( !computedWidths[text] ) {
            const context = canvas.getContext("2d")
            // must match CSS for: .EditorGutter .markers
            context.font = "12pt sans-serif"
            const metrics = context.measureText(text)
            const width = Math.floor(metrics.width)    
            computedWidths[text] = width
            return width
        } else {
            // return cached value
            return computedWidths[text]
        }
    }

    const columnThickness = []

    // find the max width for each column
    function gatherColumnThickness(name, column) {
        if( expandedGutter ) {
            const displayName = (name === 'noteX') ? 'note' : name
            const thickness = getTextWidth(displayName)
            if( isNaN(columnThickness[column]) ) {
                columnThickness[column] = thickness + 24
            } else {
                columnThickness[column] = Math.max(columnThickness[column], thickness + 24)
            }
        } else {
            columnThickness[column] = 15
        }
    }
    
    const processGutterMarks = (node,column=-1) => {
        const { pmNode, top, bottom, children } = node
        const nodeType = pmNode.type ? pmNode.type.name : 'root'
        
        if( top !== null ) {
            return {top, bottom}
        } else {
            for( let i=0; i < children.length; i++ ) {
                const child = children[i]
                const { top: childTop, bottom: childBottom } = processGutterMarks(child,column+1)
                child.top = childTop
                child.bottom = childBottom
                if( i > 0 ) children[i-1].bottom = childTop - 10
            }

            const first = children[0]               
            if( first ) {
                // filter out elements that don't appear in gutter, add remaining details and place in render list
                if( pmNode.type.isBlock && !docNodes.includes(nodeType) && !nodeType.startsWith('textNode') && !nodeType.startsWith('globalNode') ) {
                    gatherColumnThickness(nodeType,column)
                    node.column = column        
                    gutterMarks.push(node)
                }
                const last = children[children.length-1]
                return { top: first.top, bottom: last.bottom }
            } else {
                // element has no children and therefore no height, don't add it to gutterMarks
                return { top, bottom }
            }
        }    
    }

    // turn the tree into a flat list of gutter marks to render
    processGutterMarks(subTree)

    // once the max column width is known, calculate column positions
    let totalWidth = 0
    for( let i=0; i < columnThickness.length; i++ ) {
        columnPositions[i] = totalWidth  
        totalWidth += columnThickness[i]
    }

    return { gutterMarks, totalWidth, columnPositions }
}
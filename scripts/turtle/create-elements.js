const { encodeContent, encodeMarkContent } = require('./parse-content');
const fs = require('fs');

const createElements = function createElements(elGroups,specs) {
    const elements = []
    const icons = JSON.parse(fs.readFileSync(`scripts/turtle/inline-icons.json`).toString('utf-8'))
    const defaultNodes = JSON.parse(fs.readFileSync(`scripts/turtle/default-nodes.json`).toString('utf-8'))

    // TODO embeds
    elements.push( ...createNodes(elGroups,true,defaultNodes,specs) )
    elements.push( ...createInlineNodes(elGroups,icons,specs) )
    elements.push( ...createAsides(elGroups,icons,defaultNodes,specs) )
    elements.push( ...createInters(elGroups,defaultNodes,specs) )
    elements.push( ...createMarks(elGroups,specs) )
    elements.push( ...createNodes(elGroups,false,defaultNodes,specs) )
    elements.push( ...createTextNodes(elements) )
    elements.push( ...createDocNode() )

    return elements
}

function createMarks(elGroups,specs) {
    const marks = elGroups.marks
    const markGroups = getMarkGroups( elGroups, specs ) 

    const markElements = []
    for(let mark of marks) {
        const spec = specs[mark]
        const markContent = encodeMarkContent( onlyGroups( markGroups, spec.content ) )
        markElements.push({
            name: mark,
            pmType: "mark",
            validAttrs: [],
            group: spec.group,
            markContent,
            desc: spec.description,
            synth: false
        })
    }
    return markElements
}

function createInters(elGroups,defaultNodes,specs) {
    const inters = elGroups.inter
    const nodeGroups = getNodeGroups( elGroups, specs )
    const markGroups = getMarkGroups( elGroups, specs ) 

    // Inter elements generate both a mark and a soft node
    const interElements = []
    for(let inter of inters) {
        const spec = specs[inter]
        const nodeContent = onlyGroups( nodeGroups, spec.content )
        const markContent = encodeMarkContent( onlyGroups( markGroups, spec.content ) )

        interElements.push({
            name: `mark${inter}`,
            pmType: "mark",
            validAttrs: [],
            group: spec.group,
            markContent,
            desc: spec.description,
            synth: true
        })

        
        const nodeEl = {
            name: inter,
            pmType: "node",
            isolating: false,
            content: encodeContent(nodeContent),
            markContent,
            group: spec.group,
            gutterMark: true,
            defaultNodes: defaultNodes[inter] ? defaultNodes[inter] : null,
            validAttrs: [],
            desc: spec.description,
            synth: false
        }
        interElements.push(nodeEl)    
    }

    return interElements
}

function createInlineNodes(elGroups,icons,specs) {
    const {inlines} = elGroups

    const inlineElements = []
    for(let inline of inlines ) {
        const spec = specs[inline]
        inlineElements.push( {
            name: inline,
            pmType: "inline-node",
            validAttrs: [],
            icon: icons[inline],
            group: 'inline_node',
            desc: spec.description,
            synth: false
        } )
    }
    return inlineElements
}

function createAsides(elGroups,icons,defaultNodes,specs) {
    const {asides} = elGroups

    const asideElements = []
    for( const aside of asides ) {
        const spec = specs[aside]
        const nodeGroups = getNodeGroups( elGroups, specs )
        const nodeContent = onlyGroups( nodeGroups, spec.content )
        const content = encodeContent(nodeContent)
        const contentName = `${aside}X`
        const docName = `${aside}Doc`
    
        // create the inline node which will represent the element in the document
        asideElements.push( {
            name: aside,
            pmType: "inline-node",
            validAttrs: [],
            icon: icons[aside],
            group: 'inline_node',
            defaultNodes: defaultNodes[aside] ? defaultNodes[aside] : null,
            desc: spec.description,
            synth: false
        } )

        // create the node that will contain the aside's content 
        asideElements.push({
            "name": contentName,
            "pmType": "node",
            "isolating": true,
            "gutterMark": true,
            "content": content,
            synth: true
        })

        // create the root node for the aside's subDocument
        asideElements.push({
            "name": docName,
            "pmType": "node",
            "isolating": true,
            "content": contentName,
            synth: true
        })
    }

    return asideElements
}

// special top level text node, has properties of text but is called "doc"
const createDocNode = function createDocNode() {
    return [
        {
            "name": "doc",
            "pmType": "node",
            "isolating": true,
            "gutterMark": true,
            "content": '((front)? (body) (back)?)',
            synth: true
        },
        {
            "name": "headerDoc",
            "pmType": "node",
            "isolating": true,
            "gutterMark": true,
            "content": '(fileDesc model_teiHeaderPart* revisionDesc?)',
            synth: true
        }
    ]
}

function getNodeGroups(elGroups,specs) {
    // these are elements that translate into ProseMirror nodes
    const nodeIdents = [ elGroups.hard, elGroups.soft, elGroups.inlines, elGroups.inter ].flat()
    const groups = getGroups( nodeIdents, specs )
    return [ nodeIdents, groups, "textNode" ].flat()
}

function getMarkGroups(elGroups,specs) {
    // these are elements that translate into ProseMirror marks
    const markIdents = [ elGroups.marks, elGroups.inter ].flat()
    const groups = getGroups( markIdents, specs )
    return [ markIdents, groups ].flat()
}

function getGroups( idents, specs ) {
    const uniqueGroups = []
    for( const ident of idents ) {
        const spec = specs[ident]
        const groups = spec.group.split(' ')    
        for( const group of groups ) {
            if( !uniqueGroups.includes(group) ) uniqueGroups.push(group)
        }
    }
    return uniqueGroups
}

// recurse content and remove targetGroups 
function onlyGroups( targetGroups, content ) {
    const filteredContent = { ...content }
    if( !content ) return null
    if( content.type === 'group' ) {
        filteredContent.content = content.content.filter( group => targetGroups.includes(group) )
        if( filteredContent.content.length === 0 ) return null
    } else {
        const contents = []
        for( const item of content.content ) {
            const only = onlyGroups( targetGroups, item )
            if( only ) {
                contents.push( only )
            }
        }
        // remove empty sequences and alternates
        if( contents.length === 0 ) return null
        filteredContent.content = contents
    }    
    return filteredContent
}

const createNodes = function createNodes(elGroups,hard,defaultNodes,specs) {
    const nodes = hard ? elGroups.hard : elGroups.soft 
    const nodeGroups = getNodeGroups( elGroups, specs )
    const markGroups = getMarkGroups( elGroups, specs ) 

    const nodeElements = []
    for( let node of nodes) {
        const spec = specs[node]
        const nodeContent = onlyGroups( nodeGroups, spec.content )
        let content = encodeContent(nodeContent)

        let markContent = null
        if( !hard ) {
            markContent = encodeMarkContent( onlyGroups( markGroups, spec.content ) )
        }

        // This hack replaces note with model_noteLike in this one case. inline nodes canot be referenced
        // by element name since they are fronted by the globalNode element to shim 
        // block vs. inline interface in ProseMirror.
        if( node === 'respStmt' ) content = content.replace(/note/g,'model_noteLike')
        const nodeEl = {
            name: node,
            pmType: "node",
            isolating: hard,
            content,
            markContent,
            group: spec.group,
            gutterMark: true,
            validAttrs: [],
            defaultNodes: defaultNodes[node] ? defaultNodes[node] : null,
            desc: spec.description,
            synth: false
        }
        nodeElements.push(nodeEl)
    }

    return nodeElements
}

function createTextNodes(elements) {
    let textNodeCount = 0
    const textNodes = {}
    for( const element of elements ) {
        const textNodeSignature = element.content && element.markContent ? element.markContent : null
        if( textNodeSignature ) {
            // if there isn't one like this yet, create it
            if( !textNodes[textNodeSignature] ) {
                const textNodeName = `textNode${textNodeCount++}`                
                textNodes[textNodeSignature] = {
                    name: textNodeName,
                    pmType: "node",
                    synth: true,
                    content: "(inline_node|text)*",
                    selectable: false,
                    marks: element.markContent,
                    draggable: false,
                    parseDOM: [
                        {
                            tag: textNodeName
                        } 
                    ],
                    toDOM: () => [textNodeName,0]
                }
            }
            // all content strings with same mark content reference same text nodes
            // so that they can pick up the mark content definitions
            const textNodeName = textNodes[textNodeSignature].name
            element.content = element.content.replace('textNode',textNodeName)
        }
        if( element.markContent !== undefined ) delete element.markContent
    }       

    return Object.values(textNodes)
}



// EXPORTS /////////////
module.exports.createElements = createElements
module.exports.createNodes = createNodes

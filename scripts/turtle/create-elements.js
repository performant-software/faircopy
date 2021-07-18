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
    elements.push( ...createGlobalNodes(elGroups,specs) )
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
    const inlineGroups = getInlineGroups( elGroups, specs )

    // Inter elements generate both a mark and a soft node
    const interElements = []
    for(let inter of inters) {
        const spec = specs[inter]
        const nodeContent = onlyGroups( inlineGroups, onlyGroups( nodeGroups, spec.content), true )
        const markContent = encodeMarkContent( onlyGroups( markGroups, spec.content ) )
        const inlineContent = encodeContent( onlyGroups( inlineGroups, spec.content ), '_i' )

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
            inlineContent,
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
        const group = spec.group.split(' ').map(g=>`${g}_i`).join(' ')
        inlineElements.push( {
            name: inline,
            pmType: "inline-node",
            validAttrs: [],
            icon: icons[inline],
            group,
            desc: spec.description,
            synth: false
        } )
    }
    return inlineElements
}

function createAsides(elGroups,icons,defaultNodes,specs) {
    const {asides} = elGroups
    const markGroups = getMarkGroups( elGroups, specs ) 

    const asideElements = []
    for( const aside of asides ) {
        const spec = specs[aside]
        const nodeGroups = getNodeGroups( elGroups, specs )
        const nodeContent = onlyGroups( nodeGroups, spec.content )
        const markContent = encodeMarkContent( onlyGroups( markGroups, spec.content ) )
        const content = encodeContent(nodeContent)
        const contentName = `${aside}X`
        const docName = `${aside}Doc`
        const group = spec.group.split(' ').map(g=>`${g}_i`).join(' ')

        // create the inline node which will represent the element in the document
        asideElements.push( {
            name: aside,
            pmType: "inline-node",
            validAttrs: [],
            icon: icons[aside],
            group,
            defaultNodes: defaultNodes[aside] ? defaultNodes[aside] : null,
            desc: spec.description,
            synth: false
        } )

        // create the node that will contain the aside's content 
        asideElements.push({
            name: contentName,
            pmType: "node",
            isolating: true,
            gutterMark: true,
            content,
            markContent,
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
    const markInters = elGroups.inter.map( inter => `mark${inter}`)
    return [ [elGroups.marks, markInters ], groups ].flat()
}

function getInlineGroups(elGroups,specs) {
    const inlineIdents = [ elGroups.inlines, elGroups.asides ].flat()
    const groups = getGroups( inlineIdents, specs )
    return groups
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
function onlyGroups( targetGroups, content, not ) {
    const filteredContent = { ...content }
    if( !content ) return null
    if( content.type === 'group' ) {
        filteredContent.content = not ? content.content.filter( group => !targetGroups.includes(group) ) : content.content.filter( group => targetGroups.includes(group) )
        if( filteredContent.content.length === 0 ) return null
    } else {
        const contents = []
        for( const item of content.content ) {
            const only = onlyGroups( targetGroups, item, not )
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
    const inlineGroups = getInlineGroups( elGroups, specs )

    const nodeElements = []
    for( let node of nodes) {
        const spec = specs[node]

        let markContent = null, inlineContent = null, content
        if( hard ) {
            const nodeContent = onlyGroups( nodeGroups, spec.content )
            content = encodeContent(nodeContent)
        } else {
            // filter out inlines and place them in inlineContent 
            const nodeContent = onlyGroups( inlineGroups, onlyGroups( nodeGroups, spec.content), true )
            content = encodeContent(nodeContent)
            markContent = encodeMarkContent( onlyGroups( markGroups, spec.content ) )
            inlineContent = encodeContent( onlyGroups( inlineGroups, spec.content ), '_i' )
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
            inlineContent,
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
        const textNodeSignature = element.content && element.markContent ? `${element.markContent}-${element.inlineContent}` : null
        if( textNodeSignature ) {
            // if there isn't one like this yet, create it
            if( !textNodes[textNodeSignature] ) {
                const textNodeName = `textNode${textNodeCount++}`                
                const content = element.inlineContent ? `(${element.inlineContent}|text)*` : 'text*'
                textNodes[textNodeSignature] = {
                    name: textNodeName,
                    pmType: "node",
                    synth: true,
                    content,
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
        // if( element.markContent !== undefined ) delete element.markContent
        // if( element.inlineContent !== undefined ) delete element.inlineContent
    }       

    return Object.values(textNodes)
}

function createGlobalNodes( elGroups, specs ) {
    const inlineGroups = getInlineGroups( elGroups, specs )

    const globalNodes = []
    let globalNodeCount = 0
    for( const inlineGroup of inlineGroups ) {
        const globalNodeName = `globalNode${globalNodeCount++}`     
        const content = `${inlineGroup}_i*`  
        globalNodes.push({
            name: globalNodeName,
            pmType: "node",
            content,
            group: inlineGroup,
            atom: true,
            selectable: false,
            synth: true,
            parseDOM: [
                {
                    tag: globalNodeName
                } 
            ],
            toDOM: () => [globalNodeName,0]
        })
    }

    return globalNodes
}

// EXPORTS /////////////
module.exports.createElements = createElements
module.exports.createNodes = createNodes

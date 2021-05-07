const { encodeContent } = require('./parse-content');
const fs = require('fs');

const createElements = function createElements(elGroups,specs) {
    const elements = []
    const icons = JSON.parse(fs.readFileSync(`scripts/turtle/inline-icons.json`).toString('utf-8'))

    // TODO embeds
    elements.push( ...createNodes(elGroups,true,specs) )
    elements.push( ...createInlineNodes(elGroups,icons,specs) )
    elements.push( ...createAsides(elGroups,icons,specs) )
    // TODO limited-marks
    elements.push( ...createInters(elGroups,specs) )
    elements.push( ...createMarks(elGroups,specs) )
    elements.push( ...createNodes(elGroups,false,specs) )
    elements.push( ...createDocNode() )
    return elements
}

function createMarks(elGroups,specs) {
    const marks = elGroups.marks

    // TODO filter nodes out of mark group
    const markElements = []
    for(let mark of marks) {
        const spec = specs[mark]
        markElements.push({
            name: mark,
            pmType: "mark",
            validAttrs: [],
            group: spec.group,
            desc: spec.description
        })
    }
    return markElements
}

function createInters(elGroups,specs) {
    const inters = elGroups.inter
    const nodeGroups = getNodeGroups( elGroups, specs )

    // Inter elements generate both a mark and a soft node
    const interElements = []
    for(let inter of inters) {
        const spec = specs[inter]
        const nodeContent = onlyGroups( nodeGroups, spec.content )

        interElements.push({
            name: `mark${inter}`,
            pmType: "mark",
            validAttrs: [],
            group: spec.group,
            desc: spec.description
        })

        const nodeEl = {
            name: inter,
            pmType: "node",
            isolating: false,
            content: encodeContent(nodeContent),
            group: spec.group,
            gutterMark: true,
            validAttrs: [],
            desc: spec.description
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
            desc: spec.description
        } )
    }
    return inlineElements
}

function createAsides(elGroups,icons,specs) {
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
            desc: spec.description
        } )

        // create the node that will contain the aside's content 
        asideElements.push({
            "name": contentName,
            "pmType": "node",
            "isolating": true,
            "gutterMark": true,
            "content": content 
        })

        // create the root node for the aside's subDocument
        asideElements.push({
            "name": docName,
            "pmType": "node",
            "isolating": true,
            "content": contentName
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
            "content": '((front)? (body) (back)?)'
        },
        {
            "name": "headerDoc",
            "pmType": "node",
            "isolating": true,
            "gutterMark": true,
            "content": '(fileDesc model_teiHeaderPart* revisionDesc?)'
        }
    ]
}

function getNodeGroups(elGroups,specs) {
    // these are elements that translate into ProseMirror nodes
    const nodeIdents = [ elGroups.hard, elGroups.soft, elGroups.inlines, elGroups.inter ].flat()
    const groups = getGroups( nodeIdents, specs )
    return [ nodeIdents, groups, "textNode" ].flat()
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

const createNodes = function createNodes(elGroups,hard,specs) {
    const nodes = hard ? elGroups.hard : elGroups.soft 
    const nodeGroups = getNodeGroups( elGroups, specs )

    const nodeElements = []
    for( let node of nodes) {
        const spec = specs[node]
        const nodeContent = onlyGroups( nodeGroups, spec.content )
        let content = encodeContent(nodeContent)
        // This hack replaces note with model_noteLike in this one case. inline nodes canot be referenced
        // by element name since they are fronted by the globalNode element to shim 
        // block vs. inline interface in ProseMirror.
        if( node === 'respStmt' ) content = content.replace(/note/g,'model_noteLike')
        const nodeEl = {
            name: node,
            pmType: "node",
            isolating: hard,
            content,
            group: spec.group,
            gutterMark: true,
            validAttrs: [],
            desc: spec.description
        }
        nodeElements.push(nodeEl)
    }

    return nodeElements
}

// EXPORTS /////////////
module.exports.createElements = createElements
module.exports.createNodes = createNodes

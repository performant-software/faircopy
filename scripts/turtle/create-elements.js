const { encodeContent } = require('./parse-content');

const createElements = function createElements(elGroups,specs) {
    const elements = []
    elements.push( ...createMarks(elGroups,specs) )
    elements.push( ...createInlineNodes(elGroups,specs) )
    elements.push( ...createNodes(elGroups,specs) )
    elements.push( ...createStructureNodes(elGroups,specs) )
    return elements
}

function createMarks(elGroups,specs) {
    const { marks } = elGroups

    // TODO filter nodes out of mark group
    const markElements = []
    for( let mark of marks) {
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

function createInlineNodes(elGroups,specs) {
    return [  
        {
            "name": "pb",
            "pmType": "inline-node",
            "validAttrs": [],
            "group": specs['pb'].group,
            "desc": specs['pb'].description
        },
        {
            "name": "note",
            "pmType": "inline-node",
            "validAttrs": [], 
            "group": specs['note'].group,
            "desc": specs['note'].description
        }
    ]
}

function createStructureNodes(elGroups,specs) {
    const nodeGroups = getNodeGroups( elGroups, specs )
    const spec = specs['div']
    const nodeContent = onlyGroups( nodeGroups, spec.content )

    return [
         {
            "name": "div",
            "pmType": "node",
            "content": encodeContent(nodeContent),
            "group": spec.group,
            "validAttrs": [],
            "desc": spec.description
        }   
    ]
}

function getNodeGroups(elGroups,specs) {
    const nodeIdents = [ elGroups.nodes, elGroups.inlines, elGroups.structures ].flat()
    const groups = getGroups( nodeIdents, specs )
    return [ nodeIdents, groups ].flat()
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
    if( content.type === 'group' ) {
        filteredContent.content = content.content.filter( group => targetGroups.includes(group) )
    } else {
        const contents = []
        for( const item of content.content ) {
            contents.push( onlyGroups( targetGroups, item ) )
        }
        filteredContent.content = contents
    }    
    return filteredContent
}

function createNodes(elGroups,specs) {
    const { nodes } = elGroups 
    const nodeGroups = getNodeGroups( elGroups, specs )

    const nodeElements = []
    for( let node of nodes) {
        const spec = specs[node]
        const nodeContent = onlyGroups( nodeGroups, spec.content )
        nodeElements.push({
            name: node,
            pmType: "node",
            content: encodeContent(nodeContent),
            group: spec.group,
            gutterMark: true,
            validAttrs: [],
            desc: spec.description
        })
    }
    return nodeElements
}

// EXPORTS /////////////
module.exports.createElements = createElements

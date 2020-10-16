const { encodeContent } = require('./parse-content');

const createElements = function createElements(elGroups,specs) {
    const elements = []
    // TODO embeds
    elements.push( ...createNodes(elGroups,true,specs) )
    elements.push( ...createInlineNodes(elGroups,specs) )
    elements.push( ...createMarks(elGroups,true,specs) )
    // TODO limited-marks
    // TODO inter as soft nodes
    elements.push( ...createMarks(elGroups,false,specs) )
    elements.push( ...createNodes(elGroups,false,specs) )
    elements.push( ...createStructureNodes(elGroups,specs) )
    return elements
}

function createMarks(elGroups,inter,specs) {
    const marks = inter ? elGroups.inter : elGroups.marks

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

const createStructureNodes = function createStructureNodes(elGroups,specs) {
    const nodeGroups = getNodeGroups( elGroups, specs )
    const divSpec = specs['div']
    const divContent = onlyGroups( nodeGroups, divSpec.content )
    const bodySpec = specs['body']
    const bodyContent = onlyGroups( nodeGroups, bodySpec.content )

    return [
         {
            "name": "div",
            "pmType": "node",
            "content": encodeContent(divContent),
            "group": divSpec.group,
            "isolating": true,
            "gutterMark": true,
            "validAttrs": [],
            "desc": divSpec.description
        },
        // special top level node, has properties of body but is called "doc"
        {
            "name": "doc",
            "pmType": "node",
            "isolating": true,
            "gutterMark": true,
            "group": ['body',bodySpec.group].join(' '),
            "content": encodeContent(bodyContent)
        }
    ]
}

function getNodeGroups(elGroups,specs) {
    // these are elements that translate into ProseMirror nodes
    const nodeIdents = [ elGroups.hard, elGroups.soft, elGroups.structures ].flat()
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
        const nodeEl = {
            name: node,
            pmType: "node",
            isolating: hard,
            content: encodeContent(nodeContent),
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
module.exports.createStructureNodes = createStructureNodes

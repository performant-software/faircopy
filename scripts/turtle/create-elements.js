const { encodeContent } = require('./parse-content');
const fs = require('fs');

const createElements = function createElements(elGroups,specs) {
    const elements = []
    const icons = JSON.parse(fs.readFileSync(`scripts/turtle/inline-icons.json`).toString('utf-8'))

    // TODO embeds
    elements.push( ...createNodes(elGroups,true,specs) )
    elements.push( ...createInlineNodes(elGroups,icons,specs) )
    // TODO limited-marks
    elements.push( ...createInters(elGroups,specs) )
    elements.push( ...createMarks(elGroups,specs) )
    elements.push( ...createNodes(elGroups,false,specs) )
    elements.push( ...createDocNodes(elGroups,specs) )
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

    // Inter elements generate both a mark and a hard node
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
            group: spec.group,
            desc: spec.description
        } )
    }
    return inlineElements
}

// special top level text node, has properties of text but is called "doc"
const createDocNodes = function createDocNode(elGroups,specs) {
    return [
        {
            "name": "doc",
            "pmType": "node",
            "isolating": true,
            "gutterMark": true,
            "content": "noteDoc | ((front)? (body) (back)?)"
        },
        {
            "name": "noteDoc",
            "pmType": "node",
            "isolating": true,
            "gutterMark": true,
            "content": "(textNode|model_phrase|model_inter|model_divPart)*"
        }
    ]
}

function getNodeGroups(elGroups,specs) {
    // these are elements that translate into ProseMirror nodes
    const nodeIdents = [ elGroups.hard, elGroups.soft, elGroups.inter ].flat()
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

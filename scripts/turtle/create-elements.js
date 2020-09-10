const { encodeContent } = require('./parse-content');

const createElements = function createElements(elGroups,specs) {
    const elements = []
    elements.push( ...createMarks(elGroups.marks,specs) )
    elements.push( ...createInlineNodes(elGroups.inlines,specs) )
    elements.push( ...createNodes(elGroups.nodes,specs) )
    elements.push( ...createStructureNodes(elGroups.structures,specs) )
    return elements
}

function createMarks(phraseMarks,specs) {

    // TODO filter nodes out of mark group
    const phraseElements = []
    for( let phraseMark of phraseMarks) {
        const spec = specs[phraseMark]
        phraseElements.push({
            name: phraseMark,
            pmType: "mark",
            validAttrs: [],
            group: spec.group,
            desc: spec.description
        })
    }
    return phraseElements
}

function createInlineNodes(inlines,specs) {
    return [  
        {
            "name": "pb",
            "pmType": "inline-node",
            "validAttrs": [], 
            "desc": "marks the beginning of a new page in a paginated document."
        },
        {
            "name": "note",
            "pmType": "inline-node",
            "validAttrs": [], 
            "desc": "contains a note or annotation."
        }
    ]
}

function createStructureNodes(structures,specs) {
    return [
         {
            "name": "div",
            "pmType": "node",
            "content": "(pLike|lLike|divLike|divPart)*",
            "group": "divLike",
            "validAttrs": [],
            "desc": specs['div'].description
        }   
    ]
}

function createNodes(chunkEls,specs) {

    // TODO filter marks them out of node content and group
    // TODO encode content to PM syntax

    const chunkElements = []
    for( let chunk of chunkEls) {
        const spec = specs[chunk]
        chunkElements.push({
            name: chunk,
            pmType: "node",
            content: encodeContent(spec.content),
            group: spec.group,
            gutterMark: true,
            validAttrs: [],
            desc: spec.description
        })
    }
    return chunkElements
}


// function createExamplars(specs) {
//     return [
//         {
//             "name": "div",
//             "pmType": "node",
//             "content": "(pLike|lLike|divLike|divPart)*",
//             "group": "divLike",
//             "validAttrs": [],
//             "desc": specs['div'].description
//         },
        // {
        //     "name": "p",
        //     "pmType": "node",
        //     "content": "inline*",
        //     "group": "pLike",
        //     "gutterMark": true,
        //     "validAttrs": [],
        //     "desc": "marks paragraphs in prose."
        // },
        // {
        //     "name": "l",
        //     "pmType": "node",
        //     "content": "inline*",
        //     "group": "lLike",
        //     "gutterMark": true,
        //     "validAttrs": [],
        //     "desc": "(verse line) contains a single, possibly incomplete, line of verse."
        // },
        // {
        //     "name": "sp",
        //     "pmType": "node",
        //     "content": "speaker? (pLike|lLike)*",
        //     "group": "divPart",
        //     "gutterMark": true,
        //     "validAttrs": [],
        //     "desc": "(speech) contains an individual speech in a performance text, or a passage presented as such in a prose or verse text."
        // },
        // {
        //     "name": "speaker",
        //     "pmType": "node",
        //     "content": "inline*",
        //     "gutterMark": true,
        //     "validAttrs": [],
        //     "desc": "contains a specialized form of heading or label, giving the name of one or more speakers in a dramatic text or fragment."
        // },
//         {
//             "name": "pb",
//             "pmType": "inline-node",
//             "validAttrs": [], 
//             "desc": "marks the beginning of a new page in a paginated document."
//         },
//         {
//             "name": "note",
//             "pmType": "inline-node",
//             "validAttrs": [], 
//             "desc": "contains a note or annotation."
//         }
//     ]
// }

// EXPORTS /////////////
module.exports.createElements = createElements

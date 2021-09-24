import lunr from 'lunr';

export function createIndex() {
    return {}
}

export function loadIndex( indexJSON ) {
    // TODO
}

function getSafeAttrKey( attrName ) {
    return attrName.replace(':','')
}

function defineAttrFields( lunrIndex, attrs ) {
    for( const attr of Object.keys(attrs) ) {
        const attrSafeKey = getSafeAttrKey(attr)
        const fieldName = `attr_${attrSafeKey}`
        lunrIndex.field(fieldName)
    }
}

function defineLunrSchema( lunrIndex, attrs ) {
    // configure pipeline for exact matching search, language independent
    lunrIndex.pipeline.remove(lunr.stemmer)
    lunrIndex.pipeline.remove(lunr.stopWordFilter)
    lunrIndex.searchPipeline.remove(lunr.stemmer)
    lunrIndex.searchPipeline.remove(lunr.stopWordFilter)

    // add fields to schema
    lunrIndex.ref('locator')
    lunrIndex.field('elementName')
    lunrIndex.field('softNode')
    lunrIndex.field('contents')
    defineAttrFields( lunrIndex, attrs )
}

export function indexDocument( teiDocument ) {
    const { fairCopyProject, resourceID, editorView } = teiDocument
    const { searchIndex, teiSchema } = fairCopyProject
    const { elements, attrs } = teiSchema
    const { doc } = editorView.state
    
    searchIndex[resourceID] = lunr( function () {
        defineLunrSchema(this,attrs)

        doc.descendants((node,pos) => {
            const locator = `${resourceID}/${pos}`
            const elementName = node.type.name
            const contents = node.textContent
            const element = elements[elementName]
            if( !element ) return true

            const { fcType } = element
            const softNode = fcType === 'soft' ? 'true' : 'false'
            const attrFields = {}
            
            for( const attrKey of Object.keys(node.attrs) ) {
                const attrVal = node.attrs[attrKey]
                const attrSafeKey = getSafeAttrKey(attrKey)
                attrFields[`attr_${attrSafeKey}`] = attrVal
            }

            // TODO index marks
            // TODO sub docs

            this.add({
                locator,
                elementName,
                softNode,
                contents,
                ...attrFields
            })
            return true
        })

    })
}

export function searchProject( query, searchIndex ) {
    const results = {}
    for( const resourceID of Object.keys(searchIndex) ) {
        results[resourceID] = searchResource( query, resourceID, searchIndex )
    }

    debugger
}

export function searchResource( query, resourceID, searchIndex ) {
    const resourceIndex = searchIndex[resourceID]

    // create a list of terms from the query
    const terms = query.split(' ')
    const termQs = []
    for( const term of terms ) {
        termQs.push(`+contents:${term}`)
    }
    const termQ = termQs.join(' ')

    // full text search 
    // return resourceIndex.search(termQ)
    return resourceIndex.search(`+softNode:true ${termQ}`)

    // TODO find a element containing a phrase w/certain attrs
    // const results = searchIndex.search('+contents:this +contents:is +elementName:p +attr_rend:bold')
}


// highlight would look inside each of the text blocks and highlight the search for terms or phrase

// const sampleDocs = [
//     {
//         locator: 'sdsds-dsdsd-dsdsd-dsds/1',
//         elementName: "body",
//         contents: "This is my textNode's deleted content.\nRabbit is the second paragraph."
//     },
//     {
//         locator: 'sdsds-dsdsd-dsdsd-dsds/2',
//         attr_xmlID: "foo",
//         contents: "This is my textNode's deleted content.\nThis is the second paragraph."
//     },
//     {
//         locator: 'sdsds-dsdsd-dsdsd-dsds/10',
//         elementName: "p",
//         softNode: "true",
//         attr_rend: "bold",
//         contents: "This is my textNode's rabbit deleted content."
//     },
//     {
//         locator: 'sdsds-dsdsd-dsdsd-dsds/20',    
//         elementName: "pb",
//         attr_facs: "pics#101"
//     },
//     {
//         locator: 'sdsds-dsdsd-dsdsd-dsds/30',   
//         elementName: "note",
//         softNode: "true",
//         contents: "This is my note."
//     },
//     {
//         locator: 'sdsds-dsdsd-dsdsd-dsds/40',  
//         elementName: "del",
//         attr_place: "above",
//         contents: "deleted"
//     },
//     {
//         locator: 'sdsds-dsdsd-dsdsd-dsds/50', 
//         elementName: "p",
//         contents: "This is the second  rabbit paragraph."
//     }
// ]

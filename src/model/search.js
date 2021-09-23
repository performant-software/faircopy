import lunr from 'lunr';

let nextRecordID = 1

export function createIndex() {

    var searchIndex = lunr(function () {
        this.pipeline.remove(lunr.stemmer)
        this.pipeline.remove(lunr.stopWordFilter)
        this.searchPipeline.remove(lunr.stemmer)
        this.searchPipeline.remove(lunr.stopWordFilter)
        this.ref('id')
        this.field('elementName')
        this.field('softNode')
        this.field('attr_xmlID')
        this.field('attr_rend')
        this.field('attr_facs')
        this.field('attr_place')
        this.field('contents')

        for( const sampleDoc of sampleDocs ) {
            this.add(sampleDoc)
        }    
    })

    return searchIndex
}

export function loadIndex( indexJSON ) {
    // TODO
}

export function indexDocument( teiDocument ) {
    const { fairCopyProject, editorView } = teiDocument
    const { searchIndex } = fairCopyProject
    const { doc } = editorView.state

    const id = nextRecordID++
    const content = doc.textContent
    const searchDoc = { id, content }
    searchIndex.add(id, searchDoc)
}

export function searchProject( query, searchIndex ) {
    const results = searchIndex.search('+contents:this +contents:is +elementName:p')
    debugger
}

/// Sample doc:

const sampleCodex = [
    {
        resourceID: 'sdsds-dsdsd-dsdsd-dsds',
        subDocID: null,
        offset: 1,
        textNodes: []
    }
]

// highlight would look inside each of the text blocks and highlight the search for terms or phrase

const sampleDocs = [
    {
        id: 1,
        elementName: "body",
        contents: "This is my textNode's deleted content.\nRabbit is the second paragraph."
    },
    {
        id: 2,
        elementName: "div",
        attr_xmlID: "foo",
        contents: "This is my textNode's deleted content.\nThis is the second paragraph."
    },
    {
        id: 3,
        elementName: "p",
        softNode: "true",
        attr_rend: "bold",
        contents: "This is my textNode's rabbit deleted content."
    },
    {
        id: 4,
        elementName: "pb",
        attr_facs: "pics#101"
    },
    {
        id: 5,
        elementName: "note",
        softNode: "true",
        contents: "This is my note."
    },
    {
        id: 6,
        elementName: "del",
        attr_place: "above",
        contents: "deleted"
    },
    {
        id: 7,
        elementName: "p",
        contents: "This is the second  rabbit paragraph."
    }
]

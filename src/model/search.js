import { Document } from "flexsearch";

let nextRecordID = 1

export function createIndex() {
    return new Document({
        id: "id",
        index: ["content"]
    })
}

export function loadIndex() {
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
    const results = searchIndex.search(query)
    console.log('search performed')
    debugger
}
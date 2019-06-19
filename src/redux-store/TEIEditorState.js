import TEIDocument from "../tei-document/TEIDocument";

var TEIEditorState = {};

TEIEditorState.createBlankDocument = function createBlankDocument( state ) {
    const teiDocument = new TEIDocument()
    return {
        ...state,
        teiDocument 
    }
};

TEIEditorState.setEditorView = function setEditorView( state, editorView ) {
    return {
        ...state,
        editorView 
    }
};

export default TEIEditorState;
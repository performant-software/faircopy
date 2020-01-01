import React, { Component } from 'react';

export default class ProseMirrorComponent extends Component {
  
  focus() {
    const {editorView} = this.props.teiDocument 
    if (editorView) {
      editorView.focus();
    }
  }

  componentWillUnmount() {
    const {editorView} = this.props.teiDocument 
    if (editorView) {
      editorView.destroy();
    }
  }

  shouldComponentUpdate() {
    // Note that EditorView manages its DOM itself so we'd rather not mess
    // with it.
    return false;
  }

  render() {
    // Render just an empty div which is then used as a container for an
    // EditorView instance.
    const { teiDocument, onClick } = this.props
    return <div className='ProseMirrorComponent' ref={ (el) => { teiDocument.createEditorView(onClick,el)} }  />;
  }
}

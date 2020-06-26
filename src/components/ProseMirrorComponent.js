import React, { Component } from 'react';

export default class ProseMirrorComponent extends Component {
  
  focus() {
    const {editorView} = this.props 
    if (editorView) {
      editorView.focus()
    }
  }

  componentWillUnmount() {
    const {editorView, destroyEditorView} = this.props 
    if (editorView) {
      editorView.destroy()
      if( destroyEditorView ) {
        destroyEditorView(editorView)
      } else {
        editorView.destroy()
      }
    }
  }

  shouldComponentUpdate() {
    // Note that EditorView manages its DOM itself so we'd rather not mess
    // with it.
    return false
  }

  render() {
    // Render just an empty div which is then used as a container for an
    // EditorView instance.
    const { createEditorView } = this.props
    return <div className='ProseMirrorComponent' ref={ (el) => { createEditorView(el)} }  />
  }
}

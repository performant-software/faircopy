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
    const { createEditorView, thumbMargin } = this.props
    const className = (thumbMargin) ? 'ProseMirrorComponent thumb-margin' : 'ProseMirrorComponent'
    return <div className={className} ref={ (el) => { createEditorView(el)} }  />
  }
}

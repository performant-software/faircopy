import React, { Component } from 'react'

export default class SeaDragonComponent extends Component {
  
    shouldComponentUpdate() {
      return false;
    }
  
    render() {
      const { initViewer, showSearchBar } = this.props
      const searchFlag = showSearchBar ? 'search-on' : 'search-off' 
      return <div className={`osd-viewer ${searchFlag}`} ref={(el)=> { initViewer(el) }}></div>
    }
  }
  
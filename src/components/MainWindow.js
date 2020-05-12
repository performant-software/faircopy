import React, { Component } from 'react'

import SplitPane from 'react-split-pane'
import { debounce } from "debounce";

import TabbedSidebar from './TabbedSidebar';
import AlertDialog from './AlertDialog';

import TabbedMainView from './TabbedMainView';
const resizeRefreshRate = 100

export default class MainWindow extends Component {

    constructor() {
        super()
        this.state = {
            latest: null,
            width: -300,
            alertDialogMode: false
        }	
    }

    componentDidMount() {
        const { teiDocument } = this.props.fairCopyProject
        window.addEventListener("resize", debounce(teiDocument.refreshView,resizeRefreshRate))
        window.onbeforeunload = this.onBeforeUnload
    }

    onBeforeUnload = (e) => {
        const { teiDocument } = this.props.fairCopyProject
        const { changedSinceLastSave } = teiDocument
        const { exitAnyway } = this.state
    
        if( !exitAnyway && changedSinceLastSave ) {
            this.setState({ ...this.state, alertDialogMode: 'close'})
            e.returnValue = false
        } 
    }

    onStateChange = (nextState) => {
        this.setState({...this.state,latest:nextState})
    }

    render() {
        const { alertDialogMode, width } = this.state
        const { fairCopyProject } = this.props
        const { teiDocument } = fairCopyProject
        const refreshCallback = debounce(teiDocument.refreshView,resizeRefreshRate)

        const onChange = (sidebarWidth) => {
            const boundingRect = this.el? this.el.getBoundingClientRect() : null
            const windowWidth = boundingRect ? boundingRect.width : 0
            this.setState({...this.state, width: windowWidth - sidebarWidth })
            refreshCallback()
        }
        
        return (
            <div ref={(el) => this.el = el} > 
                <SplitPane split="vertical" minSize={0} defaultSize={300} onChange={onChange}>
                    <TabbedSidebar
                        fairCopyProject={fairCopyProject}                                      
                    ></TabbedSidebar>    
                    <TabbedMainView
                        width={width}
                        fairCopyProject={fairCopyProject}
                        onStateChange={this.onStateChange}
                        onSave={this.requestSave}  
                    ></TabbedMainView>
                </SplitPane>
                <AlertDialog
                    alertDialogMode={alertDialogMode}
                ></AlertDialog>
            </div>
        )
    }

}

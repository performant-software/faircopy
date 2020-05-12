import React, { Component } from 'react';
import { Tabs, Tab } from '@material-ui/core'

import TEIEditor from './TEIEditor'


export default class TabbedMainView extends Component {

    constructor() {
        super()
        this.state = {
            currentTab: 0
        }
    }

    a11yProps(index) {
        return {
          id: `mainview-tab-${index}`,
          'aria-controls': `mainview-tabpanel-${index}`,
        };
    }

    renderTabs() {
        const { currentTab } = this.state

        const onChange = (e,nextTab) => { this.setState({...this.state, currentTab: nextTab})}

        return (
            <Tabs value={currentTab} onChange={onChange} aria-label="mainview tabs">
                <Tab label="Doc 1" {...this.a11yProps(0)} />
            </Tabs>
        )
    }

    renderTabPanels() {
        const { width, fairCopyProject, onStateChange, onSave } = this.props
        const { currentTab } = this.state

        return (
            <TabPanel value={currentTab} index={0}>
                <TEIEditor 
                    width={width}
                    fairCopyProject={fairCopyProject}
                    onStateChange={onStateChange}
                    onSave={onSave}  
                ></TEIEditor>
            </TabPanel>
        )
    }

    render() {

        return (
            <div id="TabbedMainView">
                { this.renderTabs() }
                { this.renderTabPanels() }
            </div>
        )
    }

}

function TabPanel(props) {
    const { children, value, index, ...other } = props;
  
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`simple-tabpanel-${index}`}
        aria-labelledby={`simple-tab-${index}`}
        {...other}
      >
        {value === index && children }
      </div>
    );
}

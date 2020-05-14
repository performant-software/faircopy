import React, { Component } from 'react';
import { Tabs, Tab } from '@material-ui/core'
import TableOfContents from './TableOfContents'
import ProjectNavigator from './ProjectNavigator'

export default class TabbedSidebar extends Component {

    constructor() {
        super()
        this.state = {
            currentTab: 0
        }
    }

    tabProps(index) {
        return {
          id: `simple-tab-${index}`,
          'aria-controls': `simple-tabpanel-${index}`,
          disableRipple: true,
          disableFocusRipple: true,
        };
    }

    render() {
        const { fairCopyProject, selectedResource, openResources, onSelectResource } = this.props
        const { currentTab } = this.state

        const onChange = (e,nextTab) => { this.setState({...this.state, currentTab: nextTab})}
        
        return (
            <div id="TabbedSidebar">
                <Tabs value={currentTab} onChange={onChange} aria-label="simple tabs example">
                    <Tab label="Project" {...this.tabProps(0)} />
                    <Tab label="Text" disabled {...this.tabProps(1)} />
                </Tabs>
                <TabPanel value={currentTab} index={0}>
                    <ProjectNavigator
                        fairCopyProject={fairCopyProject}
                        openResources={openResources}
                        selectedResource={selectedResource}
                        onSelectResource={onSelectResource}
                    ></ProjectNavigator>
                </TabPanel>
                <TabPanel value={currentTab} index={1}>
                    <TableOfContents
                        teiDocument={openResources[selectedResource]}        
                    ></TableOfContents>
                </TabPanel>
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

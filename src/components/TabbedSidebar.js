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

    a11yProps(index) {
        return {
          id: `simple-tab-${index}`,
          'aria-controls': `simple-tabpanel-${index}`,
        };
    }

    render() {
        const { fairCopyProject } = this.props
        const { currentTab } = this.state

        const onChange = (e,nextTab) => { this.setState({...this.state, currentTab: nextTab})}

        return (
            <div id="TabbedSidebar">
                <Tabs value={currentTab} onChange={onChange} aria-label="simple tabs example">
                    <Tab label="Project" {...this.a11yProps(0)} />
                    <Tab label="Text" {...this.a11yProps(1)} />
                </Tabs>
                <TabPanel value={currentTab} index={0}>
                    <ProjectNavigator
                        fairCopyProject={fairCopyProject}
                    ></ProjectNavigator>
                </TabPanel>
                <TabPanel value={currentTab} index={1}>
                    <TableOfContents
                        fairCopyProject={fairCopyProject}             
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
